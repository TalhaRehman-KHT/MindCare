import mongoose from "mongoose";

export const APPOINTMENT_STATUSES = ["booked", "completed", "cancelled", "no_show"];
// An "active" appointment occupies its slot. Enforced unique per doctor and per patient.
export const isActiveStatus = (status) => status === "booked" || status === "completed";

const appointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  docId: { type: mongoose.Schema.Types.ObjectId, ref: "doctor", required: true },
  startAt: { type: Date, required: true }, // UTC instant
  endAt: { type: Date, required: true },
  status: { type: String, enum: APPOINTMENT_STATUSES, default: "booked" },
  isActive: { type: Boolean, default: true },
  cancelledBy: { type: String, enum: ["user", "doctor", "admin", null], default: null },
  cancelReason: { type: String, default: "" },
  cancelledAt: { type: Date },
  completedAt: { type: Date },
  // Small display snapshot only; live patient details are read from users.
  userData: { type: Object, default: {} }, // { name, img }
  docData: { type: Object, default: {} }, // { name, speciality, image, fee, address }
  amount: { type: Number, required: true },
  date: { type: Number, required: true }, // created at (ms)

  // LEGACY (pre-rebuild) fields, kept so old documents stay readable.
  slotDate: { type: String },
  slotTime: { type: String },
  cancelled: { type: Boolean },
  isCompleted: { type: Boolean },
});

appointmentSchema.index(
  { docId: 1, startAt: 1 },
  { unique: true, partialFilterExpression: { isActive: true }, name: "uniq_active_doctor_slot" },
);
appointmentSchema.index(
  { userId: 1, startAt: 1 },
  { unique: true, partialFilterExpression: { isActive: true }, name: "uniq_active_patient_slot" },
);
appointmentSchema.index({ userId: 1, startAt: -1 }, { name: "user_startAt" });
appointmentSchema.index({ docId: 1, startAt: -1 }, { name: "doctor_startAt" });

const appointmentModel =
  mongoose.models.appointment || mongoose.model("appointment", appointmentSchema);

export default appointmentModel;
