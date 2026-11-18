import mongoose from "mongoose";

// Doctor account lifecycle:
//   pending  -> applied via self-signup, waiting for an admin decision
//   approved -> visible publicly, can log in to the Doctor Panel
//   rejected -> admin declined (rejectionReason); doctor may edit + reapply -> pending
//   removed  -> soft-deleted (left the hospital); login blocked, history kept
export const DOCTOR_STATUSES = ["pending", "approved", "rejected", "removed"];

const rangeSchema = new mongoose.Schema(
  { start: { type: String, required: true }, end: { type: String, required: true } }, // "HH:mm" in CLINIC_TZ
  { _id: false },
);

const defaultDay = () => [{ start: "10:00", end: "21:00" }];
const weeklyHoursSchema = new mongoose.Schema(
  {
    mon: { type: [rangeSchema], default: defaultDay },
    tue: { type: [rangeSchema], default: defaultDay },
    wed: { type: [rangeSchema], default: defaultDay },
    thu: { type: [rangeSchema], default: defaultDay },
    fri: { type: [rangeSchema], default: defaultDay },
    sat: { type: [rangeSchema], default: defaultDay },
    sun: { type: [rangeSchema], default: () => [] },
  },
  { _id: false },
);

const timeOffSchema = new mongoose.Schema({
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  reason: { type: String, default: "" },
});

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    image: { type: String, required: true },
    imagePublicId: { type: String },
    phone: { type: String, default: "" },
    speciality: { type: String, required: true },
    degree: { type: String, required: true },
    experience: { type: String, required: true },
    about: { type: String, required: true },
    available: { type: Boolean, default: true }, // Active / Not active toggle (approved doctors)
    fee: { type: Number, required: true },
    address: { type: Object, required: true },
    date: { type: Number, required: true },
    slots_booked: { type: Object, default: {} }, // LEGACY: unused since the scheduling rebuild

    // --- signup & approval workflow ---
    status: { type: String, enum: DOCTOR_STATUSES, default: "pending", index: true },
    licenseNumber: { type: String, trim: true, default: "" },
    isEmailVerified: { type: Boolean, default: false },
    otpHash: { type: String },
    otpExpire: { type: Date },
    otpAttempts: { type: Number, default: 0 },
    otpSentAt: { type: Date },
    verifyTokenHash: { type: String, index: true, sparse: true }, // email-link token (single use, expires with otpExpire)
    rejectionReason: { type: String, default: "" },
    appliedAt: { type: Date },
    approvedAt: { type: Date },
    approvedBy: { type: String },
    removedAt: { type: Date },
    removedReason: { type: String, default: "" },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
    handoffCodeHash: { type: String, index: true, sparse: true },
    handoffExpire: { type: Date },
    lastLoginAt: { type: Date },

    // --- scheduling (all wall-clock values are in CLINIC_TZ) ---
    slotMinutes: { type: Number, default: 30, min: 5, max: 240 },
    bufferMinutes: { type: Number, default: 0, min: 0, max: 120 },
    weeklyHours: { type: weeklyHoursSchema, default: () => ({}) },
    timeOff: { type: [timeOffSchema], default: [] },
    bookingWindowDays: { type: Number, default: 14, min: 1, max: 90 },
    minLeadMinutes: { type: Number, default: 60, min: 0, max: 10080 },
  },
  { minimize: false },
);

// Fields that must never leave the server.
export const DOCTOR_PRIVATE_FIELDS =
  "-password -otpHash -otpExpire -otpAttempts -otpSentAt -verifyTokenHash -resetPasswordToken -resetPasswordExpire -handoffCodeHash -handoffExpire -slots_booked";

// Fields shown on the public doctor list / doctor page.
export const DOCTOR_PUBLIC_FIELDS =
  "name image speciality degree experience about available fee address slotMinutes";

const doctorModel = mongoose.models.doctor || mongoose.model("doctor", doctorSchema);

export default doctorModel;
