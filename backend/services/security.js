import crypto from "crypto";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";

export const sha256 = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
export const newOtp = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");
export const normEmail = (e) => String(e || "").trim().toLowerCase();
export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// One verification window for both the OTP and the email link.
export const OTP_TTL_MS = 30 * 60 * 1000;
export const VERIFY_TTL_MINUTES = OTP_TTL_MS / 60000;

/** Email-verification link token: raw goes in the email, only the sha256 hash is stored. */
export const newVerifyToken = () => {
  const raw = randomToken(32);
  return { raw, hash: sha256(raw) };
};
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const HANDOFF_TTL_MS = 60 * 1000;

export const signDoctorToken = (id) => jwt.sign({ id: String(id), role: "doctor" }, process.env.JWT_SECRET, { expiresIn: "7d" });
// Limited token: lets a not-yet-approved applicant poll status / reapply. Rejected by authDoctor.
export const signApplicantToken = (id) =>
  jwt.sign({ id: String(id), role: "applicant" }, process.env.JWT_SECRET, { expiresIn: "7d" });

/** Is this email already used by a patient (verified) or a doctor (any status) other than `exceptDoctorId`? */
export async function emailTaken(email, { exceptDoctorId, exceptUnverifiedUser = false } = {}) {
  const e = normEmail(email);
  const rx = new RegExp(`^${escapeRegex(e)}$`, "i");
  const user = await userModel.findOne({ email: rx }).select("isVerified").lean();
  if (user && !(exceptUnverifiedUser && !user.isVerified)) return "patient";
  const doc = await doctorModel.findOne({ email: rx }).select("_id isEmailVerified").lean();
  if (doc && String(doc._id) !== String(exceptDoctorId || "")) return "doctor";
  return null;
}

/** Cloudinary public_id from a secure_url (fallback when imagePublicId wasn't stored). */
export function cloudinaryPublicId(url) {
  const m = String(url || "").match(/\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?([^/]+(?:\/[^/]+)*)\.[a-z0-9]+$/i);
  return m ? m[1] : null;
}
