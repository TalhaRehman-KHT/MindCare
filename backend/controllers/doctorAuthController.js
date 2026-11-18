// Doctor self-signup, email verification, login (by status), handoff, reapply, password reset.
import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import doctorModel, { DOCTOR_PRIVATE_FIELDS } from "../models/doctorModel.js";
import {
  sha256, newOtp, randomToken, normEmail, emailTaken, signDoctorToken, signApplicantToken,
  OTP_TTL_MS, OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_MS, HANDOFF_TTL_MS, VERIFY_TTL_MINUTES, newVerifyToken,
} from "../services/security.js";
import { sendMail, sendMailNow, templates, ADMIN_PANEL_URL, MailError } from "../services/notify.js";
import { verifyLink } from "../emails/templates.js";

const GENERIC_BAD_LOGIN = "Invalid email or password";
const fail = (res, message, extra = {}, status = 200) => res.status(status).json({ success: false, message, ...extra });

const parseAddress = (address) => {
  if (!address) return null;
  if (typeof address === "object") return address;
  try {
    const a = JSON.parse(address);
    return a && typeof a === "object" ? { line1: String(a.line1 || ""), line2: String(a.line2 || "") } : null;
  } catch {
    return null;
  }
};

/** Validate the professional details shared by register + reapply. Returns {error} or {value}. */
function validateDetails(body, { requirePassword }) {
  const { name, email, password, phone, speciality, degree, experience, fee, about, licenseNumber } = body;
  const address = parseAddress(body.address);
  const errors = {};
  if (!name || String(name).trim().length < 2) errors.name = "Name is required";
  if (requirePassword) {
    if (!email || !validator.isEmail(normEmail(email))) errors.email = "Enter a valid email";
    if (!password || String(password).length < 8) errors.password = "Password must be at least 8 characters";
  }
  if (!phone || !/^\+?[0-9 ()-]{7,20}$/.test(String(phone))) errors.phone = "Enter a valid phone number";
  if (!speciality) errors.speciality = "Speciality is required";
  if (!degree) errors.degree = "Degree is required";
  if (!experience) errors.experience = "Experience is required";
  if (fee === undefined || fee === "" || isNaN(Number(fee)) || Number(fee) < 0) errors.fee = "Enter a valid fee";
  if (!about || String(about).trim().length < 10) errors.about = "Tell patients a little about yourself (10+ characters)";
  if (!licenseNumber || String(licenseNumber).trim().length < 3) errors.licenseNumber = "PMDC license number is required";
  if (!address || !address.line1) errors.address = "Address is required";
  if (Object.keys(errors).length) return { error: Object.values(errors)[0], errors };
  return {
    value: {
      name: String(name).trim(),
      phone: String(phone).trim(),
      speciality: String(speciality),
      degree: String(degree).trim(),
      experience: String(experience),
      fee: Number(fee),
      about: String(about).trim(),
      licenseNumber: String(licenseNumber).trim(),
      address,
    },
  };
}

async function uploadImage(file) {
  const up = await cloudinary.uploader.upload(file.path, { resource_type: "image" });
  return { image: up.secure_url, imagePublicId: up.public_id };
}

async function issueOtp(doctor) {
  const otp = newOtp();
  doctor.otpHash = sha256(otp);
  doctor.otpExpire = new Date(Date.now() + OTP_TTL_MS);
  doctor.otpAttempts = 0;
  doctor.otpSentAt = new Date();
  const link = newVerifyToken(); // replaces any previous link: resend invalidates both
  doctor.verifyTokenHash = link.hash;
  await doctor.save();
  await sendMailNow(
    doctor.email,
    templates.verifyDoctor({ name: doctor.name, otp, url: verifyLink(link.raw, "doctor"), minutes: VERIFY_TTL_MINUTES }),
  );
}

const publicApplication = (d) => ({
  _id: d._id,
  name: d.name,
  email: d.email,
  phone: d.phone,
  image: d.image,
  speciality: d.speciality,
  degree: d.degree,
  experience: d.experience,
  fee: d.fee,
  about: d.about,
  address: d.address,
  licenseNumber: d.licenseNumber,
  status: d.status,
  isEmailVerified: d.isEmailVerified,
  rejectionReason: d.status === "rejected" ? d.rejectionReason : "",
  appliedAt: d.appliedAt,
  approvedAt: d.approvedAt,
});

// POST /api/doctor/register (multipart)
export const registerDoctor = async (req, res) => {
  try {
    const { value, error, errors } = validateDetails(req.body, { requirePassword: true });
    if (error) return fail(res, error, { errors });
    const email = normEmail(req.body.email);

    const existing = await doctorModel.findOne({ email });
    if (existing && existing.isEmailVerified) return fail(res, "This email is already registered", { errors: { email: "Already registered" } });
    const takenBy = await emailTaken(email, { exceptDoctorId: existing?._id });
    if (takenBy) return fail(res, "This email is already registered", { errors: { email: "Already registered" } });
    if (!req.file && !existing?.image) return fail(res, "Profile photo is required", { errors: { image: "Photo is required" } });

    const hashed = await bcrypt.hash(String(req.body.password), 10);
    const img = req.file ? await uploadImage(req.file) : {};

    const doctor = existing || new doctorModel({ email, date: Date.now() });
    Object.assign(doctor, value, img, {
      password: hashed,
      status: "pending",
      isEmailVerified: false,
      available: true,
      appliedAt: new Date(),
    });
    await doctor.save();
    await issueOtp(doctor);
    res.json({ success: true, message: "OTP sent to your email", email });
  } catch (error) {
    console.error("doctor register:", error.message);
    if (error instanceof MailError) return res.status(502).json({ success: false, code: "MAIL_FAILED", message: error.message });
    if (error?.code === 11000) return fail(res, "This email is already registered");
    fail(res, "Could not complete signup. Please try again.");
  }
};

// POST /api/doctor/verify-otp {email, otp}
export const verifyDoctorOtp = async (req, res) => {
  try {
    const email = normEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();
    const doctor = await doctorModel.findOne({ email });
    if (!doctor || doctor.isEmailVerified) return fail(res, "Invalid or expired OTP");
    if (!doctor.otpHash || !doctor.otpExpire || doctor.otpExpire < new Date()) return fail(res, "OTP expired. Please request a new one.");
    if (doctor.otpAttempts >= OTP_MAX_ATTEMPTS) return fail(res, "Too many attempts. Please request a new OTP.");
    if (sha256(otp) !== doctor.otpHash) {
      doctor.otpAttempts += 1;
      await doctor.save();
      return fail(res, "Invalid OTP", { attemptsLeft: Math.max(0, OTP_MAX_ATTEMPTS - doctor.otpAttempts) });
    }
    doctor.isEmailVerified = true;
    doctor.otpHash = undefined;
    doctor.otpExpire = undefined;
    doctor.otpAttempts = 0;
    doctor.verifyTokenHash = undefined;
    await doctor.save();
    sendMail(doctor.email, templates.doctorApplicationReceived({ name: doctor.name }));
    res.json({
      success: true,
      message: "Email verified. Your application is under review.",
      status: doctor.status,
      applicantToken: signApplicantToken(doctor._id),
    });
  } catch (error) {
    console.error("doctor verify otp:", error.message);
    fail(res, "Could not verify OTP");
  }
};

// POST /api/doctor/resend-otp {email}
export const resendDoctorOtp = async (req, res) => {
  try {
    const email = normEmail(req.body.email);
    const doctor = await doctorModel.findOne({ email });
    // don't reveal whether the email exists
    if (!doctor || doctor.isEmailVerified) return res.json({ success: true, message: "If the account exists, a new OTP was sent" });
    const wait = doctor.otpSentAt ? OTP_RESEND_COOLDOWN_MS - (Date.now() - doctor.otpSentAt.getTime()) : 0;
    if (wait > 0) return fail(res, `Please wait ${Math.ceil(wait / 1000)}s before requesting a new OTP`, { retryAfter: Math.ceil(wait / 1000) });
    await issueOtp(doctor);
    res.json({ success: true, message: "A new OTP was sent to your email" });
  } catch (error) {
    console.error("doctor resend otp:", error.message);
    if (error instanceof MailError) return res.status(502).json({ success: false, code: "MAIL_FAILED", message: error.message });
    fail(res, "Could not send OTP");
  }
};

/** Shared credential + status check for login and login-handoff. */
async function checkDoctorLogin(req) {
  const email = normEmail(req.body.email);
  const password = String(req.body.password || "");
  if (!email || !password) return { out: { success: false, message: GENERIC_BAD_LOGIN } };
  const doctor = await doctorModel.findOne({ email });
  if (!doctor || !(await bcrypt.compare(password, doctor.password))) return { out: { success: false, message: GENERIC_BAD_LOGIN } };
  if (doctor.status === "removed") return { out: { success: false, code: "NOT_ACTIVE", message: "Account not active" } };
  if (!doctor.isEmailVerified) {
    const canResend = !doctor.otpSentAt || Date.now() - doctor.otpSentAt.getTime() > OTP_RESEND_COOLDOWN_MS;
    if (canResend) await issueOtp(doctor).catch((e) => console.error("otp resend on login:", e.message));
    return { out: { success: false, code: "EMAIL_NOT_VERIFIED", message: "Please verify your email. We sent you a new OTP.", email } };
  }
  if (doctor.status === "pending")
    return { out: { success: false, code: "PENDING_APPROVAL", message: "Your application is under review", applicantToken: signApplicantToken(doctor._id) } };
  if (doctor.status === "rejected")
    return {
      out: { success: false, code: "REJECTED", message: "Your application was not approved", reason: doctor.rejectionReason, applicantToken: signApplicantToken(doctor._id) },
    };
  return { doctor };
}

// POST /api/doctor/login
export const doctorLogin = async (req, res) => {
  try {
    const { out, doctor } = await checkDoctorLogin(req);
    if (out) return res.json(out);
    doctor.lastLoginAt = new Date();
    await doctor.save();
    res.json({ success: true, token: signDoctorToken(doctor._id) });
  } catch (error) {
    console.error("doctor login:", error.message);
    fail(res, "Login failed. Please try again.");
  }
};

// POST /api/doctor/login-handoff {email, password} -> one-time code for the admin app (no token in URLs)
export const doctorLoginHandoff = async (req, res) => {
  try {
    const { out, doctor } = await checkDoctorLogin(req);
    if (out) return res.json(out);
    const code = randomToken(24);
    doctor.handoffCodeHash = sha256(code);
    doctor.handoffExpire = new Date(Date.now() + HANDOFF_TTL_MS);
    await doctor.save();
    res.json({ success: true, code, redirectUrl: `${ADMIN_PANEL_URL()}/auth/doctor?code=${code}`, expiresIn: HANDOFF_TTL_MS / 1000 });
  } catch (error) {
    console.error("doctor handoff:", error.message);
    fail(res, "Login failed. Please try again.");
  }
};

// POST /api/doctor/exchange-code {code} -> dtoken (single use, 60s)
export const exchangeHandoffCode = async (req, res) => {
  try {
    const code = String(req.body.code || "");
    if (!code) return fail(res, "Invalid or expired login link", {}, 400);
    // atomic single use: the update both matches and consumes the code
    const doctor = await doctorModel.findOneAndUpdate(
      { handoffCodeHash: sha256(code), handoffExpire: { $gt: new Date() }, status: "approved" },
      { $unset: { handoffCodeHash: 1, handoffExpire: 1 }, $set: { lastLoginAt: new Date() } },
      { new: true },
    );
    if (!doctor) return fail(res, "Invalid or expired login link", {}, 400);
    res.json({ success: true, token: signDoctorToken(doctor._id) });
  } catch (error) {
    console.error("doctor exchange code:", error.message);
    fail(res, "Invalid or expired login link", {}, 400);
  }
};

// GET /api/doctor/application-status   (header apptoken)  |  POST same path {email, password}
export const applicationStatus = async (req, res) => {
  try {
    let doctor;
    if (req.method === "POST") {
      const email = normEmail(req.body.email);
      doctor = await doctorModel.findOne({ email });
      if (!doctor || !(await bcrypt.compare(String(req.body.password || ""), doctor.password))) return fail(res, GENERIC_BAD_LOGIN);
    } else {
      const token = req.headers.apptoken;
      if (!token) return fail(res, "NOT AUTHORIZED", {}, 401);
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        return fail(res, "Session expired", {}, 401);
      }
      if (!["applicant", "doctor"].includes(decoded.role)) return fail(res, "NOT AUTHORIZED", {}, 401);
      doctor = await doctorModel.findById(decoded.id);
      if (!doctor) return fail(res, "NOT AUTHORIZED", {}, 401);
    }
    if (doctor.status === "removed") return fail(res, "Account not active", { code: "NOT_ACTIVE" });
    res.json({
      success: true,
      application: publicApplication(doctor),
      applicantToken: req.method === "POST" ? signApplicantToken(doctor._id) : undefined,
    });
  } catch (error) {
    console.error("application status:", error.message);
    fail(res, "Could not load application status");
  }
};

// POST /api/doctor/reapply (multipart, header apptoken) — rejected doctor edits details -> pending
export const reapplyDoctor = async (req, res) => {
  try {
    const doctor = await doctorModel.findById(req.docId);
    if (!doctor) return fail(res, "NOT AUTHORIZED", {}, 401);
    if (doctor.status !== "rejected") return fail(res, "Only rejected applications can be resubmitted");
    const { value, error, errors } = validateDetails({ ...doctor.toObject(), ...req.body }, { requirePassword: false });
    if (error) return fail(res, error, { errors });
    const img = req.file ? await uploadImage(req.file) : {};
    Object.assign(doctor, value, img, { status: "pending", rejectionReason: "", appliedAt: new Date() });
    await doctor.save();
    sendMail(doctor.email, templates.doctorApplicationReceived({ name: doctor.name, updated: true }));
    res.json({ success: true, message: "Application resubmitted", application: publicApplication(doctor) });
  } catch (error) {
    console.error("doctor reapply:", error.message);
    fail(res, "Could not resubmit application");
  }
};

// POST /api/doctor/forgot-password {email} — approved doctors only; same response either way
export const doctorForgotPassword = async (req, res) => {
  try {
    const email = normEmail(req.body.email);
    const doctor = await doctorModel.findOne({ email, status: "approved" });
    if (doctor) {
      const token = randomToken(20);
      doctor.resetPasswordToken = sha256(token);
      doctor.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);
      await doctor.save();
      sendMail(doctor.email, templates.passwordReset({ name: doctor.name, url: `${ADMIN_PANEL_URL()}/doctor/reset-password/${token}`, doctor: true }));
    }
    res.json({ success: true, message: "If an approved doctor account exists for this email, a reset link was sent" });
  } catch (error) {
    console.error("doctor forgot password:", error.message);
    fail(res, "Could not send reset email");
  }
};

// POST /api/doctor/reset-password/:token {password}
export const doctorResetPassword = async (req, res) => {
  try {
    const password = String(req.body.password || "");
    if (password.length < 8) return fail(res, "Password must be at least 8 characters");
    const doctor = await doctorModel.findOne({
      resetPasswordToken: sha256(req.params.token),
      resetPasswordExpire: { $gt: new Date() },
      status: "approved",
    });
    if (!doctor) return fail(res, "Invalid or expired reset link");
    doctor.password = await bcrypt.hash(password, 10);
    doctor.resetPasswordToken = undefined;
    doctor.resetPasswordExpire = undefined;
    await doctor.save();
    res.json({ success: true, message: "Password updated. You can now sign in." });
  } catch (error) {
    console.error("doctor reset password:", error.message);
    fail(res, "Could not reset password");
  }
};

export { publicApplication, DOCTOR_PRIVATE_FIELDS };
