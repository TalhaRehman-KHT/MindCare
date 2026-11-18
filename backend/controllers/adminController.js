import validator from "validator";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import doctorModel, { DOCTOR_PRIVATE_FIELDS } from "../models/doctorModel.js";
import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointmentModel.js";
import userModel from "../models/userModel.js";
import { emailTaken, normEmail, cloudinaryPublicId } from "../services/security.js";
import { sendMail, templates } from "../services/notify.js";
import { appointmentView, cancelAppointment, cancelFutureForDoctor } from "../services/appointments.js";

const fail = (res, message, status = 200, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const isId = (id) => mongoose.isValidObjectId(id);
export const REMOVAL_REASON = "Doctor no longer with the hospital";

//API FOR ADDING DOCTOR (admin-created doctors are approved + verified immediately)
const addDoctor = async (req, res) => {
  try {
    const { name, password, speciality, degree, experience, about, fee, address, phone, licenseNumber } = req.body;
    const email = normEmail(req.body.email);
    const imageFile = req.file;
    if (!name || !email || !password || !speciality || !degree || !experience || !about || !fee || !address) {
      return fail(res, "Missing Details");
    }
    if (!validator.isEmail(email)) return fail(res, "Enter Valid Email");
    if (password.length < 8) return fail(res, "Please Enter a strong Password");
    if (!imageFile) return fail(res, "Image not uploaded");
    if (await emailTaken(email)) return fail(res, "This email is already registered");

    const hashedPassword = await bcrypt.hash(password, 10);
    const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" });
    await doctorModel.create({
      name,
      email,
      image: imageUpload.secure_url,
      imagePublicId: imageUpload.public_id,
      password: hashedPassword,
      speciality,
      degree,
      experience,
      about,
      fee,
      phone: phone || "",
      licenseNumber: licenseNumber || "",
      address: JSON.parse(address),
      date: Date.now(),
      status: "approved",
      isEmailVerified: true,
      approvedAt: new Date(),
      approvedBy: "admin",
    });
    res.json({ success: true, message: "Doctor Added" });
  } catch (error) {
    console.error(error);
    if (error?.code === 11000) return fail(res, "This email is already registered");
    fail(res, error.message);
  }
};

// API FOR ADMIN LOGIN
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (
      process.env.ADMIN_EMAIL &&
      process.env.ADMIN_PASSWORD &&
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      // Opaque role claim; never put credentials in the token payload
      const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1d" });
      res.json({ success: true, token });
    } else {
      fail(res, "Invalid Credentials");
    }
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

// API TO GET DOCTORS (admin) ?status=approved|removed|all  — with appointment counts
const allDoctors = async (req, res) => {
  try {
    const status = req.query.status || req.body?.status || "approved";
    const filter = status === "all" ? {} : { status };
    const doctors = await doctorModel.find(filter).select(DOCTOR_PRIVATE_FIELDS).sort({ date: -1 }).lean();
    const ids = doctors.map((d) => d._id);
    const counts = await appointmentModel.aggregate([
      { $match: { docId: { $in: ids } } },
      {
        $group: {
          _id: "$docId",
          total: { $sum: 1 },
          future: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "booked"] }, { $gt: ["$startAt", new Date()] }] }, 1, 0] } },
        },
      },
    ]);
    const byId = Object.fromEntries(counts.map((c) => [String(c._id), c]));
    res.json({
      success: true,
      doctors: doctors.map((d) => ({
        ...d,
        totalAppointments: byId[String(d._id)]?.total || 0,
        futureAppointments: byId[String(d._id)]?.future || 0,
      })),
    });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

//API TO GET ALL APPOINTMENTS
const appointmentsAdmin = async (req, res) => {
  try {
    const appointments = await appointmentModel.find({}).sort({ startAt: -1 }).limit(500);
    res.json({ success: true, appointments: appointments.map((a) => appointmentView(a)) });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

//CANCEL APPOINTMENT BY ADMIN (any time while booked)
const appointmentCancel = async (req, res) => {
  try {
    const { appointmentId, reason } = req.body;
    if (!isId(appointmentId)) return fail(res, "Appointment not found", 404);
    const updated = await cancelAppointment(appointmentId, "admin", String(reason || "Cancelled by the hospital").slice(0, 300));
    if (!updated) return fail(res, "Only booked appointments can be cancelled");
    res.json({ success: true, message: "Appointment Cancelled" });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

//ADMIN DASHBOARD API
const adminDashboard = async (req, res) => {
  try {
    const [doctors, patients, appointments, pendingRequests, latest] = await Promise.all([
      doctorModel.countDocuments({ status: "approved" }),
      userModel.countDocuments({}),
      appointmentModel.countDocuments({}),
      doctorModel.countDocuments({ status: "pending", isEmailVerified: true }),
      appointmentModel.find({}).sort({ date: -1 }).limit(5),
    ]);
    res.json({
      success: true,
      dashData: { doctors, appointments, patients, pendingRequests, latestAppointments: latest.map((a) => appointmentView(a)) },
    });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

// GET /api/admin/doctor-requests?status=pending|rejected
const doctorRequests = async (req, res) => {
  try {
    const status = req.query.status === "rejected" ? "rejected" : "pending";
    // only verified applicants are real requests; unverified signups never finished OTP
    const requests = await doctorModel
      .find({ status, isEmailVerified: true })
      .select(DOCTOR_PRIVATE_FIELDS)
      .sort({ appliedAt: -1, date: -1 })
      .lean();
    const pendingCount = await doctorModel.countDocuments({ status: "pending", isEmailVerified: true });
    res.json({ success: true, requests, pendingCount });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

// POST /api/admin/approve-doctor {docId}
const approveDoctor = async (req, res) => {
  try {
    const { docId } = req.body;
    if (!isId(docId)) return fail(res, "Doctor not found", 404);
    const doc = await doctorModel.findOneAndUpdate(
      { _id: docId, status: { $in: ["pending", "rejected"] }, isEmailVerified: true },
      { $set: { status: "approved", approvedAt: new Date(), approvedBy: req.adminId || "admin", rejectionReason: "" } },
      { new: true },
    );
    if (!doc) return fail(res, "Only verified pending applications can be approved");
    sendMail(doc.email, templates.doctorApproved({ name: doc.name }));
    res.json({ success: true, message: `${doc.name} approved` });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

// POST /api/admin/reject-doctor {docId, reason}
const rejectDoctor = async (req, res) => {
  try {
    const { docId } = req.body;
    const reason = String(req.body.reason || "").trim().slice(0, 500);
    if (!reason) return fail(res, "A reason is required", 400);
    if (!isId(docId)) return fail(res, "Doctor not found", 404);
    const doc = await doctorModel.findOneAndUpdate(
      { _id: docId, status: "pending" },
      { $set: { status: "rejected", rejectionReason: reason } },
      { new: true },
    );
    if (!doc) return fail(res, "Only pending applications can be rejected");
    sendMail(doc.email, templates.doctorRejected({ name: doc.name, reason }));
    res.json({ success: true, message: `${doc.name} rejected` });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

// POST /api/admin/remove-doctor {docId, reason} — SOFT delete (doctor left the hospital)
const removeDoctor = async (req, res) => {
  try {
    const { docId } = req.body;
    const reason = String(req.body.reason || "").trim().slice(0, 500);
    if (!isId(docId)) return fail(res, "Doctor not found", 404);
    const doc = await doctorModel.findOneAndUpdate(
      { _id: docId, status: "approved" },
      { $set: { status: "removed", removedAt: new Date(), removedReason: reason, available: false }, $unset: { handoffCodeHash: 1, handoffExpire: 1 } },
      { new: true },
    );
    if (!doc) return fail(res, "Only approved doctors can be removed");
    const cancelled = await cancelFutureForDoctor(doc._id, REMOVAL_REASON);
    sendMail(doc.email, templates.doctorRemoved({ name: doc.name, reason }));
    res.json({ success: true, message: `${doc.name} removed. ${cancelled} upcoming appointment(s) cancelled.`, cancelled });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

// POST /api/admin/delete-doctor {docId} — PERMANENT delete, only when the doctor has zero appointments
const deleteDoctor = async (req, res) => {
  try {
    const { docId } = req.body;
    if (!isId(docId)) return fail(res, "Doctor not found", 404);
    const doc = await doctorModel.findById(docId);
    if (!doc) return fail(res, "Doctor not found", 404);
    const n = await appointmentModel.countDocuments({ docId: doc._id });
    if (n > 0) {
      return fail(res, `This doctor has ${n} appointment(s) on record. Use "Remove from hospital" instead to keep the history.`, 409, { appointments: n });
    }
    await doctorModel.deleteOne({ _id: doc._id });
    const publicId = doc.imagePublicId || cloudinaryPublicId(doc.image);
    if (publicId && /res\.cloudinary\.com/.test(doc.image || "")) {
      cloudinary.uploader.destroy(publicId).catch((e) => console.error("cloudinary destroy:", e.message));
    }
    res.json({ success: true, message: "Doctor permanently deleted" });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

export {
  addDoctor,
  loginAdmin,
  allDoctors,
  appointmentsAdmin,
  appointmentCancel,
  adminDashboard,
  deleteDoctor,
  doctorRequests,
  approveDoctor,
  rejectDoctor,
  removeDoctor,
};
