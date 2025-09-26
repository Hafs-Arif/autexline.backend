const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

if (!EMAIL_USER || !EMAIL_PASS) {
  // eslint-disable-next-line no-console
  console.warn('EMAIL_USER or EMAIL_PASS not set. Email sending will fail.');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

async function sendMail({ to, subject, html, cc = undefined, bcc = undefined }) {
  const info = await transporter.sendMail({
    from: `Autexline <${EMAIL_USER}>`,
    to,
    cc,
    bcc,
    subject,
    html
  });
  return info;
}

module.exports = { sendMail }; 