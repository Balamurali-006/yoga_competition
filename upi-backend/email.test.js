const test = require("node:test");
const assert = require("node:assert/strict");
const { sendEmail } = require("./email");

test("Gmail SMTP sends the configured sender, recipients, subject, and body", async () => {
  let transportOptions;
  let sentMessage;
  await sendEmail({
    from: "Ekadhma <ekadhmayogaassociation@gmail.com>",
    to: ["instructor@example.com"],
    subject: "Registration approved",
    text: "Serial number: COMP-2026-001",
  }, {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    user: "ekadhmayogaassociation@gmail.com",
    pass: "test app password",
  }, {
    createTransport: (options) => {
      transportOptions = options;
      return {
        async sendMail(message) {
          sentMessage = message;
        },
      };
    },
  });

  assert.equal(transportOptions.host, "smtp.gmail.com");
  assert.equal(transportOptions.port, 465);
  assert.equal(transportOptions.secure, true);
  assert.deepEqual(transportOptions.auth, {
    user: "ekadhmayogaassociation@gmail.com",
    pass: "testapppassword",
  });
  assert.deepEqual(sentMessage, {
    from: "Ekadhma <ekadhmayogaassociation@gmail.com>",
    to: ["instructor@example.com"],
    subject: "Registration approved",
    text: "Serial number: COMP-2026-001",
  });
});
