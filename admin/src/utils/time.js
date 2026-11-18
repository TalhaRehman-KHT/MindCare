// Single place for date/time display. Always formats in the clinic time zone with
// explicit options — never toLocaleTimeString([]) (locale-dependent output).
export const CLINIC_TZ = import.meta.env.VITE_CLINIC_TZ || "Asia/Karachi";

const timeFmt = new Intl.DateTimeFormat("en-PK", { timeZone: CLINIC_TZ, hour: "numeric", minute: "2-digit", hour12: true });
const dateFmt = new Intl.DateTimeFormat("en-PK", { timeZone: CLINIC_TZ, weekday: "short", day: "numeric", month: "short", year: "numeric" });
const shortDateFmt = new Intl.DateTimeFormat("en-PK", { timeZone: CLINIC_TZ, weekday: "short", day: "numeric", month: "short" });
const ymdFmt = new Intl.DateTimeFormat("en-CA", { timeZone: CLINIC_TZ, year: "numeric", month: "2-digit", day: "2-digit" });

const toDate = (v) => (v instanceof Date ? v : new Date(v));
const ok = (v) => v && !isNaN(toDate(v));

export const formatTime = (v) => (ok(v) ? timeFmt.format(toDate(v)).replace(/\s?(am|pm)$/i, (m) => m.toUpperCase()) : "");
export const formatDate = (v) => (ok(v) ? dateFmt.format(toDate(v)) : "");
export const formatShortDate = (v) => (ok(v) ? shortDateFmt.format(toDate(v)) : "");
export const formatDateTime = (v) => (ok(v) ? `${formatDate(v)}, ${formatTime(v)}` : "");
/** YYYY-MM-DD of an instant in the clinic time zone. */
export const clinicYmd = (v = new Date()) => ymdFmt.format(toDate(v));

/** Appointment helpers that also understand pre-migration records. */
export const apptDate = (a) => (a?.startAt ? formatDate(a.startAt) : a?.dateLabel || "");
export const apptTime = (a) => (a?.startAt ? formatTime(a.startAt) : a?.timeLabel || "");

export const STATUS_META = {
  booked: { label: "Booked", tone: "brand" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
  no_show: { label: "No-show", tone: "warn" },
};
export const apptStatus = (a) => a?.status || (a?.cancelled ? "cancelled" : a?.isCompleted ? "completed" : "booked");

// Offset (ms) of CLINIC_TZ from UTC at a given instant.
const partsFmt = new Intl.DateTimeFormat("en-US", { timeZone: CLINIC_TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const tzOffset = (ms) => {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000;
};
/** "YYYY-MM-DDTHH:mm" wall-clock time in CLINIC_TZ -> ISO instant (UTC). */
export const clinicLocalToISO = (local) => {
  const m = String(local || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return new Date(guess - tzOffset(guess)).toISOString();
};
