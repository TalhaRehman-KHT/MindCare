// One reusable, table-based email layout (inline CSS only — email clients strip <style> unreliably).
export const BRAND = {
  primary: "#1f7372", // --color-primary-600
  primaryDark: "#173e40", // --color-primary-900
  accent: "#4f52e5", // --color-accent-600
  bg: "#effaf9", // --color-primary-50
  text: "#1f2937",
  muted: "#6b7280",
  border: "#d5f1ee",
};

export const esc = (s = "") =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const supportEmail = () => process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || "";

const wordmark = () =>
  `<span style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:bold;color:${BRAND.primary};letter-spacing:-0.5px;">Mind<span style="color:${BRAND.accent};">Care</span></span>`;

/** Only a clean absolute https URL is used; anything else falls back to the text wordmark (never throws). */
const logoUrl = () => {
  const raw = String(process.env.EMAIL_LOGO_URL || "").trim().replace(/^["']|["']$/g, "");
  try {
    const u = new URL(raw);
    return u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
};

const header = () => {
  const logo = logoUrl();
  return logo
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="padding-right:10px;"><img src="${esc(logo)}" width="44" height="44" alt="MindCare" style="display:block;border:0;outline:none;width:44px;height:44px;border-radius:50%;"></td>
        <td>${wordmark()}</td></tr></table>`
    : wordmark();
};

/** Bulletproof (table) button. */
export const button = (href, label) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr><td bgcolor="${BRAND.primary}" style="border-radius:8px;">
    <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(label)}</a>
  </td></tr>
</table>`;

export const code = (otp) =>
  `<div style="margin:20px 0;padding:16px;background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:10px;text-align:center;font-family:'Courier New',monospace;font-size:32px;font-weight:bold;letter-spacing:8px;color:${BRAND.primaryDark};">${esc(otp)}</div>`;

export const p = (html) => `<p style="margin:0 0 14px;">${html}</p>`;
export const small = (html) => `<p style="margin:14px 0 0;font-size:13px;color:${BRAND.muted};">${html}</p>`;

/**
 * @param {{title:string, preheader:string, body:string, reason?:string}} o
 */
export function layout({ title, preheader, body, reason = "you have a MindCare account." }) {
  const support = supportEmail();
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.bg}" style="background:${BRAND.bg};">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
      <tr><td align="left" style="padding:0 4px 18px;">${header()}</td></tr>
      <tr><td bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${BRAND.border};border-radius:14px;padding:32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.text};">
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${BRAND.primaryDark};">${esc(title)}</h1>
        ${body}
      </td></tr>
      <tr><td align="center" style="padding:20px 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${BRAND.muted};">
        <strong style="color:${BRAND.primary};">MindCare</strong> · Your mental health companion<br>
        ${support ? `Questions? <a href="mailto:${esc(support)}" style="color:${BRAND.primary};">${esc(support)}</a><br>` : ""}
        You received this because ${esc(reason)}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

/** Plain-text counterpart with the same footer. */
export function textLayout(lines) {
  const support = supportEmail();
  return [...lines, "", "—", "MindCare · Your mental health companion", support ? `Support: ${support}` : ""].filter((l) => l !== undefined).join("\n").trim();
}
