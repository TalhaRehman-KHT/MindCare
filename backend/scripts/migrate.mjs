// Scheduling + doctor-approval migration. Idempotent.
//   node scripts/migrate.mjs           # dry run (default): prints what would change
//   node scripts/migrate.mjs --apply   # writes, then builds the unique indexes
// Steps:
//   1. doctors without status -> "approved", isEmailVerified, default schedule, lowercase email
//   2. appointments with slotDate+slotTime and no startAt -> startAt/endAt (CLINIC_TZ), status/isActive,
//      string ids -> ObjectId, display snapshots trimmed (old snapshots carried password hashes)
//   3. duplicate ACTIVE (docId,startAt) / (userId,startAt): keep earliest booking, cancel the rest
//   4. (apply only) syncIndexes for doctor + appointment models
// slots_booked is left in the DB, unused.
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { DateTime } from "luxon";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const APPLY = process.argv.includes("--apply");
const TZ = process.env.CLINIC_TZ || "Asia/Karachi";
const DEFAULT_HOURS = {
  mon: [{ start: "10:00", end: "21:00" }],
  tue: [{ start: "10:00", end: "21:00" }],
  wed: [{ start: "10:00", end: "21:00" }],
  thu: [{ start: "10:00", end: "21:00" }],
  fri: [{ start: "10:00", end: "21:00" }],
  sat: [{ start: "10:00", end: "21:00" }],
  sun: [],
};
const DUP_REASON = "duplicate booking (migration)";

/** "10:00" | "10:00 AM" | "10:00 am" | "10:00 a.m." | "10:00 PM" -> {h, m} or null */
export function parseSlotTime(raw) {
  const s = String(raw || "").replace(/[  ]/g, " ").trim().toLowerCase().replace(/\./g, "");
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (min > 59) return null;
  if (m[3]) {
    if (h < 1 || h > 12) return null;
    if (m[3] === "am" && h === 12) h = 0;
    if (m[3] === "pm" && h !== 12) h += 12;
  } else if (h > 23) return null;
  return { h, m: min };
}

/** "18_11_2026" -> {y, mo, d} or null */
export function parseSlotDate(raw) {
  const m = String(raw || "").match(/^(\d{1,2})_(\d{1,2})_(\d{4})$/);
  return m ? { d: Number(m[1]), mo: Number(m[2]), y: Number(m[3]) } : null;
}

const toOid = (v) => (v instanceof mongoose.Types.ObjectId ? v : mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(String(v)) : v);
const pick = (o = {}, keys) => Object.fromEntries(keys.filter((k) => o?.[k] !== undefined).map((k) => [k, o[k]]));

async function main() {
  await mongoose.connect(`${process.env.MONGODB_URL}MindCare`);
  const db = mongoose.connection.db;
  const doctors = db.collection("doctors");
  const appts = db.collection("appointments");
  const users = db.collection("users");
  const summary = { mode: APPLY ? "APPLY" : "DRY-RUN", timezone: TZ };

  // ---------- 1. doctors ----------
  const legacyDocs = await doctors.find({ status: { $exists: false } }).toArray();
  const docOps = [];
  const emailCollisions = [];
  for (const d of legacyDocs) {
    const $set = { status: "approved", isEmailVerified: true, approvedAt: d.approvedAt || new Date(), approvedBy: "migration" };
    const lower = String(d.email || "").trim().toLowerCase();
    if (lower !== d.email) {
      const clash = await doctors.findOne({ email: lower, _id: { $ne: d._id } });
      if (clash) emailCollisions.push(d.email);
      else $set.email = lower;
    }
    if (await users.findOne({ email: new RegExp(`^${lower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })) emailCollisions.push(`${lower} (also a patient)`);
    if (!d.weeklyHours) $set.weeklyHours = DEFAULT_HOURS;
    if (d.slotMinutes === undefined) $set.slotMinutes = 30;
    if (d.bufferMinutes === undefined) $set.bufferMinutes = 0;
    if (d.timeOff === undefined) $set.timeOff = [];
    if (d.bookingWindowDays === undefined) $set.bookingWindowDays = 14;
    if (d.minLeadMinutes === undefined) $set.minLeadMinutes = 60;
    if (d.phone === undefined) $set.phone = "";
    if (d.licenseNumber === undefined) $set.licenseNumber = "";
    docOps.push({ updateOne: { filter: { _id: d._id }, update: { $set } } });
  }
  const maskE = (e) => String(e).replace(/^(.).*?@/, "$1***@");
  summary.doctors = { total: await doctors.countDocuments(), toApprove: legacyDocs.length, emailCollisions: emailCollisions.map(maskE) };
  const slotMinutesByDoc = Object.fromEntries((await doctors.find({}).project({ slotMinutes: 1 }).toArray()).map((d) => [String(d._id), d.slotMinutes || 30]));

  // ---------- 2. appointments ----------
  const legacy = await appts.find({ startAt: { $exists: false } }).toArray();
  const formats = {};
  const unparseable = [];
  const converted = []; // { _id, $set }
  for (const a of legacy) {
    const t = parseSlotTime(a.slotTime);
    const dt = parseSlotDate(a.slotDate);
    const fmt = String(a.slotTime || "").replace(/\d/g, "9").replace(/[  ]/g, "␣");
    formats[fmt] = (formats[fmt] || 0) + 1;
    const status = a.cancelled ? "cancelled" : a.isCompleted ? "completed" : "booked";
    const base = {
      userId: toOid(a.userId),
      docId: toOid(a.docId),
      userData: pick(a.userData, ["name", "img"]),
      docData: pick(a.docData, ["name", "speciality", "image", "fee", "address"]),
      cancelledBy: null,
      cancelReason: "",
    };
    if (!t || !dt) {
      const fallback = new Date(a.date || Date.now());
      unparseable.push({ _id: String(a._id), slotDate: a.slotDate, slotTime: a.slotTime });
      converted.push({
        _id: a._id,
        $set: { ...base, startAt: fallback, endAt: fallback, status: "cancelled", isActive: false, cancelReason: "unparseable legacy slot (migration)", cancelledAt: new Date() },
      });
      continue;
    }
    const start = DateTime.fromObject({ year: dt.y, month: dt.mo, day: dt.d, hour: t.h, minute: t.m }, { zone: TZ });
    const mins = slotMinutesByDoc[String(a.docId)] || 30;
    converted.push({
      _id: a._id,
      date: a.date || 0,
      $set: {
        ...base,
        startAt: start.toUTC().toJSDate(),
        endAt: start.plus({ minutes: mins }).toUTC().toJSDate(),
        status,
        isActive: status === "booked" || status === "completed",
        ...(status === "cancelled" ? { cancelledAt: new Date(a.date || Date.now()) } : {}),
        ...(status === "completed" ? { completedAt: start.plus({ minutes: mins }).toUTC().toJSDate() } : {}),
      },
    });
  }
  // already-migrated docs that still carry a fat snapshot (e.g. password hash in userData)
  const fat = await appts.find({ startAt: { $exists: true }, $or: [{ "userData.password": { $exists: true } }, { "docData.password": { $exists: true } }] }).toArray();
  for (const a of fat) {
    converted.push({ _id: a._id, $set: { userData: pick(a.userData, ["name", "img"]), docData: pick(a.docData, ["name", "speciality", "image", "fee", "address"]) } });
  }

  // ---------- 3. duplicates (over migrated + already-new active appointments) ----------
  const active = [];
  for (const c of converted) if (c.$set.isActive) active.push({ _id: c._id, docId: String(c.$set.docId), userId: String(c.$set.userId), startAt: c.$set.startAt.getTime(), date: c.date });
  const existingActive = await appts.find({ startAt: { $exists: true }, isActive: true }).project({ docId: 1, userId: 1, startAt: 1, date: 1 }).toArray();
  const convertedIds = new Set(converted.map((c) => String(c._id)));
  for (const a of existingActive) if (!convertedIds.has(String(a._id))) active.push({ _id: a._id, docId: String(a.docId), userId: String(a.userId), startAt: new Date(a.startAt).getTime(), date: a.date || 0 });

  const losers = new Map(); // _id -> reason
  const detail = [];
  for (const key of ["docId", "userId"]) {
    const groups = {};
    for (const a of active) {
      if (losers.has(String(a._id))) continue;
      (groups[`${a[key]}|${a.startAt}`] ||= []).push(a);
    }
    for (const [k, g] of Object.entries(groups)) {
      if (g.length < 2) continue;
      g.sort((x, y) => x.date - y.date || String(x._id).localeCompare(String(y._id)));
      const [keep, ...rest] = g;
      rest.forEach((r) => losers.set(String(r._id), key));
      detail.push({ by: key, slot: new Date(Number(k.split("|")[1])).toISOString(), kept: String(keep._id), cancelled: rest.map((r) => String(r._id)) });
    }
  }

  summary.appointments = {
    total: await appts.countDocuments(),
    legacyToConvert: legacy.length,
    slotTimeFormats: formats,
    unparseable: unparseable.length,
    unparseableSamples: unparseable.slice(0, 5),
    snapshotsTrimmed: legacy.length + fat.length,
    byStatus: converted.reduce((m, c) => (c.$set.status ? ((m[c.$set.status] = (m[c.$set.status] || 0) + 1), m) : m), {}),
    duplicateGroups: detail.length,
    duplicatesToCancel: losers.size,
    duplicateDetail: detail.slice(0, 20),
  };

  // ---------- write ----------
  if (APPLY) {
    if (docOps.length) await doctors.bulkWrite(docOps);
    const ops = converted.map((c) => {
      const $set = { ...c.$set };
      if (losers.has(String(c._id))) Object.assign($set, { status: "cancelled", isActive: false, cancelledBy: "admin", cancelReason: DUP_REASON, cancelledAt: new Date() });
      return { updateOne: { filter: { _id: c._id }, update: { $set } } };
    });
    // duplicates among appointments that were already in the new format
    for (const id of losers.keys()) {
      if (!convertedIds.has(id)) {
        ops.push({ updateOne: { filter: { _id: new mongoose.Types.ObjectId(id) }, update: { $set: { status: "cancelled", isActive: false, cancelledBy: "admin", cancelReason: DUP_REASON, cancelledAt: new Date() } } } });
      }
    }
    if (ops.length) await appts.bulkWrite(ops, { ordered: false });
    const { default: appointmentModel } = await import("../models/appointmentModel.js");
    const { default: doctorModel } = await import("../models/doctorModel.js");
    summary.indexes = {};
    for (const m of [doctorModel, appointmentModel]) {
      try {
        await m.syncIndexes();
        summary.indexes[m.modelName] = (await m.listIndexes()).map((i) => i.name);
      } catch (e) {
        summary.indexes[m.modelName] = `FAILED: ${e.message}`;
      }
    }
    summary.writes = { doctors: docOps.length, appointments: ops.length };
  }

  console.log(JSON.stringify(summary, null, 2));
  await mongoose.disconnect();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(async (e) => {
    console.error("MIGRATION FAILED:", e.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}
