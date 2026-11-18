const BREVO_EMAILS_URL = "https://api.brevo.com/v3/smtp/email";

const sendEmail = async (
  { from, fromName, replyTo, to, subject, text },
  { apiKey },
  { fetchImpl = globalThis.fetch } = {}
) => {
  if (!apiKey) throw new Error("Brevo API key is not configured.");
  if (!from) throw new Error("A verified Brevo sender email is not configured.");
  if (typeof fetchImpl !== "function") throw new Error("The runtime does not provide fetch.");

  const response = await fetchImpl(BREVO_EMAILS_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: from, name: fromName },
      to: (Array.isArray(to) ? to : [to]).map((email) => ({ email })),
      subject,
      textContent: text,
      ...(replyTo ? { replyTo: { email: replyTo } } : {}),
    }),
  });
  const result = await response.json();

  if (!response.ok) {
    const detail = result.message || result.code || `HTTP ${response.status}`;
    throw new Error(`Brevo email request failed: ${detail}`);
  }
};

module.exports = { sendEmail };
