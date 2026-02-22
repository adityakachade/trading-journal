const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = `"EdgeIQ" <${process.env.EMAIL_FROM || "noreply@edgeiq.app"}>`;

const emailTemplates = {
  verification: (name, token) => ({
    subject: "Verify your EdgeIQ account",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#080c14;color:#e2e8f0;border-radius:16px">
        <h1 style="color:#00d4aa;font-size:24px;margin-bottom:8px">EdgeIQ 📈</h1>
        <h2 style="font-size:18px;margin-bottom:16px">Welcome, ${name}!</h2>
        <p style="color:#94a3b8;margin-bottom:24px">Please verify your email to activate your account and start journaling your trades.</p>
        <a href="${process.env.CLIENT_URL}/verify-email/${token}" 
           style="display:inline-block;background:#00d4aa;color:#000;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px">
          Verify Email
        </a>
        <p style="color:#64748b;font-size:12px;margin-top:24px">Link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      </div>
    `,
  }),

  passwordReset: (name, token) => ({
    subject: "Reset your EdgeIQ password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#080c14;color:#e2e8f0;border-radius:16px">
        <h1 style="color:#00d4aa;font-size:24px;margin-bottom:8px">EdgeIQ 📈</h1>
        <h2 style="font-size:18px;margin-bottom:16px">Password Reset</h2>
        <p style="color:#94a3b8;margin-bottom:24px">Hi ${name}, click below to reset your password. This link expires in 1 hour.</p>
        <a href="${process.env.CLIENT_URL}/reset-password/${token}"
           style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px">
          Reset Password
        </a>
        <p style="color:#64748b;font-size:12px;margin-top:24px">If you didn't request this, your account is safe — just ignore this email.</p>
      </div>
    `,
  }),

  weeklyReport: (name, stats) => ({
    subject: `Your EdgeIQ Weekly Report — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#080c14;color:#e2e8f0;border-radius:16px">
        <h1 style="color:#00d4aa;font-size:24px;margin-bottom:8px">EdgeIQ Weekly Report 📊</h1>
        <p style="color:#94a3b8;margin-bottom:24px">Hi ${name}, here's your performance summary:</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px">
          ${[
            ["Total PnL", `$${stats.totalPnl?.toFixed(2) || 0}`],
            ["Win Rate", `${stats.winRate?.toFixed(1) || 0}%`],
            ["Total Trades", stats.totalTrades || 0],
            ["Avg R", `${stats.avgRMultiple?.toFixed(2) || 0}R`],
          ].map(([label, value]) => `
            <div style="background:#0d1421;padding:16px;border-radius:10px;border:1px solid rgba(255,255,255,0.06)">
              <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${label}</div>
              <div style="font-size:22px;font-weight:700;color:#00d4aa">${value}</div>
            </div>
          `).join("")}
        </div>
        <a href="${process.env.CLIENT_URL}/ai" 
           style="display:inline-block;background:#00d4aa;color:#000;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none">
          View Full AI Report →
        </a>
      </div>
    `,
  }),
};

const sendEmail = async (to, template) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    logger.warn(`Email not configured. Would send to ${to}: ${template.subject}`);
    return;
  }
  await transporter.sendMail({ from: FROM, to, ...template });
  logger.info(`Email sent to ${to}: ${template.subject}`);
};

exports.sendVerificationEmail = (to, name, token) =>
  sendEmail(to, emailTemplates.verification(name, token));

exports.sendPasswordResetEmail = (to, name, token) =>
  sendEmail(to, emailTemplates.passwordReset(name, token));

exports.sendWeeklyReportEmail = (to, name, stats) =>
  sendEmail(to, emailTemplates.weeklyReport(name, stats));
