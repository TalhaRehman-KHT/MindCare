import Spinner from "./Spinner.jsx";
import StatusBadge from "./StatusBadge.jsx";
import { Avatar, Button, IconCheck, IconX } from "./ui";
import { apptDate, apptStatus, apptTime } from "../utils/time.js";

const started = (item) => item.startAt && new Date(item.startAt).getTime() <= Date.now();

// Status badge or action buttons for an appointment (shared by dashboards + tables).
// Complete / No-show only appear once the appointment has started (server enforces it too).
export const AppointmentStatus = ({ item, processingId, onCancel, onComplete, onNoShow }) => {
  if (apptStatus(item) !== "booked") return <StatusBadge item={item} />;
  if (processingId === item._id)
    return (
      <span className="inline-flex items-center gap-2 text-xs text-ink-subtle">
        <Spinner size="md" /> Please wait...
      </span>
    );
  const canFinish = started(item);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Button
        variant="danger"
        size="sm"
        iconOnly
        onClick={() => !processingId && onCancel(item._id)}
        disabled={!!processingId}
        aria-label="Cancel appointment"
        title="Cancel"
      >
        <IconX size={18} />
      </Button>
      {onComplete && (
        <Button
          variant="secondary"
          size="sm"
          iconOnly
          onClick={() => !processingId && canFinish && onComplete(item._id)}
          disabled={!!processingId || !canFinish}
          aria-label="Mark as completed"
          title={canFinish ? "Complete" : "Available after the start time"}
        >
          <IconCheck size={18} />
        </Button>
      )}
      {onNoShow && canFinish && (
        <Button variant="ghost" size="sm" onClick={() => !processingId && onNoShow(item._id)} disabled={!!processingId} title="Patient did not attend">
          No-show
        </Button>
      )}
    </span>
  );
};

// One row in a "Latest bookings" list.
export default function BookingRow({ person, item, ...statusProps }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-2/60 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar src={person?.image || person?.img} name={person?.name} size={40} />
        <div className="min-w-0 text-small">
          <p className="truncate font-medium">{person?.name || "Unknown"}</p>
          <p className="text-ink-subtle">
            {apptDate(item)} · {apptTime(item)}
          </p>
        </div>
      </div>
      <AppointmentStatus item={item} {...statusProps} />
    </li>
  );
}
