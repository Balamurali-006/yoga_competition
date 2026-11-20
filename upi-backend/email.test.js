const test = require("node:test");
const assert = require("node:assert/strict");
const { sendEmail } = require("./email");

test("sends the configured message through the Brevo API", async () => {
  let requestUrl;
  let requestOptions;
  await sendEmail({
    from: "ekadhmayogaassociation@gmail.com",
    fromName: "Ekadhma Yoga Association",
    replyTo: "ekadhmayogaassociation@gmail.com",
    to: ["instructor@example.com"],
    subject: "Registration approved",
    text: "Serial number: COMP-2026-001",
  }, {
    apiKey: "test-brevo-api-key",
  }, {
    fetchImpl: async (url, options) => {
      requestUrl = url;
      requestOptions = options;
      return {
        ok: true,
        status: 201,
        async json() {
          return { messageId: "email-test-id" };
        },
      };
    },
  });

  assert.equal(requestUrl, "https://api.brevo.com/v3/smtp/email");
  assert.equal(requestOptions.method, "POST");
  assert.deepEqual(requestOptions.headers, {
    "api-key": "test-brevo-api-key",
    "Content-Type": "application/json",
    Accept: "application/json",
  });
  assert.deepEqual(JSON.parse(requestOptions.body), {
    sender: {
      email: "ekadhmayogaassociation@gmail.com",
      name: "Ekadhma Yoga Association",
    },
    to: [{ email: "instructor@example.com" }],
    subject: "Registration approved",
    textContent: "Serial number: COMP-2026-001",
    replyTo: { email: "ekadhmayogaassociation@gmail.com" },
  });
});

test("reports Brevo API errors", async () => {
  await assert.rejects(
    sendEmail({
      from: "ekadhmayogaassociation@gmail.com",
      to: ["instructor@example.com"],
      subject: "Registration approved",
      text: "Serial number: COMP-2026-001",
    }, {
      apiKey: "test-brevo-api-key",
    }, {
      fetchImpl: async () => ({
        ok: false,
        status: 400,
        async json() {
          return { message: "Sender is not verified" };
        },
      }),
    }),
    /Brevo email request failed: Sender is not verified/
  );
});
