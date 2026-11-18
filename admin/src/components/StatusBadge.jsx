import { Badge } from "./ui";
import { STATUS_META, apptStatus } from "../utils/time.js";

export default function StatusBadge({ item }) {
  const s = STATUS_META[apptStatus(item)] || STATUS_META.booked;
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}
