import jwt from "jsonwebtoken";
import doctorModel from "../models/doctorModel.js";

// DOCTOR AUTHENTICATION MIDDLEWARE
// Verifies the JWT, then loads the doctor and allows ONLY status "approved",
// so approve/remove take effect immediately (no waiting for token expiry).
const authDoctor = async (req, res, next) => {
  try {
    const { dtoken } = req.headers;
    if (!dtoken) {
      return res.status(401).json({ success: false, message: "NOT AUTHORIZED LOGIN AGAIN" });
    }
    const decoded = jwt.verify(dtoken, process.env.JWT_SECRET);
    if (decoded.role && decoded.role !== "doctor") {
      return res.status(401).json({ success: false, message: "NOT AUTHORIZED LOGIN AGAIN" });
    }
    const doctor = await doctorModel.findById(decoded.id).select("status").lean();
    if (!doctor || doctor.status !== "approved") {
      return res.status(401).json({ success: false, message: "Account not active" });
    }
    req.docId = String(decoded.id);
    next();
  } catch (error) {
    const expired = error?.name === "TokenExpiredError";
    res.status(401).json({ success: false, message: expired ? "Session expired" : "NOT AUTHORIZED LOGIN AGAIN" });
  }
};

// Limited token issued to applicants (pending / rejected) for the waiting screen and reapply.
export const authApplicant = async (req, res, next) => {
  try {
    const token = req.headers.apptoken;
    if (!token) return res.status(401).json({ success: false, message: "NOT AUTHORIZED" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "applicant" && decoded.role !== "doctor") {
      return res.status(401).json({ success: false, message: "NOT AUTHORIZED" });
    }
    req.docId = String(decoded.id);
    next();
  } catch {
    res.status(401).json({ success: false, message: "Session expired" });
  }
};

export default authDoctor;
