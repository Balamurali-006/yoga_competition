const nodemailer = require("nodemailer");

const sendEmail = async (
  { from, to, subject, text },
  { host, port, secure, user, pass },
  { createTransport = (options) => nodemailer.createTransport(options) } = {}
) => {
  if (!user || !pass) throw new Error("Gmail SMTP credentials are not configured.");

  const transporter = createTransport({
    host: host || "smtp.gmail.com",
    port: Number(port) || 465,
    secure: secure !== false,
    auth: { user, pass: pass.replace(/\s+/g, "") },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });

  await transporter.sendMail({ from, to, subject, text });
};

module.exports = { sendEmail };
