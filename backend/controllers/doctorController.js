import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import doctorModel, { DOCTOR_PRIVATE_FIELDS, DOCTOR_PUBLIC_FIELDS } from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import userModel from "../models/userModel.js";
import {
  listSlots, todayInClinic, validateWeeklyHours, fitsSchedule, inTimeOff, CLINIC_TZ,
} from "../services/scheduling.js";
import { appointmentView, cancelAppointment, patientView, PATIENT_FIELDS } from "../services/appointments.js";
import { escapeRegex } from "../services/security.js";

const fail = (res, message, status = 200, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const isId = (id) => mongoose.isValidObjectId(id);
const PAGE_SIZE = 20;

//CHANGE AVAILABILTY (admin) — unchanged behaviour: toggles Active / Not active
const changeAvailability = async (req, res) => {
  try {
    const { docId } = req.body;
    if (!isId(docId)) return fail(res, "Doctor not found");
    const docData = await doctorModel.findById(docId).select("available");
    if (!docData) return fail(res, "Doctor not found");
    await doctorModel.findByIdAndUpdate(docId, { available: !docData.available });
    res.json({ success: true, message: "Availability Changed" });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

// PUBLIC doctor list: approved doctors only, public fields only
const doctorList = async (req, res) => {
  try {
    const doctors = await doctorModel.find({ status: "approved" }).select(DOCTOR_PUBLIC_FIELDS).lean();
    res.json({ success: true, doctors });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

// PUBLIC GET /api/doctor/:docId/slots?from=YYYY-MM-DD&days=7
const doctorSlots = async (req, res) => {
  try {
    const { docId } = req.params;
    if (!isId(docId)) return fail(res, "Doctor not found", 404);
    const doc = await doctorModel.findOne({ _id: docId, status: "approved" }).lean();
    if (!doc) return fail(res, "Doctor not found", 404);
    if (!doc.available) return res.json({ success: false, code: "NOT_AVAILABLE", message: "Doctor is not taking appointments right now", days: [] });
    const data = await listSlots(doc, req.query.from, req.query.days || 7);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

/** Mongo filter for range=today|upcoming|past in CLINIC_TZ. */
function rangeFilter(range) {
  const today = todayInClinic();
  const start = today.toJSDate();
  const end = today.plus({ days: 1 }).toJSDate();
  if (range === "today") return { startAt: { $gte: start, $lt: end } };
  if (range === "upcoming") return { startAt: { $gte: end } };
  if (range === "past") return { startAt: { $lt: start } };
  return {};
}

// GET /api/doctor/appointments?range=today|upcoming|past&status=&page=
const appointmentsDoctor = async (req, res) => {
  try {
    const docId = req.docId;
    const { range, status } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const filter = { docId, ...rangeFilter(range) };
    if (status && ["booked", "completed", "cancelled", "no_show"].includes(status)) filter.status = status;
    const sort = range === "past" || !range ? { startAt: -1 } : { startAt: 1 };
    const [items, total] = await Promise.all([
      appointmentModel.find(filter).sort(sort).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).populate("userId", PATIENT_FIELDS),
      appointmentModel.countDocuments(filter),
    ]);
    res.json({
      success: true,
      appointments: items.map((a) => appointmentView(a)),
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      timezone: CLINIC_TZ(),
    });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

async function ownAppointment(req) {
  const { appointmentId } = req.body;
  if (!isId(appointmentId)) return null;
  const a = await appointmentModel.findById(appointmentId);
  return a && String(a.docId) === req.docId ? a : null;
}

// API TO MARK APPOINTMENT COMPLETED (only after it started)
const appointmentComplete = async (req, res) => {
  try {
    const a = await ownAppointment(req);
    if (!a) return fail(res, "Operation Failed", 404);
    if (a.status !== "booked") return fail(res, "Only booked appointments can be completed");
    if (a.startAt.getTime() > Date.now()) return fail(res, "You can complete an appointment only after it starts");
    await appointmentModel.updateOne({ _id: a._id, status: "booked" }, { $set: { status: "completed", isActive: true, completedAt: new Date() } });
    res.json({ success: true, message: "Appointment Completed" });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

// API TO MARK NO-SHOW (only after it started)
const appointmentNoShow = async (req, res) => {
  try {
    const a = await ownAppointment(req);
    if (!a) return fail(res, "Operation Failed", 404);
    if (a.status !== "booked") return fail(res, "Only booked appointments can be marked as no-show");
    if (a.startAt.getTime() > Date.now()) return fail(res, "You can mark a no-show only after the start time");
    await appointmentModel.updateOne({ _id: a._id, status: "booked" }, { $set: { status: "no_show", isActive: false } });
    res.json({ success: true, message: "Marked as no-show" });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

//API TO CANCEL APPOINTMENT (doctor: any time while booked)
const appointmentCancel = async (req, res) => {
  try {
    const a = await ownAppointment(req);
    if (!a) return fail(res, "Operation Failed", 404);
    const updated = await cancelAppointment(a._id, "doctor", String(req.body.reason || "Cancelled by the doctor").slice(0, 300));
    if (!updated) return fail(res, "Only booked appointments can be cancelled");
    res.json({ success: true, message: "Appointment Cancelled" });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

// DASHBOARD: today's schedule + counts
const doctorDashboard = async (req, res) => {
  try {
    const docId = new mongoose.Types.ObjectId(req.docId);
    const today = todayInClinic();
    const weekStart = today.startOf("week");
    const weekEnd = weekStart.plus({ weeks: 1 });
    const [todayList, weekCount, agg, patients] = await Promise.all([
      appointmentModel.find({ docId, startAt: { $gte: today.toJSDate(), $lt: today.plus({ days: 1 }).toJSDate() } }).sort({ startAt: 1 }).populate("userId", PATIENT_FIELDS),
      appointmentModel.countDocuments({ docId, isActive: true, startAt: { $gte: weekStart.toJSDate(), $lt: weekEnd.toJSDate() } }),
      appointmentModel.aggregate([
        { $match: { docId } },
        { $group: { _id: "$status", n: { $sum: 1 }, amount: { $sum: "$amount" } } },
      ]),
      appointmentModel.distinct("userId", { docId }),
    ]);
    const by = Object.fromEntries(agg.map((g) => [g._id, g]));
    const next = await appointmentModel
      .findOne({ docId, status: "booked", startAt: { $gte: new Date(Date.now() - 30 * 60000) } })
      .sort({ startAt: 1 })
      .populate("userId", PATIENT_FIELDS);
    const latest = await appointmentModel.find({ docId }).sort({ date: -1 }).limit(5).populate("userId", PATIENT_FIELDS);

    res.json({
      success: true,
      dashData: {
        earnings: by.completed?.amount || 0,
        appointments: agg.reduce((s, g) => s + g.n, 0),
        completed: by.completed?.n || 0,
        patients: patients.length,
        todayCount: todayList.filter((a) => a.isActive).length,
        weekCount,
        today: todayList.map((a) => appointmentView(a)),
        next: next ? appointmentView(next) : null,
        latestAppointments: latest.map((a) => appointmentView(a)),
        timezone: CLINIC_TZ(),
      },
    });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

//TO GET THE DOCTOR PROFILE
const doctorProfile = async (req, res) => {
  try {
    const profileData = await doctorModel.findById(req.docId).select(DOCTOR_PRIVATE_FIELDS);
    res.json({ success: true, profileData });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

//API TO UPDATE DOCTOR PROFILE (fee, address, available, phone, photo) — multipart or JSON
const updateDoctorProfile = async (req, res) => {
  try {
    const { fee, available, phone } = req.body;
    let { address } = req.body;
    if (typeof address === "string") {
      try {
        address = JSON.parse(address);
      } catch {
        return fail(res, "Invalid address");
      }
    }
    const update = {};
    if (fee !== undefined && fee !== "") {
      if (isNaN(Number(fee)) || Number(fee) < 0) return fail(res, "Enter a valid fee");
      update.fee = Number(fee);
    }
    if (address && typeof address === "object") update.address = { line1: String(address.line1 || ""), line2: String(address.line2 || "") };
    if (available !== undefined) update.available = available === true || available === "true";
    if (phone !== undefined) {
      if (phone && !/^\+?[0-9 ()-]{7,20}$/.test(String(phone))) return fail(res, "Enter a valid phone number");
      update.phone = String(phone).trim();
    }
    if (req.file) {
      const up = await cloudinary.uploader.upload(req.file.path, { resource_type: "image" });
      update.image = up.secure_url;
      update.imagePublicId = up.public_id;
    }
    await doctorModel.findByIdAndUpdate(req.docId, update);
    res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

// GET /api/doctor/patients?search=&page= — only patients who have/had an appointment with this doctor
const doctorPatients = async (req, res) => {
  try {
    const docId = new mongoose.Types.ObjectId(req.docId);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const search = String(req.query.search || "").trim().slice(0, 80);
    const now = new Date();
    const pipeline = [
      { $match: { docId } },
      {
        $group: {
          _id: "$userId",
          totalAppointments: { $sum: 1 },
          completedVisits: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          lastVisit: { $max: { $cond: [{ $and: [{ $eq: ["$status", "completed"] }] }, "$startAt", null] } },
          nextAppointment: { $min: { $cond: [{ $and: [{ $eq: ["$status", "booked"] }, { $gt: ["$startAt", now] }] }, "$startAt", null] } },
          lastActivity: { $max: "$startAt" },
        },
      },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "u", pipeline: [{ $project: { name: 1, email: 1, phone: 1, gender: 1, dob: 1, img: 1 } }] } },
      { $unwind: "$u" },
    ];
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      pipeline.push({ $match: { $or: [{ "u.name": rx }, { "u.email": rx }, { "u.phone": rx }] } });
    }
    pipeline.push(
      { $sort: { lastActivity: -1 } },
      { $facet: { items: [{ $skip: (page - 1) * PAGE_SIZE }, { $limit: PAGE_SIZE }], total: [{ $count: "n" }] } },
    );
    const [out] = await appointmentModel.aggregate(pipeline);
    const total = out.total[0]?.n || 0;
    res.json({
      success: true,
      patients: out.items.map((p) => ({
        ...patientView(p.u),
        totalAppointments: p.totalAppointments,
        completedVisits: p.completedVisits,
        lastVisit: p.lastVisit,
        nextAppointment: p.nextAppointment,
      })),
      page,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

// GET /api/doctor/patients/:userId — 403 unless this patient has an appointment with this doctor
const doctorPatient = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isId(userId)) return fail(res, "Not allowed", 403);
    const appts = await appointmentModel.find({ docId: req.docId, userId }).sort({ startAt: -1 });
    if (appts.length === 0) return fail(res, "Not allowed", 403);
    const user = await userModel.findById(userId).select(PATIENT_FIELDS).lean();
    if (!user) return fail(res, "Patient not found", 404);
    const patient = patientView(user);
    res.json({ success: true, patient, appointments: appts.map((a) => appointmentView(a, { patient })) });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

const scheduleView = (d) => ({
  timezone: CLINIC_TZ(),
  slotMinutes: d.slotMinutes,
  bufferMinutes: d.bufferMinutes,
  weeklyHours: d.weeklyHours,
  timeOff: [...(d.timeOff || [])].sort((a, b) => new Date(a.startAt) - new Date(b.startAt)),
  bookingWindowDays: d.bookingWindowDays,
  minLeadMinutes: d.minLeadMinutes,
});

/** Future active bookings that fall outside the (new) schedule. Bookings are never deleted. */
async function outsideScheduleWarnings(doc) {
  const future = await appointmentModel
    .find({ docId: doc._id, status: "booked", startAt: { $gt: new Date() } })
    .sort({ startAt: 1 })
    .populate("userId", "name");
  return future
    .filter((a) => !fitsSchedule(doc, a.startAt, a.endAt))
    .map((a) => {
      const v = appointmentView(a);
      return { _id: v._id, startAt: v.startAt, dateLabel: v.dateLabel, timeLabel: v.timeLabel, patientName: v.patient?.name || "" };
    });
}

// GET /api/doctor/schedule
const getSchedule = async (req, res) => {
  try {
    const d = await doctorModel.findById(req.docId).lean();
    res.json({ success: true, schedule: scheduleView(d), warnings: await outsideScheduleWarnings(d) });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

// PUT /api/doctor/schedule
const updateSchedule = async (req, res) => {
  try {
    const { weeklyHours, slotMinutes, bufferMinutes, bookingWindowDays, minLeadMinutes } = req.body;
    const update = {};
    if (weeklyHours !== undefined) {
      const { error, value } = validateWeeklyHours(weeklyHours);
      if (error) return fail(res, error, 400);
      update.weeklyHours = value;
    }
    const num = (v, min, max, name) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${name} must be a whole number between ${min} and ${max}`);
      return n;
    };
    try {
      if (slotMinutes !== undefined) update.slotMinutes = num(slotMinutes, 5, 240, "Slot length");
      if (bufferMinutes !== undefined) update.bufferMinutes = num(bufferMinutes, 0, 120, "Buffer");
      if (bookingWindowDays !== undefined) update.bookingWindowDays = num(bookingWindowDays, 1, 90, "Booking window");
      if (minLeadMinutes !== undefined) update.minLeadMinutes = num(minLeadMinutes, 0, 10080, "Minimum notice");
    } catch (e) {
      return fail(res, e.message, 400);
    }
    const d = await doctorModel.findByIdAndUpdate(req.docId, { $set: update }, { new: true }).lean();
    const warnings = await outsideScheduleWarnings(d);
    res.json({
      success: true,
      message: warnings.length ? `Schedule saved. ${warnings.length} booking(s) now fall outside your hours — they were kept.` : "Schedule saved",
      schedule: scheduleView(d),
      warnings,
    });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

// POST /api/doctor/time-off {startAt, endAt, reason}
const addTimeOff = async (req, res) => {
  try {
    const startAt = new Date(req.body.startAt);
    const endAt = new Date(req.body.endAt);
    if (isNaN(startAt) || isNaN(endAt)) return fail(res, "Start and end are required", 400);
    if (endAt <= startAt) return fail(res, "End must be after start", 400);
    if (endAt < new Date()) return fail(res, "Time off must be in the future", 400);
    const reason = String(req.body.reason || "").slice(0, 200);
    const d = await doctorModel.findByIdAndUpdate(req.docId, { $push: { timeOff: { startAt, endAt, reason } } }, { new: true }).lean();
    const clashes = await appointmentModel.countDocuments({ docId: d._id, status: "booked", startAt: { $lt: endAt }, endAt: { $gt: startAt } });
    res.json({
      success: true,
      message: clashes ? `Time off added. ${clashes} existing booking(s) overlap it — they were kept.` : "Time off added",
      schedule: scheduleView(d),
      warnings: await outsideScheduleWarnings(d),
    });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

// DELETE /api/doctor/time-off/:id
const deleteTimeOff = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, "Not found", 404);
    const d = await doctorModel.findByIdAndUpdate(req.docId, { $pull: { timeOff: { _id: req.params.id } } }, { new: true }).lean();
    res.json({ success: true, message: "Time off removed", schedule: scheduleView(d), warnings: await outsideScheduleWarnings(d) });
  } catch (error) {
    console.error(error);
    fail(res, error.message);
  }
};

export {
  changeAvailability,
  doctorList,
  doctorSlots,
  appointmentsDoctor,
  appointmentCancel,
  appointmentComplete,
  appointmentNoShow,
  doctorDashboard,
  doctorProfile,
  updateDoctorProfile,
  doctorPatients,
  doctorPatient,
  getSchedule,
  updateSchedule,
  addTimeOff,
  deleteTimeOff,
  inTimeOff,
};
