import BookingRow from "./BookingRow.jsx";
import { Card, IconList } from "./ui";

export default function LatestBookings({ items = [], personKey, ...statusProps }) {
  return (
    <Card className="mt-6 overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-line bg-surface-2 px-4 py-4 sm:px-6">
        <IconList size={18} className="text-brand" />
        <h2 className="text-base font-semibold">Latest Bookings</h2>
      </div>
      {items.length > 0 ? (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <BookingRow key={item._id} item={item} person={item[personKey]} {...statusProps} />
          ))}
        </ul>
      ) : (
        <p className="py-8 text-center text-small text-ink-subtle">No recent bookings</p>
      )}
    </Card>
  );
}
