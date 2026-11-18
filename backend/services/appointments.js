// Appointment state changes shared by patient, doctor and admin controllers.
import appointmentModel from "../models/appointmentModel.js";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import { sendMail, templates } from "./notify.js";
import { ageFromDob, slotLabel, zoned, USER_CANCEL_MIN_HOURS } from "./scheduling.js";

export const PATIENT_FIELDS = "name email phone gender dob img";

/** Safe patient view for doctors: never password/otp/reset fields. */
export const patientView = (u) =>
  u && {
    _id: u._id,
    name: u.name,
    email: u.email,
    phone: u.phone && u.phone !== "0000000000" ? u.phone : "",
    gender: u.gender && u.gender !== "Not Selected" ? u.gender : "",
    age: ageFromDob(u.dob),
    image: u.img,
  };

/** Uniform JSON shape for an appointment (adds display labels computed in CLINIC_TZ). */
export const appointmentView = (a, { patient } = {}) => {
  const o = typeof a.toObject === "function" ? a.toObject() : { ...a };
  const userPop = o.userId && typeof o.userId === "object" && o.userId.name !== undefined ? o.userId : null;
  if (userPop) o.userId = userPop._id;
  const start = o.startAt ? zoned(o.startAt) : null;
  return {
    ...o,
    patient: patient ?? (userPop ? patientView(userPop) : undefined),
    dateLabel: start ? start.toFormat("ccc d LLL yyyy") : o.slotDate,
    timeLabel: start ? slotLabel(start) : o.slotTime,
  };
};

export const canUserCancel = (a, now = Date.now()) => {
  if (a.status !== "booked") return { ok: false, reason: "Only booked appointments can be cancelled" };
  if (new Date(a.startAt).getTime() - now < USER_CANCEL_MIN_HOURS * 3600 * 1000)
    return { ok: false, reason: `Appointments can be cancelled up to ${USER_CANCEL_MIN_HOURS} hours before the start time` };
  return { ok: true };
};

/**
 * Cancel one appointment and notify the other party (non-blocking).
 * by: "user" | "doctor" | "admin". Returns the updated doc or null if it was no longer booked.
 */
export async function cancelAppointment(appointmentId, by, reason = "", { notify = true } = {}) {
  const updated = await appointmentModel.findOneAndUpdate(
    { _id: appointmentId, status: "booked" },
    { $set: { status: "cancelled", isActive: false, cancelledBy: by, cancelReason: reason, cancelledAt: new Date() } },
    { new: true },
  );
  if (updated && notify) notifyCancellation(updated, by).catch((e) => console.error("[mail] cancel notify:", e.message));
  return updated;
}

async function notifyCancellation(a, by) {
  const [user, doc] = await Promise.all([
    userModel.findById(a.userId).select("email name").lean(),
    doctorModel.findById(a.docId).select("email name status").lean(),
  ]);
  // notify the party that did NOT cancel; admin cancellations notify both
  if (by !== "user" && user) sendMail(user.email, templates.appointmentCancelled({ appointment: a, by: by === "admin" ? "hospital" : "doctor", otherName: doc?.name }));
  if (by !== "doctor" && doc && doc.status !== "removed") sendMail(doc.email, templates.appointmentCancelled({ appointment: a, by: by === "admin" ? "hospital" : "patient", otherName: user?.name }));
}

/** Cancel all FUTURE active appointments of a doctor (used when a doctor is removed). Returns count. */
export async function cancelFutureForDoctor(docId, reason) {
  const future = await appointmentModel.find({ docId, status: "booked", startAt: { $gt: new Date() } }).select("_id").lean();
  let n = 0;
  for (const { _id } of future) {
    if (await cancelAppointment(_id, "admin", reason)) n++;
  }
  return n;
}
