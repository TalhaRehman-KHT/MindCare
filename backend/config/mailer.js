import nodemailer from "nodemailer";

// Empty / whitespace-only env values count as unset.
const env = (k) => {
  const v = process.env[k];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
};
const bool = (v) => (v === undefined ? undefined : /^(1|true|yes)$/i.test(v));
const looksLikeHost = (h) => !!h && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(h) && !/(^|\.)example\.(com|org|net)$/i.test(h);

/**
 * Transport priority:
 *   1. SMTP_HOST (a real host)  → generic SMTP with SMTP_USER/SMTP_PASS (falls back to EMAIL_USER/EMAIL_PASS)
 *   2. MAIL_SERVICE              → that nodemailer service with EMAIL_USER/EMAIL_PASS
 *   3. default                   → service "gmail" with EMAIL_USER/EMAIL_PASS
 */
export function resolveTransport() {
  const host = env("SMTP_HOST");
  if (host && looksLikeHost(host)) {
    const port = Number.parseInt(env("SMTP_PORT") || "587", 10) || 587;
    const secure = bool(env("SMTP_SECURE")) ?? port === 465;
    const user = env("SMTP_USER") || env("EMAIL_USER");
    const pass = env("SMTP_PASS") || env("EMAIL_PASS");
    return { mode: "smtp", host, port, secure, user, options: { host, port, secure, auth: { user, pass } } };
  }
  if (host) console.warn(`[mail] SMTP_HOST "${host}" doesn't look like a real host; ignoring it`);
  const service = (env("MAIL_SERVICE") || "gmail").toLowerCase();
  const user = env("EMAIL_USER");
  return { mode: service, service, user, options: { service, auth: { user, pass: env("EMAIL_PASS") } } };
}

const resolved = resolveTransport();
const transporter = nodemailer.createTransport(resolved.options);

const domainOf = (a) => (a ? `***@${String(a).split("@")[1] || "?"}` : "(unset)");
/** Safe one-line description (no secrets). */
export const describeTransport = () =>
  resolved.mode === "smtp"
    ? `smtp host=${resolved.host} port=${resolved.port} secure=${resolved.secure} user=${domainOf(resolved.user)}`
    : `service=${resolved.service} user=${domainOf(resolved.user)}`;

let warnedFrom = false;
/** `"MindCare" <address>`. Gmail only sends as the authenticated account, so it's forced there. */
export const mailFrom = () => {
  const name = (env("MAIL_FROM_NAME") || "MindCare").replace(/^"|"$/g, "").replace(/"/g, "");
  let address = env("MAIL_FROM_ADDRESS") || resolved.user;
  if (resolved.mode === "gmail" && address && resolved.user && address.toLowerCase() !== resolved.user.toLowerCase()) {
    if (!warnedFrom) console.warn("[mail] MAIL_FROM_ADDRESS differs from the Gmail account; using EMAIL_USER instead");
    warnedFrom = true;
    address = resolved.user;
  }
  return `"${name}" <${address}>`;
};

export const verifyMailer = async () => {
  try {
    await transporter.verify();
    console.log(`SMTP READY (${describeTransport()})`);
  } catch (err) {
    console.error(`SMTP ERROR (${describeTransport()}): ${err.code || ""} ${err.responseCode || ""} ${err.message}`);
  }
};

export default transporter;
