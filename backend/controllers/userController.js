import validator from "validator";
import bcrypt from "bcrypt";
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import crypto from "crypto";
import mongoose from "mongoose";
import { escapeRegex, normEmail, newOtp, newVerifyToken, OTP_TTL_MS, OTP_RESEND_COOLDOWN_MS, VERIFY_TTL_MINUTES } from "../services/security.js";
import { verifyLink, PATIENT_APP_URL } from "../emails/templates.js";
import { validateSlot } from "../services/scheduling.js";
import { appointmentView, canUserCancel, cancelAppointment as cancelAppt } from "../services/appointments.js";
import { sendMail, sendMailNow, templates, MailError } from "../services/notify.js";

/** Issue a fresh OTP + email-link token (replacing any previous ones), save, and send the email. */
async function issueUserVerification(user) {
  const otp = newOtp();
  const link = newVerifyToken();
  user.otp = otp;
  user.otpExpire = new Date(Date.now() + OTP_TTL_MS);
  user.otpSentAt = new Date();
  user.verifyTokenHash = link.hash;
  await user.save();
  await sendMailNow(user.email, templates.verifyAccount({ name: user.name, otp, url: verifyLink(link.raw, "user"), minutes: VERIFY_TTL_MINUTES }));
}

// POST /api/user/resend-otp {email} — same response whether or not the account exists
const resendUserOtp = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim();
    const user = email ? await userModel.findOne({ email }) : null;
    if (!user || user.isVerified) return res.json({ success: true, message: "If the account exists, a new code was sent" });
    const wait = user.otpSentAt ? OTP_RESEND_COOLDOWN_MS - (Date.now() - user.otpSentAt.getTime()) : 0;
    if (wait > 0) {
      return res.json({ success: false, message: `Please wait ${Math.ceil(wait / 1000)}s before requesting a new code`, retryAfter: Math.ceil(wait / 1000) });
    }
    await issueUserVerification(user);
    res.json({ success: true, message: "A new code and link were sent to your email" });
  } catch (error) {
    console.error("user resend otp:", error.message);
    if (error instanceof MailError) return res.status(502).json({ success: false, code: "MAIL_FAILED", message: error.message });
    res.json({ success: false, message: "Could not send verification email" });
  }
};

//API TO REGISTER USER
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.json({ success: false, message: "Missing Details" });
    }
    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Enter a valid email" });
    }
    if (password.length < 8) {
      return res.json({ success: false, message: "Enter a strong password" });
    }

    // Email must be unique across patients AND doctors
    const rx = new RegExp(`^${escapeRegex(normEmail(email))}$`, "i");
    if (await doctorModel.exists({ email: rx })) {
      return res.json({ success: false, message: "Email already exists" });
    }

    // Check if user exists
    let existingUser = await userModel.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      return res.json({ success: false, message: "Email already exists" });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let user = existingUser;
    if (user) {
      // exists but isn't verified: update their info (a new OTP + link is issued below)
      user.name = name;
      user.password = hashedPassword;
    } else {
      user = new userModel({ name, email, password: hashedPassword, isVerified: false });
    }
    await issueUserVerification(user);

    res.json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    console.error("Registration error:", error.message);
    if (error instanceof MailError) return res.status(502).json({ success: false, code: "MAIL_FAILED", message: error.message });
    res.json({ success: false, message: "Something went wrong on the server" });
  }
};

//  API TO VERIFY OTP
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (user.isVerified) {
      return res.json({ success: false, message: "Account already verified" });
    }

    if (!user.otp || String(user.otp) !== String(otp) || !user.otpExpire || user.otpExpire < Date.now()) {
      return res.json({ success: false, message: "Invalid or expired OTP" });
    }

    // Mark as verified and clear OTP + link fields (both are single use)
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;
    user.verifyTokenHash = undefined;
    await user.save();

    // Log the user in
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({
      success: true,
      message: "Account Verified Successfully",
      token,
    });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

//API FOR USER LOGN

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "User Doest not exist" });
    }
    if (!user.isVerified) {
      return res.json({
        success: false,
        message: "Please verify your email first",
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      res.json({ success: true, token });
    } else {
      res.json({ success: false, message: "Incorrect Credentials" });
    }
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

//API TO GET USERS PROFILE DATA
const getProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const userData = await userModel.findById(userId).select("-password -otp -otpExpire -otpSentAt -verifyTokenHash -resetPasswordToken -resetPasswordExpire");

    res.json({ success: true, userData });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

//API TO UPDATE THE USER PROFILE
const updateProfile = async (req, res) => {
  try {
    // Only ever update the authenticated user; ignore any userId sent in the body
    const userId = req.userId;
    const { name, phone, address, dob, gender } = req.body;
    const imageFile = req.file;
    if (!name || !phone || !dob || !gender) {
      return res.json({ success: false, message: "Data Missing" });
    }

    await userModel.findByIdAndUpdate(userId, {
      name,
      phone,
      address: JSON.parse(address),
      dob,
      gender,
    });
    if (imageFile) {
      // UPLOAD USER IMAGE TO CLOUDINARY
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: "image",
      });

      //SAVING THE URL IN THE LOCAL VARIABLE SO THAT WE CAN STORE THAT URL IN MONGODB
      const imageUrl = imageUpload.secure_url;

      await userModel.findByIdAndUpdate(userId, { img: imageUrl });
    }
    res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
//BOOK AN APPOINTMENT — server validates the slot; the unique index prevents double booking
const bookAppointment = async (req, res) => {
  try {
    const userId = req.userId;
    const { docId, startAt } = req.body;
    if (!mongoose.isValidObjectId(docId)) return res.json({ success: false, message: "Doctor not found" });

    const docData = await doctorModel.findOne({ _id: docId, status: "approved" }).lean();
    if (!docData) return res.json({ success: false, message: "Doctor not found" });
    if (!docData.available) return res.json({ success: false, message: "Doctor Not Available" });

    const check = validateSlot(docData, startAt);
    if (!check.ok) return res.status(400).json({ success: false, message: check.message });

    // overlap checks (the unique indexes are the final guard against races)
    const [patientClash, doctorClash] = await Promise.all([
      appointmentModel.exists({ userId, isActive: true, startAt: { $lt: check.end }, endAt: { $gt: check.start } }),
      appointmentModel.exists({ docId, isActive: true, startAt: { $lt: check.end }, endAt: { $gt: check.start } }),
    ]);
    if (doctorClash) return res.status(409).json({ success: false, code: "SLOT_TAKEN", message: "This slot was just booked. Please pick another." });
    if (patientClash) return res.status(409).json({ success: false, code: "PATIENT_BUSY", message: "You already have an appointment at this time." });

    const userData = await userModel.findById(userId).select("name img email").lean();
    if (!userData) return res.status(401).json({ success: false, message: "NOT AUTHORIZED LOGIN AGAIN" });

    let appt;
    try {
      appt = await appointmentModel.create({
        userId,
        docId,
        startAt: check.start,
        endAt: check.end,
        status: "booked",
        isActive: true,
        userData: { name: userData.name, img: userData.img },
        docData: { name: docData.name, speciality: docData.speciality, image: docData.image, fee: docData.fee, address: docData.address },
        amount: docData.fee,
        date: Date.now(),
      });
    } catch (e) {
      if (e?.code === 11000) {
        const patient = /userId/.test(e.message) || e.keyPattern?.userId;
        return res.status(409).json({
          success: false,
          code: patient ? "PATIENT_BUSY" : "SLOT_TAKEN",
          message: patient ? "You already have an appointment at this time." : "This slot was just booked. Please pick another.",
        });
      }
      throw e;
    }

    sendMail(userData.email, templates.appointmentBooked({ appointment: appt }));
    doctorModel
      .findById(docId)
      .select("email")
      .lean()
      .then((d) => d && sendMail(d.email, templates.appointmentBooked({ appointment: appt, forDoctor: true })))
      .catch((e) => console.error("[mail] booking notify:", e.message));

    res.json({ success: true, message: "Appointment Booked", appointment: appointmentView(appt) });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

//LIST THE PATIENT'S APPOINTMENTS (newest first) with cancel eligibility
const listAppointment = async (req, res) => {
  try {
    const appointments = await appointmentModel.find({ userId: req.userId }).sort({ startAt: -1 });
    const now = Date.now();
    res.json({
      success: true,
      appointments: appointments.map((a) => {
        const c = canUserCancel(a, now);
        return { ...appointmentView(a), canCancel: c.ok, cancelBlockedReason: c.ok ? "" : c.reason };
      }),
    });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

//PATIENT CANCELS (allowed up to 2h before start)
const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    if (!mongoose.isValidObjectId(appointmentId)) return res.json({ success: false, message: "Appointment not found" });
    const appointmentData = await appointmentModel.findById(appointmentId);
    if (!appointmentData || String(appointmentData.userId) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: "unauthorized Action" });
    }
    const c = canUserCancel(appointmentData);
    if (!c.ok) return res.status(400).json({ success: false, message: c.reason });
    const updated = await cancelAppt(appointmentId, "user", String(req.body.reason || "Cancelled by the patient").slice(0, 300));
    if (!updated) return res.json({ success: false, message: "Only booked appointments can be cancelled" });
    res.json({ success: true, message: "Appointment Cancelled" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// Send Reset Email Controller
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    // Generate Reset Token using crypto
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Hash token and save to DB (security practice)
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Token expires in 10 minutes
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    const resetUrl = `${PATIENT_APP_URL()}/reset-password/${resetToken}`;
    await sendMailNow(user.email, templates.passwordReset({ name: user.name, url: resetUrl }));

    res.json({ success: true, message: "Email sent" });
  } catch (error) {
    if (error instanceof MailError) return res.status(502).json({ success: false, code: "MAIL_FAILED", message: "We couldn't send the reset email. Please try again." });
    res.json({ success: false, message: error.message });
  }
};

// Reset Password Controller (To be called when user clicks the link)
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  // Hash the token from URL to compare with DB
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  try {
    const user = await userModel.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }, // Check if time is valid
    });

    if (!user) {
      return res.json({ success: false, message: "Invalid or Expired Token" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Clear reset fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({ success: true, message: "Password Updated Successfully" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
export {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  bookAppointment,
  listAppointment,
  cancelAppointment,
  forgotPassword,
  resetPassword,
  verifyOTP,
  resendUserOtp,
};
