const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("./app");
const { hashToken } = require("./domain");

const startTestServer = async (t, env, {
  db = {},
  admin = {},
  sendEmail,
  generatePaymentReference,
} = {}) => {
  const app = createApp({ db, admin, env, sendEmail, generatePaymentReference });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  return `http://127.0.0.1:${server.address().port}`;
};

const createMockFirestore = (initialData = {}) => {
  const data = new Map(
    Object.entries(initialData).map(([collection, documents]) => [
      collection,
      new Map(Object.entries(documents)),
    ])
  );
  let generatedId = 0;
  const getCollection = (name) => {
    if (!data.has(name)) data.set(name, new Map());
    return data.get(name);
  };
  const getSnapshot = (reference) => {
    const document = getCollection(reference.collection).get(reference.id);
    return {
      exists: Boolean(document),
      id: reference.id,
      ref: reference,
      data: () => document,
    };
  };
  const db = {
    collection(name) {
      return {
        doc(id) {
          return { collection: name, id: id || `${name}-${++generatedId}` };
        },
      };
    },
    async runTransaction(callback) {
      const writes = [];
      const transaction = {
        async get(reference) {
          return getSnapshot(reference);
        },
        async getAll(...references) {
          return references.map(getSnapshot);
        },
        create(reference, value) {
          writes.push(() => getCollection(reference.collection).set(reference.id, value));
        },
        update(reference, value) {
          writes.push(() => getCollection(reference.collection).set(reference.id, {
            ...getCollection(reference.collection).get(reference.id),
            ...value,
          }));
        },
        set(reference, value) {
          writes.push(() => getCollection(reference.collection).set(reference.id, value));
        },
      };
      const result = await callback(transaction);
      writes.forEach((write) => write());
      return result;
    },
  };
  db.collection = (name) => ({
    doc(id) {
      const reference = { collection: name, id: id || `${name}-${++generatedId}` };
      return {
        ...reference,
        async get() {
          return getSnapshot(reference);
        },
        async set(value) {
          getCollection(name).set(reference.id, value);
        },
        async update(value) {
          getCollection(name).set(reference.id, {
            ...getCollection(name).get(reference.id),
            ...value,
          });
        },
      };
    },
    async get() {
      const docs = Array.from(getCollection(name).keys())
        .map((id) => getSnapshot({ collection: name, id }));
      return { docs, size: docs.length, empty: docs.length === 0 };
    },
    where(field, operator, value) {
      return {
        limit(maximum) {
          return {
            async get() {
              const matches = Array.from(getCollection(name).entries())
                .filter(([, document]) => operator !== "==" || document[field] === value)
                .slice(0, maximum)
                .map(([id]) => getSnapshot({ collection: name, id }));
              return { docs: matches, empty: matches.length === 0, size: matches.length };
            },
          };
        },
      };
    },
  });
  return { db, data };
};

const mockAdmin = {
  auth: () => ({
    verifyIdToken: async () => ({ uid: "admin-1", email: "admin@example.com" }),
  }),
  firestore: {
    FieldValue: { serverTimestamp: () => "test-timestamp" },
  },
};

test("public payment configuration uses server environment values", async (t) => {
  const baseUrl = await startTestServer(t, {
    REGISTRATION_FEE: "725.50",
    UPI_ID: "competition@example",
    UPI_PAYEE_NAME: "Competition",
  });

  const response = await fetch(`${baseUrl}/api/payment/config`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    upiId: "competition@example",
    payeeName: "Competition",
    qrCodeUrl: null,
    feePaise: 72550,
    currency: "INR",
  });
});

test("registration rejects invalid participant input before writing", async (t) => {
  const baseUrl = await startTestServer(t, {
    REGISTRATION_FEE: "500",
    UPI_ID: "competition@example",
  });

  const response = await fetch(`${baseUrl}/api/registrations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "" }),
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Participant details/);
});

test("registrations get random six-digit references with collision protection", async (t) => {
  const candidates = [583104, 583104, 472951, 100000, 839257];
  const { db, data } = createMockFirestore({
    upiPayments: { "legacy-payment": { paymentReference: "100000" } },
  });
  const baseUrl = await startTestServer(t, {
    REGISTRATION_FEE: "500",
    UPI_ID: "competition@example",
  }, {
    db,
    admin: mockAdmin,
    generatePaymentReference: () => candidates.shift(),
  });
  const participant = {
    name: "Test Student",
    age: 12,
    class: "6th",
    institution: "Test School",
    instructor: "Test Coach",
    instructorPhone: "9876543210",
    email: "coach@example.com",
    event: "district",
    category: "group",
    level: "district",
  };

  const createRegistration = () => fetch(`${baseUrl}/api/registrations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(participant),
  });
  const firstResponse = await createRegistration();
  const first = await firstResponse.json();
  const secondResponse = await createRegistration();
  const second = await secondResponse.json();
  const thirdResponse = await createRegistration();
  const third = await thirdResponse.json();

  assert.equal(firstResponse.status, 201);
  assert.equal(secondResponse.status, 201);
  assert.equal(thirdResponse.status, 201);
  assert.deepEqual(
    [first.paymentReference, second.paymentReference, third.paymentReference],
    ["583104", "472951", "839257"]
  );
  assert.ok([first.paymentReference, second.paymentReference, third.paymentReference]
    .every((reference) => /^\d{6}$/.test(reference)));
  assert.equal(new Set([first.paymentReference, second.paymentReference, third.paymentReference]).size, 3);

  const paymentRecords = Array.from(data.get("upiPayments").values())
    .filter((payment) => payment.paymentReference !== "100000");
  assert.equal(paymentRecords.length, 3);
  assert.equal(paymentRecords[0].participantDrafts[0].paymentReference, first.paymentReference);
  assert.equal(Object.hasOwn(paymentRecords[0].participantDrafts[0], "createdAt"), false);
  assert.equal(paymentRecords[0].createdAt, "test-timestamp");
  assert.deepEqual(Array.from(data.get("paymentReferenceClaims").keys()).sort(), [
    "472951",
    "583104",
    "839257",
  ]);
});

test("admin payment endpoints reject requests without Firebase credentials", async (t) => {
  const baseUrl = await startTestServer(t, {});
  const response = await fetch(`${baseUrl}/api/admin/payments`);
  assert.equal(response.status, 401);
});

test("participant search is restricted to staff and returns matching participant fields", async (t) => {
  const { db } = createMockFirestore({
    users: { "committee-1": { role: "committee" }, "other-1": { role: "participant" } },
    participants: {
      "participant-1": {
        name: "Yoga Student",
        email: "student@example.com",
        instructorPhone: "9876543210",
        institution: "Yoga School",
        serialNumber: "2026-DT-1234",
        paymentStatus: "VERIFIED",
      },
      "participant-2": { name: "Another Student" },
    },
  });
  const baseUrl = await startTestServer(t, {}, {
    db,
    admin: {
      ...mockAdmin,
      auth: () => ({
        verifyIdToken: async (token) => ({ uid: token }),
      }),
    },
  });

  const unauthorized = await fetch(`${baseUrl}/api/participants/search?q=yoga`);
  assert.equal(unauthorized.status, 401);

  const forbidden = await fetch(`${baseUrl}/api/participants/search?q=yoga`, {
    headers: { Authorization: "Bearer other-1" },
  });
  assert.equal(forbidden.status, 403);

  const response = await fetch(`${baseUrl}/api/participants/search?q=YOGA`, {
    headers: { Authorization: "Bearer committee-1" },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    participants: [{
      id: "participant-1",
      name: "Yoga Student",
      email: "student@example.com",
      institution: "Yoga School",
      instructorPhone: "9876543210",
      serialNumber: "2026-DT-1234",
      event: null,
      category: null,
      level: null,
      paymentStatus: "VERIFIED",
      verificationStatus: null,
    }],
  });
});

test("admin user creation validates input and writes both Firebase records", async (t) => {
  const { db, data } = createMockFirestore({
    users: {
      "admin-1": { role: "admin" },
      "committee-1": { role: "committee" },
    },
  });
  let createdUserInput;
  const admin = {
    ...mockAdmin,
    auth: () => ({
      verifyIdToken: async (token) => ({ uid: token, email: `${token}@example.com` }),
      createUser: async (input) => {
        createdUserInput = input;
        return { uid: "new-user-1", email: input.email };
      },
      deleteUser: async () => {},
    }),
  };
  const baseUrl = await startTestServer(t, {}, { db, admin });

  const invalidResponse = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: { Authorization: "Bearer admin-1", "Content-Type": "application/json" },
    body: JSON.stringify({ email: "bad-email", password: "short", role: "owner" }),
  });
  assert.equal(invalidResponse.status, 400);
  assert.equal(createdUserInput, undefined);

  const validUserInput = {
    email: "NEW-USER@example.com",
    password: "temporary-password",
    name: "New User",
    role: "committee",
  };
  const forbiddenResponse = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: { Authorization: "Bearer committee-1", "Content-Type": "application/json" },
    body: JSON.stringify(validUserInput),
  });
  assert.equal(forbiddenResponse.status, 403);
  assert.equal(createdUserInput, undefined);

  const response = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: { Authorization: "Bearer admin-1", "Content-Type": "application/json" },
    body: JSON.stringify(validUserInput),
  });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    uid: "new-user-1",
    email: "new-user@example.com",
    name: "New User",
    role: "committee",
  });
  assert.deepEqual(createdUserInput, {
    email: "new-user@example.com",
    password: "temporary-password",
    displayName: "New User",
  });
  assert.equal(data.get("users").get("new-user-1").role, "committee");
  assert.equal(data.get("users").get("new-user-1").createdAt, "test-timestamp");
});

test("payment configuration fails closed when UPI settings are missing", async (t) => {
  const baseUrl = await startTestServer(t, {});
  const response = await fetch(`${baseUrl}/api/payment/config`);
  assert.equal(response.status, 503);
});

test("payment submissions email only the admin and same-UTR retry resends a failed notification", async (t) => {
  const accessToken = "participant-access-token";
  const payment = {
    accessTokenHash: hashToken(accessToken),
    expectedAmountPaise: 50000,
    paymentReference: "100023",
    registrationId: "participant-1",
    participantIds: ["participant-1"],
    participantSummary: [{
      registrationId: "participant-1",
      name: "Test Student",
      institution: "Test School",
      email: "coach@example.com",
    }],
    paymentStatus: "PENDING",
    utr: null,
  };
  const { db, data } = createMockFirestore({ upiPayments: { "payment-1": payment } });
  let shouldFail = true;
  const emailMessages = [];
  const baseUrl = await startTestServer(t, {
    BREVO_API_KEY: "test-brevo-api-key",
    EMAIL_FROM: "notifications@example.com",
    ADMIN_NOTIFICATION_EMAIL: "ekadhmayogaassociation@gmail.com",
  }, {
    db,
    admin: mockAdmin,
    sendEmail: async (message) => {
      emailMessages.push(message);
      if (shouldFail) throw new Error("Provider unavailable");
    },
  });

  const submit = () => {
    const body = new FormData();
    body.set("utr", "ABCD12345678");
    body.set("amount", "500");
    body.set("paymentDateTime", "2026-11-16T08:00");
    return fetch(`${baseUrl}/api/registrations/payment-1/payment-submissions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    });
  };

  const failedResponse = await submit();
  assert.equal(failedResponse.status, 502);
  assert.equal((await failedResponse.json()).error, "Payment details were saved, but the admin notification could not be sent.");
  assert.equal(data.get("upiPayments").get("payment-1").paymentStatus, "SUBMITTED");

  shouldFail = false;
  const retryResponse = await submit();
  assert.equal(retryResponse.status, 201);
  assert.equal(emailMessages.length, 2);
  assert.equal(emailMessages[0].to, "ekadhmayogaassociation@gmail.com");
  assert.match(emailMessages[0].text, /ABCD12345678/);
  assert.equal(data.get("upiPayments").get("payment-1").adminNotificationSentAt, "test-timestamp");
});

test("admin approval emails assigned serial numbers to the registration contact", async (t) => {
  const payment = {
    paymentStatus: "SUBMITTED",
    paymentReference: "100024",
    participantIds: ["participant-2"],
    participantDrafts: [{
      registrationId: "participant-2",
      name: "Another Student",
      institution: "Example School",
      email: "instructor@example.com",
    }],
    participantSummary: [{
      registrationId: "participant-2",
      name: "Another Student",
      institution: "Example School",
      email: "instructor@example.com",
    }],
    expectedAmountPaise: 50000,
    amountPaise: 50000,
    utr: "ZXCV12345678",
  };
  const claimId = require("node:crypto").createHash("sha256").update(payment.utr).digest("hex");
  const { db, data } = createMockFirestore({
    users: { "admin-1": { role: "admin" } },
    upiPayments: { "payment-2": payment },
    upiUtrClaims: {
      [claimId]: { paymentGroupId: "payment-2", claimStatus: "SUBMITTED" },
    },
  });
  const emailMessages = [];
  let shouldFail = true;
  const baseUrl = await startTestServer(t, {
    BREVO_API_KEY: "test-brevo-api-key",
    EMAIL_FROM: "notifications@example.com",
    CHECKIN_TOKEN_SECRET: "test-checkin-secret",
  }, {
    db,
    admin: mockAdmin,
    sendEmail: async (message) => {
      emailMessages.push(message);
      if (shouldFail) throw new Error("Provider unavailable");
    },
  });
  const approve = () => fetch(`${baseUrl}/api/admin/payments/payment-2`, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer firebase-admin-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "VERIFIED", bankRecordConfirmed: true }),
  });

  const failedResponse = await approve();
  assert.equal(failedResponse.status, 502);
  assert.equal(data.get("upiPayments").get("payment-2").paymentStatus, "VERIFIED");
  shouldFail = false;
  const response = await approve();
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.approvalEmailSent, true);
  assert.equal(emailMessages.length, 2);
  assert.deepEqual(emailMessages[1].to, ["instructor@example.com"]);
  assert.match(emailMessages[1].text, /Another Student: (\d{4}-DT-001|COMP-\d{4}-001)/);
  assert.equal(data.get("upiPayments").get("payment-2").approvalEmailSentAt, "test-timestamp");
});

test("admin can retry a missing notification for an already-submitted payment", async (t) => {
  const payment = {
    paymentStatus: "SUBMITTED",
    paymentReference: "100025",
    amountPaise: 50000,
    utr: "RETRY123456",
    paymentDateTime: "2026-11-16T08:00:00.000Z",
    participantSummary: [{
      registrationId: "participant-3",
      name: "Retry Student",
      institution: "Retry School",
      email: "coach@example.com",
    }],
  };
  const { db, data } = createMockFirestore({
    users: { "admin-1": { role: "admin" } },
    upiPayments: { "payment-3": payment },
  });
  const emailMessages = [];
  const baseUrl = await startTestServer(t, {
    BREVO_API_KEY: "test-brevo-api-key",
    EMAIL_FROM: "notifications@example.com",
    ADMIN_NOTIFICATION_EMAIL: "ekadhmayogaassociation@gmail.com",
  }, {
    db,
    admin: mockAdmin,
    sendEmail: async (message) => emailMessages.push(message),
  });

  const response = await fetch(`${baseUrl}/api/admin/payments/payment-3/retry-submission-notification`, {
    method: "POST",
    headers: { Authorization: "Bearer firebase-admin-token" },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { notificationSent: true, alreadySent: false });
  assert.equal(emailMessages.length, 1);
  assert.equal(emailMessages[0].to, "ekadhmayogaassociation@gmail.com");
  assert.match(emailMessages[0].text, /RETRY123456/);
  assert.equal(data.get("upiPayments").get("payment-3").adminNotificationSentAt, "test-timestamp");
});
