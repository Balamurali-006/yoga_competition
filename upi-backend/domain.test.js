const test = require("node:test");
const assert = require("node:assert/strict");
const {
  amountToPaise,
  createCheckInToken,
  isValidUtr,
  normalizeUtr,
  readCheckInToken,
} = require("./domain");

test("normalizes and validates transaction references", () => {
  assert.equal(normalizeUtr(" abcd 1234 5678 "), "ABCD12345678");
  assert.equal(isValidUtr("ABCD12345678"), true);
  assert.equal(isValidUtr("short"), false);
  assert.equal(isValidUtr("BAD UTR 123"), false);
  assert.equal(isValidUtr("----------"), false);
});

test("converts valid INR amounts to paise and rejects invalid precision", () => {
  assert.equal(amountToPaise("500.00"), 50000);
  assert.equal(amountToPaise("0.50"), 50);
  assert.equal(amountToPaise("500.001"), null);
  assert.equal(amountToPaise("0"), null);
});

test("check-in tokens are signed and reject modification", () => {
  const secret = "test-secret-with-enough-entropy";
  const token = createCheckInToken("registration-1", "COMP-2026-001", secret);
  assert.deepEqual(readCheckInToken(token, secret), {
    registrationId: "registration-1",
    serialNumber: "COMP-2026-001",
    version: 1,
  });
  assert.equal(readCheckInToken(`${token}x`, secret), null);
  assert.equal(readCheckInToken(token, "different-secret"), null);
});
