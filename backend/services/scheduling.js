// Server-side scheduling: the single source of truth for slots.
// Instants are stored in UTC; wall-clock schedules are interpreted in CLINIC_TZ.
import { DateTime } from "luxon";
import appointmentModel from "../models/appointmentModel.js";

export const CLINIC_TZ = () => process.env.CLINIC_TZ || "Asia/Karachi";
export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]; // luxon weekday 1..7
export const USER_CANCEL_MIN_HOURS = 2;

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const toMin = (s) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

export const zoned = (d) => DateTime.fromJSDate(d instanceof Date ? d : new Date(d), { zone: CLINIC_TZ() });
export const todayInClinic = () => DateTime.now().setZone(CLINIC_TZ()).startOf("day");
export const slotLabel = (dt) => dt.setZone(CLINIC_TZ()).toFormat("h:mm a"); // locale-independent

const scheduleOf = (doc) => ({
  slotMinutes: doc.slotMinutes || 30,
  bufferMinutes: doc.bufferMinutes || 0,
  weeklyHours: doc.weeklyHours || {},
  timeOff: doc.timeOff || [],
  bookingWindowDays: doc.bookingWindowDays || 14,
  minLeadMinutes: doc.minLeadMinutes ?? 60,
});

/** All slot start/end pairs (luxon DateTimes) of a doctor's schedule on a given clinic-local day. */
export function daySlots(doc, day /* DateTime at startOf day, CLINIC_TZ */) {
  const s = scheduleOf(doc);
  const ranges = s.weeklyHours?.[DAY_KEYS[day.weekday - 1]] || [];
  const step = s.slotMinutes + s.bufferMinutes;
  const out = [];
  for (const r of ranges) {
    if (!HHMM.test(r.start) || !HHMM.test(r.end)) continue;
    const endMin = toMin(r.end);
    for (let m = toMin(r.start); m + s.slotMinutes <= endMin; m += step) {
      const start = day.plus({ minutes: m });
      out.push({ start, end: start.plus({ minutes: s.slotMinutes }) });
    }
  }
  return out.sort((a, b) => a.start.toMillis() - b.start.toMillis());
}

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;
export const inTimeOff = (doc, startMs, endMs) =>
  (doc.timeOff || []).some((t) => overlaps(startMs, endMs, new Date(t.startAt).getTime(), new Date(t.endAt).getTime()));

/** Public slot listing: weeklyHours - timeOff - active appointments - past/lead time, within the booking window. */
export async function listSlots(doc, fromISO, days = 7) {
  const s = scheduleOf(doc);
  const today = todayInClinic();
  const lastDay = today.plus({ days: s.bookingWindowDays - 1 });
  let from = fromISO ? DateTime.fromISO(fromISO, { zone: CLINIC_TZ() }).startOf("day") : today;
  if (!from.isValid || from < today) from = today;
  const nDays = Math.max(1, Math.min(Number(days) || 7, 31));
  const earliest = DateTime.now().plus({ minutes: s.minLeadMinutes }).toMillis();

  const rangeEnd = from.plus({ days: nDays });
  const booked = await appointmentModel
    .find({ docId: doc._id, isActive: true, startAt: { $gte: from.toJSDate(), $lt: rangeEnd.plus({ hours: 12 }).toJSDate() } })
    .select("startAt endAt")
    .lean();

  const result = [];
  for (let i = 0; i < nDays; i++) {
    const day = from.plus({ days: i });
    if (day > lastDay) break;
    const slots = [];
    for (const { start, end } of daySlots(doc, day)) {
      const sMs = start.toMillis();
      const eMs = end.toMillis();
      if (sMs < earliest) continue; // past or inside lead time
      if (inTimeOff(doc, sMs, eMs)) continue;
      const taken = booked.some((b) => overlaps(sMs, eMs, b.startAt.getTime(), b.endAt.getTime()));
      slots.push({ startAt: start.toUTC().toISO(), endAt: end.toUTC().toISO(), label: slotLabel(start), available: !taken });
    }
    result.push({
      date: day.toISODate(),
      weekday: day.toFormat("ccc"),
      dayLabel: day.toFormat("ccc d LLL"),
      slots,
    });
  }
  return { timezone: CLINIC_TZ(), slotMinutes: s.slotMinutes, bookingWindowDays: s.bookingWindowDays, days: result };
}

/**
 * Validate a requested start instant against the doctor's schedule.
 * Returns { ok:true, start, end } or { ok:false, message }.
 */
export function validateSlot(doc, startAtInput) {
  const s = scheduleOf(doc);
  const startJs = new Date(startAtInput);
  if (!startAtInput || isNaN(startJs)) return { ok: false, message: "Invalid slot time" };
  const start = zoned(startJs);
  const day = start.startOf("day");
  const today = todayInClinic();
  if (start.toMillis() < Date.now()) return { ok: false, message: "This slot is in the past" };
  if (start.toMillis() < Date.now() + s.minLeadMinutes * 60000)
    return { ok: false, message: `Appointments must be booked at least ${s.minLeadMinutes} minutes in advance` };
  if (day > today.plus({ days: s.bookingWindowDays - 1 }))
    return { ok: false, message: `Appointments can only be booked up to ${s.bookingWindowDays} days ahead` };
  const match = daySlots(doc, day).find((x) => x.start.toMillis() === start.toMillis());
  if (!match) return { ok: false, message: "The doctor is not available at this time" };
  if (inTimeOff(doc, match.start.toMillis(), match.end.toMillis()))
    return { ok: false, message: "The doctor is on leave at this time" };
  return { ok: true, start: match.start.toJSDate(), end: match.end.toJSDate() };
}

/** Is an existing booking still inside the doctor's working hours (ignores lead time/window)? */
export function fitsSchedule(doc, startAt, endAt) {
  const start = zoned(startAt);
  const sMs = start.toMillis();
  const eMs = new Date(endAt).getTime();
  const fitsHours = daySlots(doc, start.startOf("day")).some(
    (x) => x.start.toMillis() <= sMs && x.end.toMillis() >= eMs,
  );
  // a booking can also fit a range even if slot length changed: check raw ranges
  const ranges = (doc.weeklyHours?.[DAY_KEYS[start.weekday - 1]] || []).filter((r) => HHMM.test(r.start) && HHMM.test(r.end));
  const day = start.startOf("day");
  const fitsRange = ranges.some(
    (r) => day.plus({ minutes: toMin(r.start) }).toMillis() <= sMs && day.plus({ minutes: toMin(r.end) }).toMillis() >= eMs,
  );
  return (fitsHours || fitsRange) && !inTimeOff(doc, sMs, eMs);
}

/** Validate a weeklyHours object. Returns error string or null; normalizes into `out`. */
export function validateWeeklyHours(weeklyHours) {
  if (!weeklyHours || typeof weeklyHours !== "object") return { error: "weeklyHours is required" };
  const out = {};
  for (const key of DAY_KEYS) {
    const ranges = Array.isArray(weeklyHours[key]) ? weeklyHours[key] : [];
    const clean = [];
    for (const r of ranges) {
      if (!r || !HHMM.test(r.start) || !HHMM.test(r.end)) return { error: `${key}: times must be HH:mm` };
      if (toMin(r.end) <= toMin(r.start)) return { error: `${key}: end time must be after start time` };
      clean.push({ start: r.start, end: r.end });
    }
    clean.sort((a, b) => toMin(a.start) - toMin(b.start));
    for (let i = 1; i < clean.length; i++) {
      if (toMin(clean[i].start) < toMin(clean[i - 1].end)) return { error: `${key}: time ranges overlap` };
    }
    out[key] = clean;
  }
  return { value: out };
}

export const ageFromDob = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d)) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 150 ? age : null;
};

/** Human label for emails, e.g. "Tue 19 Nov 2026, 10:30 AM (Asia/Karachi)". */
export const formatForEmail = (date) => `${zoned(date).toFormat("ccc d LLL yyyy, h:mm a")} (${CLINIC_TZ()})`;
