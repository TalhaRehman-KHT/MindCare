// Transactional email. All messages come from emails/templates.js as {subject, html, text}.
import transporter, { mailFrom } from "../config/mailer.js";
import * as templateFns from "../emails/templates.js";

export { PATIENT_APP_URL, ADMIN_PANEL_URL } from "../emails/templates.js";
export const templates = templateFns;

export const MAIL_FAILED_MESSAGE = "We couldn't send the verification email. Please try Resend.";

// Addresses on the reserved .test TLD are never delivered (used by automated tests).
const isTestAddress = (to) => /\.test$/i.test(String(to || "").trim());
const mask = (to) => String(to || "").replace(/^[^@]*/, "***");

/**
 * The one send helper.
 * @param {{to:string, template:string|{subject,html,text}, data?:object, critical?:boolean}} o
 *   template: a name exported by emails/templates.js (rendered with `data`) or an already-rendered email.
 * @returns {Promise<{ok:boolean, info?:object, error?:string, skipped?:boolean}>} never throws.
 */
export async function sendEmail({ to, template, data = {}, critical = false }) {
  const name = typeof template === "string" ? template : template?.subject || "email";
  let email;
  try {
    email = typeof template === "string" ? templateFns[template](data) : template;
    if (!email?.subject || !email?.html) throw new Error("template returned no subject/html");
    if (!email.text) email.text = email.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  } catch (err) {
    console.error(`[mail] template "${name}" failed: ${err.message}`);
    return { ok: false, error: `template: ${err.message}` };
  }
  if (!to) {
    console.error(`[mail] "${email.subject}" not sent: no recipient`);
    return { ok: false, error: "no recipient" };
  }
  if (isTestAddress(to)) {
    console.log(`[mail] skipped (test address): ${email.subject}`);
    return { ok: true, skipped: true };
  }
  const msg = { from: mailFrom(), to, subject: email.subject, html: email.html, text: email.text };
  if (process.env.SUPPORT_EMAIL?.trim()) msg.replyTo = process.env.SUPPORT_EMAIL.trim();
  try {
    const info = await transporter.sendMail(msg);
    console.log(`[mail] sent "${email.subject}" to ${mask(to)} id=${info.messageId} ${critical ? "(critical)" : ""}`.trim());
    return { ok: true, info };
  } catch (err) {
    console.error(`[mail] FAILED "${email.subject}" to ${mask(to)}: ${err.code || ""} ${err.responseCode || ""} ${err.response || err.message}`);
    return { ok: false, error: err.code || err.message };
  }
}

/** Non-critical, fire-and-forget (bookings, approvals…): logged, never blocks or throws. */
export function sendMail(to, email) {
  if (!to || !email) return;
  sendEmail({ to, template: email }).catch(() => {});
}

/** Critical (OTP, verify link, reset): awaited; throws MailError so callers can return 502. */
export class MailError extends Error {}
export async function sendMailNow(to, email) {
  const r = await sendEmail({ to, template: email, critical: true });
  if (!r.ok) throw new MailError(MAIL_FAILED_MESSAGE);
  return r;
}
