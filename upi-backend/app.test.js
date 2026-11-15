const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("./app");

const startTestServer = async (t, env, { db = {}, admin = {} } = {}) => {
  const app = createApp({ db, admin, env });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  return `http://127.0.0.1:${server.address().port}`;
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

test("registrations receive a unique six-digit payment reference persisted with the payment", async (t) => {
  let counterValue = null;
  let generatedId = 0;
  const writes = [];
  const db = {
    collection(name) {
      return {
        doc(id) {
          return { collection: name, id: id || `${name}-${++generatedId}` };
        },
      };
    },
    async runTransaction(callback) {
      const transaction = {
        async get(reference) {
          return {
            exists: reference.collection === "paymentReferenceCounters" && counterValue !== null,
            data: () => ({ value: counterValue }),
          };
        },
        create(reference, data) {
          writes.push({ operation: "create", reference, data });
        },
        set(reference, data) {
          writes.push({ operation: "set", reference, data });
          if (reference.collection === "paymentReferenceCounters") counterValue = data.value;
        },
      };
      return callback(transaction);
    },
  };
  const admin = {
    firestore: { FieldValue: { serverTimestamp: () => "test-timestamp" } },
  };
  const baseUrl = await startTestServer(t, {
    REGISTRATION_FEE: "500",
    UPI_ID: "competition@example",
  }, { db, admin });
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

  assert.equal(firstResponse.status, 201);
  assert.equal(secondResponse.status, 201);
  assert.match(first.paymentReference, /^\d{6}$/);
  assert.match(second.paymentReference, /^\d{6}$/);
  assert.notEqual(first.paymentReference, second.paymentReference);
  assert.equal(first.paymentReference, "100000");
  assert.equal(second.paymentReference, "100001");

  const paymentWrites = writes.filter((write) => write.reference.collection === "upiPayments");
  assert.equal(paymentWrites[0].data.paymentReference, first.paymentReference);
  assert.equal(paymentWrites[0].data.participantDrafts[0].paymentReference, first.paymentReference);
  assert.equal(Object.hasOwn(paymentWrites[0].data.participantDrafts[0], "createdAt"), false);
  assert.equal(paymentWrites[0].data.createdAt, "test-timestamp");
  assert.equal(paymentWrites[1].data.paymentReference, second.paymentReference);
  assert.equal(counterValue, 100001);
});

test("admin payment endpoints reject requests without Firebase credentials", async (t) => {
  const baseUrl = await startTestServer(t, {});
  const response = await fetch(`${baseUrl}/api/admin/payments`);
  assert.equal(response.status, 401);
});

test("payment configuration fails closed when UPI settings are missing", async (t) => {
  const baseUrl = await startTestServer(t, {});
  const response = await fetch(`${baseUrl}/api/payment/config`);
  assert.equal(response.status, 503);
});
