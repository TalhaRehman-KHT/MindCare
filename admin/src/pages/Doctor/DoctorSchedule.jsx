import { useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { DoctorContext } from "../../context/DoctorContext";
import Spinner, { PageLoader } from "../../components/Spinner.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { Button, Card, EmptyState, IconPlus, IconTrash, Input, Select } from "../../components/ui";
import { CLINIC_TZ, clinicLocalToISO, formatDateTime } from "../../utils/time.js";

const DAYS = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
];
const SLOT_OPTIONS = [15, 20, 30, 45, 60, 90];
const toMin = (s) => (/^\d{2}:\d{2}$/.test(s) ? +s.slice(0, 2) * 60 + +s.slice(3) : NaN);

/** Client-side mirror of the server validation (server is authoritative). */
function dayError(ranges) {
  const sorted = [...ranges].sort((a, b) => toMin(a.start) - toMin(b.start));
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    if (isNaN(toMin(r.start)) || isNaN(toMin(r.end))) return "Enter both times";
    if (toMin(r.end) <= toMin(r.start)) return "End must be after start";
    if (i > 0 && toMin(r.start) < toMin(sorted[i - 1].end)) return "Ranges overlap";
  }
  return "";
}

const Warnings = ({ items }) =>
  items?.length > 0 && (
    <Card className="mb-5 border-warn/40 bg-warn-soft p-4">
      <p className="font-medium">
        {items.length} upcoming booking{items.length === 1 ? "" : "s"} fall outside your hours or inside time off. They were kept — cancel them from Appointments if
        needed.
      </p>
      <ul className="mt-2 list-disc pl-5 text-small text-ink-muted">
        {items.slice(0, 8).map((w) => (
          <li key={w._id}>
            {w.dateLabel} {w.timeLabel} — {w.patientName}
          </li>
        ))}
      </ul>
    </Card>
  );

const DoctorSchedule = () => {
  const { api, errMsg, dToken } = useContext(DoctorContext);
  const [schedule, setSchedule] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [off, setOff] = useState({ start: "", end: "", reason: "" });
  const [addingOff, setAddingOff] = useState(false);
  const [removingOff, setRemovingOff] = useState(null);

  const apply = (d) => {
    if (d.schedule) setSchedule(d.schedule);
    if (d.warnings) setWarnings(d.warnings);
  };

  useEffect(() => {
    if (!dToken) return;
    api("get", "schedule")
      .then((d) => (d.success ? apply(d) : toast.error(d.message)))
      .catch((e) => toast.error(errMsg(e)));
  }, [dToken]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!schedule) return <PageLoader text="Loading schedule..." />;

  const wh = schedule.weeklyHours || {};
  const setDay = (key, ranges) => setSchedule((s) => ({ ...s, weeklyHours: { ...s.weeklyHours, [key]: ranges } }));
  const errors = Object.fromEntries(DAYS.map(([k]) => [k, dayError(wh[k] || [])]));
  const hasErrors = Object.values(errors).some(Boolean);

  const save = async () => {
    if (hasErrors) return toast.error("Fix the highlighted days first");
    setSaving(true);
    try {
      const d = await api("put", "schedule", {
        weeklyHours: wh,
        slotMinutes: Number(schedule.slotMinutes),
        bufferMinutes: Number(schedule.bufferMinutes),
        bookingWindowDays: Number(schedule.bookingWindowDays),
        minLeadMinutes: Number(schedule.minLeadMinutes),
      });
      if (d.success) {
        apply(d);
        (d.warnings?.length ? toast.warn : toast.success)(d.message);
      } else toast.error(d.message);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const addOff = async (e) => {
    e.preventDefault();
    const startAt = clinicLocalToISO(off.start);
    const endAt = clinicLocalToISO(off.end);
    if (!startAt || !endAt) return toast.error("Pick a start and end");
    setAddingOff(true);
    try {
      const d = await api("post", "time-off", { startAt, endAt, reason: off.reason });
      if (d.success) {
        apply(d);
        setOff({ start: "", end: "", reason: "" });
        (d.message.includes("overlap") ? toast.warn : toast.success)(d.message);
      } else toast.error(d.message);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setAddingOff(false);
    }
  };

  const removeOff = async (id) => {
    setRemovingOff(id);
    try {
      const d = await api("delete", `time-off/${id}`);
      if (d.success) {
        apply(d);
        toast.success(d.message);
      } else toast.error(d.message);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setRemovingOff(null);
    }
  };

  const num = (key) => ({ value: schedule[key], onChange: (e) => setSchedule((s) => ({ ...s, [key]: e.target.value })) });

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="My Schedule"
        subtitle={`Patients can book the slots generated from these hours. All times are ${CLINIC_TZ}.`}
        actions={
          <Button onClick={save} loading={saving} disabled={hasErrors}>
            Save schedule
          </Button>
        }
      />
      <Warnings items={warnings} />

      <Card className="p-5 sm:p-6">
        <h2 className="text-h3 font-semibold">Booking rules</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Slot length" {...num("slotMinutes")}>
            {SLOT_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </Select>
          <Input label="Break between slots (min)" type="number" min="0" max="120" {...num("bufferMinutes")} />
          <Input label="Book up to (days ahead)" type="number" min="1" max="90" {...num("bookingWindowDays")} />
          <Input label="Minimum notice (min)" type="number" min="0" max="10080" {...num("minLeadMinutes")} />
        </div>
      </Card>

      <Card className="mt-5 overflow-hidden">
        <div className="border-b border-line bg-surface-2 px-5 py-4">
          <h2 className="text-h3 font-semibold">Weekly hours</h2>
          <p className="text-small text-ink-muted">Add more than one range to a day for breaks (e.g. 10:00–13:00 and 14:00–21:00).</p>
        </div>
        <ul className="divide-y divide-line">
          {DAYS.map(([key, label]) => {
            const ranges = wh[key] || [];
            const open = ranges.length > 0;
            return (
              <li key={key} className="grid gap-3 px-5 py-4 sm:grid-cols-[10rem_1fr] sm:items-start">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 font-medium">
                  <input
                    type="checkbox"
                    className="size-5 accent-(--color-brand)"
                    checked={open}
                    onChange={() => setDay(key, open ? [] : [{ start: "10:00", end: "21:00" }])}
                  />
                  {label}
                </label>
                <div className="grid gap-2">
                  {!open && <p className="py-2.5 text-small text-ink-subtle">Day off</p>}
                  {ranges.map((r, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <Input
                        aria-label={`${label} range ${i + 1} start`}
                        type="time"
                        step="300"
                        value={r.start}
                        onChange={(e) => setDay(key, ranges.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))}
                        className="w-32"
                      />
                      <span className="text-ink-subtle">to</span>
                      <Input
                        aria-label={`${label} range ${i + 1} end`}
                        type="time"
                        step="300"
                        value={r.end}
                        onChange={(e) => setDay(key, ranges.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))}
                        className="w-32"
                      />
                      <Button variant="ghost" size="sm" iconOnly aria-label="Remove range" onClick={() => setDay(key, ranges.filter((_, j) => j !== i))}>
                        <IconTrash size={16} />
                      </Button>
                    </div>
                  ))}
                  {open && (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        className="link inline-flex items-center gap-1 text-small"
                        onClick={() => {
                          const last = ranges[ranges.length - 1];
                          const start = last && toMin(last.end) < 23 * 60 ? last.end : "18:00";
                          const endMin = Math.min(toMin(start) + 60, 23 * 60 + 55);
                          const end = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
                          setDay(key, [...ranges, { start, end }]);
                        }}
                      >
                        <IconPlus size={14} /> Add range
                      </button>
                      {errors[key] && (
                        <span className="field-error" role="alert">
                          {errors[key]}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="mt-5 p-5 sm:p-6">
        <h2 className="text-h3 font-semibold">Time off</h2>
        <p className="text-small text-ink-muted">No slots are offered during time off. Existing bookings are kept and listed above.</p>
        <form onSubmit={addOff} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1.2fr_auto] sm:items-end">
          <Input label="From" type="datetime-local" value={off.start} onChange={(e) => setOff((o) => ({ ...o, start: e.target.value }))} required />
          <Input label="To" type="datetime-local" value={off.end} onChange={(e) => setOff((o) => ({ ...o, end: e.target.value }))} required />
          <Input label="Reason (optional)" value={off.reason} maxLength={200} onChange={(e) => setOff((o) => ({ ...o, reason: e.target.value }))} placeholder="e.g. Conference" />
          <Button type="submit" loading={addingOff} loadingText="Adding...">
            Add
          </Button>
        </form>
        {schedule.timeOff.length === 0 ? (
          <EmptyState className="py-8" text="No time off scheduled." />
        ) : (
          <ul className="mt-5 divide-y divide-line rounded-xl border border-line">
            {schedule.timeOff.map((t) => (
              <li key={t._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-small">
                <div>
                  <p className="font-medium">
                    {formatDateTime(t.startAt)} → {formatDateTime(t.endAt)}
                  </p>
                  {t.reason && <p className="text-ink-subtle">{t.reason}</p>}
                </div>
                {removingOff === t._id ? (
                  <Spinner size="sm" className="text-ink-subtle" />
                ) : (
                  <Button variant="ghost" size="sm" iconOnly aria-label="Remove time off" onClick={() => removeOff(t._id)} disabled={!!removingOff}>
                    <IconTrash size={16} />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default DoctorSchedule;
