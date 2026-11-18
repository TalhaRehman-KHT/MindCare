// Every template returns {subject, html, text}.
import { layout, textLayout, button, code, p, small, esc } from "./layout.js";
import { formatForEmail } from "../services/scheduling.js";

export const PATIENT_APP_URL = () => (process.env.PATIENT_APP_URL || "http://localhost:5173").replace(/\/$/, "");
export const ADMIN_PANEL_URL = () => (process.env.ADMIN_PANEL_URL || "http://localhost:5174").replace(/\/$/, "");
export const verifyLink = (token, type) => `${PATIENT_APP_URL()}/verify-email?token=${encodeURIComponent(token)}&type=${type}`;

const hi = (name) => (name ? `Hi ${esc(name)},` : "Hi,");
const hiText = (name) => (name ? `Hi ${name},` : "Hi,");

function verifyTemplate({ name, otp, url, minutes, who }) {
  const subject = who === "doctor" ? "Verify your MindCare doctor account" : "Verify your MindCare account";
  return {
    subject,
    html: layout({
      title: "Verify your email",
      preheader: `Your MindCare code is ${otp}. It expires in ${minutes} minutes.`,
      reason: "someone signed up for MindCare with this email address. If it wasn't you, you can ignore this email.",
      body:
        p(hi(name)) +
        p(`Enter this code to verify your ${who === "doctor" ? "MindCare doctor" : "MindCare"} account:`) +
        code(otp) +
        p("Or verify with one click:") +
        button(url, "Verify email") +
        small(`The code and link expire in ${minutes} minutes and can be used once. If you didn't sign up, ignore this email.`),
    }),
    text: textLayout([
      hiText(name),
      "",
      `Your MindCare verification code: ${otp}`,
      "",
      `Or verify by opening this link: ${url}`,
      "",
      `The code and link expire in ${minutes} minutes and can be used once. If you didn't sign up, ignore this email.`,
    ]),
  };
}

export const verifyAccount = ({ name, otp, url, minutes = 30 }) => verifyTemplate({ name, otp, url, minutes, who: "patient" });
export const verifyDoctor = ({ name, otp, url, minutes = 30 }) => verifyTemplate({ name, otp, url, minutes, who: "doctor" });

export const doctorApplicationReceived = ({ name, updated = false }) => ({
  subject: updated ? "We received your updated MindCare application" : "We received your MindCare application",
  html: layout({
    title: "Application received",
    preheader: "Our team is reviewing your details and PMDC license.",
    reason: "you applied to join MindCare as a doctor.",
    body:
      p(hi(name)) +
      p(`Thanks for applying to join MindCare. Our team will review your details and PMDC license, and you'll get an email once a decision is made.`),
  }),
  text: textLayout([hiText(name), "", "Thanks for applying to join MindCare. Our team will review your details and PMDC license, and you'll get an email once a decision is made."]),
});

export const doctorApproved = ({ name }) => {
  const url = `${ADMIN_PANEL_URL()}/doctor/login`;
  return {
    subject: "Your MindCare doctor account is approved",
    html: layout({
      title: "You're approved!",
      preheader: "Patients can now find and book you on MindCare.",
      reason: "you applied to join MindCare as a doctor.",
      body: p(hi(name)) + p("Your MindCare doctor account has been approved. Patients can now find and book you.") + button(url, "Open the Doctor Panel"),
    }),
    text: textLayout([hiText(name), "", "Your MindCare doctor account has been approved. Patients can now find and book you.", "", `Open the Doctor Panel: ${url}`]),
  };
};

export const doctorRejected = ({ name, reason }) => {
  const url = `${PATIENT_APP_URL()}/login?role=doctor`;
  return {
    subject: "Update on your MindCare application",
    html: layout({
      title: "Update on your application",
      preheader: "Your application needs changes before it can be approved.",
      reason: "you applied to join MindCare as a doctor.",
      body:
        p(hi(name)) +
        p("Unfortunately your application was not approved.") +
        (reason ? p(`<strong>Reason:</strong> ${esc(reason)}`) : "") +
        p("You can sign in with your email and password, edit your details and reapply.") +
        button(url, "Edit & reapply"),
    }),
    text: textLayout([
      hiText(name),
      "",
      "Unfortunately your application was not approved.",
      reason ? `Reason: ${reason}` : "",
      "You can sign in with your email and password, edit your details and reapply.",
      "",
      `Edit & reapply: ${url}`,
    ]),
  };
};

export const doctorRemoved = ({ name, reason }) => ({
  subject: "Your MindCare account is no longer active",
  html: layout({
    title: "Your account is no longer active",
    preheader: "Your MindCare doctor account has been deactivated.",
    reason: "you have a MindCare doctor account.",
    body:
      p(hi(name)) +
      p(`Your doctor account has been deactivated by the hospital administration.${reason ? ` Reason: ${esc(reason)}` : ""}`) +
      p("Upcoming appointments have been cancelled and patients notified."),
  }),
  text: textLayout([
    hiText(name),
    "",
    `Your doctor account has been deactivated by the hospital administration.${reason ? ` Reason: ${reason}` : ""}`,
    "Upcoming appointments have been cancelled and patients notified.",
  ]),
});

export const passwordReset = ({ name, url, minutes = 10, doctor = false }) => ({
  subject: "Reset your MindCare password",
  html: layout({
    title: "Reset your password",
    preheader: `Reset link valid for ${minutes} minutes.`,
    reason: "a password reset was requested for this email address.",
    body:
      p(hi(name)) +
      p(`You requested a password reset for your MindCare${doctor ? " doctor" : ""} account. The link is valid for ${minutes} minutes.`) +
      button(url, "Reset password") +
      small("If you didn't request this, you can safely ignore this email — your password won't change."),
  }),
  text: textLayout([
    hiText(name),
    "",
    `You requested a password reset for your MindCare${doctor ? " doctor" : ""} account. The link is valid for ${minutes} minutes.`,
    "",
    `Reset password: ${url}`,
    "",
    "If you didn't request this, ignore this email.",
  ]),
});

/** forDoctor=false → patient confirmation; true → doctor's "new appointment" notice. */
export const appointmentBooked = ({ appointment: a, forDoctor = false }) => {
  const when = formatForEmail(a.startAt);
  if (forDoctor) {
    const url = `${ADMIN_PANEL_URL()}/doctor-appointments`;
    return {
      subject: "New MindCare appointment",
      html: layout({
        title: "New appointment",
        preheader: `${a.userData?.name || "A patient"} booked ${when}.`,
        reason: "you are a doctor on MindCare.",
        body: p(`<strong>${esc(a.userData?.name)}</strong> booked an appointment with you for <strong>${esc(when)}</strong>.`) + button(url, "Open the Doctor Panel"),
      }),
      text: textLayout([`${a.userData?.name} booked an appointment with you for ${when}.`, "", `Open the Doctor Panel: ${url}`]),
    };
  }
  const url = `${PATIENT_APP_URL()}/my-appointments`;
  return {
    subject: "Your MindCare appointment is confirmed",
    html: layout({
      title: "Appointment confirmed",
      preheader: `With ${a.docData?.name} on ${when}.`,
      reason: "you booked an appointment on MindCare.",
      body:
        p(`Your appointment with <strong>${esc(a.docData?.name)}</strong> (${esc(a.docData?.speciality)}) is booked for <strong>${esc(when)}</strong>.`) +
        p(`Fee: ${esc(a.amount)} rs`) +
        button(url, "View my appointments"),
    }),
    text: textLayout([`Your appointment with ${a.docData?.name} (${a.docData?.speciality}) is booked for ${when}.`, `Fee: ${a.amount} rs`, "", `View my appointments: ${url}`]),
  };
};

export const appointmentCancelled = ({ appointment: a, by, otherName }) => {
  const when = formatForEmail(a.startAt);
  const line = `The appointment ${otherName ? `with ${otherName} ` : ""}on ${when} was cancelled by the ${by}.`;
  return {
    subject: "Your MindCare appointment was cancelled",
    html: layout({
      title: "Appointment cancelled",
      preheader: line,
      reason: "you had an appointment on MindCare.",
      body:
        p(`The appointment ${otherName ? `with <strong>${esc(otherName)}</strong> ` : ""}on <strong>${esc(when)}</strong> was cancelled by the ${esc(by)}.`) +
        (a.cancelReason ? p(`Reason: ${esc(a.cancelReason)}`) : ""),
    }),
    text: textLayout([line, a.cancelReason ? `Reason: ${a.cancelReason}` : ""]),
  };
};
