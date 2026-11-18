// Shared auth endpoints (patient + doctor).
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import { sha256, signApplicantToken } from "../services/security.js";
import { sendMail, templates } from "../services/notify.js";

const INVALID_LINK = "This verification link is invalid, expired or already used. Request a new one.";

// POST /api/auth/verify-email {token, type: "user"|"doctor"}
// POST (not GET) so email link scanners that prefetch URLs can't verify an account.
export const verifyEmail = async (req, res) => {
  try {
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const type = req.body?.type;
    if (!/^[a-f0-9]{64}$/i.test(token) || !["user", "doctor"].includes(type)) {
      return res.status(400).json({ success: false, code: "INVALID_LINK", message: INVALID_LINK });
    }
    const filter = { verifyTokenHash: sha256(token.toLowerCase()), otpExpire: { $gt: new Date() } };

    if (type === "user") {
      // atomic: the token can only be consumed once
      const user = await userModel.findOneAndUpdate(
        { ...filter, isVerified: { $ne: true } },
        { $set: { isVerified: true }, $unset: { verifyTokenHash: 1, otp: 1, otpExpire: 1 } },
        { new: true },
      );
      if (!user) return res.status(400).json({ success: false, code: "INVALID_LINK", message: INVALID_LINK });
      const authToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
      return res.json({ success: true, message: "Email verified", token: authToken, email: user.email });
    }

    const doctor = await doctorModel.findOneAndUpdate(
      { ...filter, isEmailVerified: { $ne: true } },
      { $set: { isEmailVerified: true, status: "pending", otpAttempts: 0 }, $unset: { verifyTokenHash: 1, otpHash: 1, otpExpire: 1 } },
      { new: true },
    );
    if (!doctor) return res.status(400).json({ success: false, code: "INVALID_LINK", message: INVALID_LINK });
    sendMail(doctor.email, templates.doctorApplicationReceived({ name: doctor.name }));
    res.json({
      success: true,
      message: "Email verified. Your application is under review.",
      next: "application",
      status: doctor.status,
      email: doctor.email,
      applicantToken: signApplicantToken(doctor._id),
    });
  } catch (error) {
    console.error("verify email:", error.message);
    res.status(500).json({ success: false, message: "Could not verify email" });
  }
};
