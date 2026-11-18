import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DoctorContext } from "../../context/DoctorContext";
import { PageLoader } from "../../components/Spinner.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { AppointmentStatus } from "../../components/BookingRow.jsx";
import { Avatar, Button, EmptyState, IconCalendar, ResponsiveTable, Select } from "../../components/ui";
import { formatDate, formatTime } from "../../utils/time.js";

const TABS = [
  ["today", "Today"],
  ["upcoming", "Upcoming"],
  ["past", "Past"],
];
const STATUSES = [
  ["", "All statuses"],
  ["booked", "Booked"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
  ["no_show", "No-show"],
];

const DoctorAppointments = () => {
  const { dToken, appointments, apptMeta, getAppointments, completeAppointment, cancelAppointment, noShowAppointment, appointmentsLoading, processingId } =
    useContext(DoctorContext);
  const [range, setRange] = useState("today");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const refresh = () => getAppointments({ range, status, page });
  useEffect(() => {
    if (dToken) refresh();
  }, [dToken, range, status, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = [
    {
      key: "patient",
      label: "Patient",
      render: (item) => (
        <span className="inline-flex min-w-0 items-center gap-2.5">
          <Avatar src={item.patient?.image || item.userData?.img} name={item.patient?.name || "Unknown"} size={32} />
          <span className="min-w-0">
            {item.patient ? (
              <Link to={`/doctor-patients/${item.patient._id}`} className="block truncate font-medium hover:underline">
                {item.patient.name}
              </Link>
            ) : (
              <span className="block truncate font-medium">{item.userData?.name || "Unknown"}</span>
            )}
            {item.patient?.phone && (
              <a href={`tel:${item.patient.phone}`} className="link block text-xs">
                {item.patient.phone}
              </a>
            )}
          </span>
        </span>
      ),
    },
    {
      key: "date",
      label: "Date & Time",
      render: (item) => (
        <span>
          {formatDate(item.startAt)}, <span className="font-medium">{formatTime(item.startAt)}</span>
        </span>
      ),
    },
    { key: "fee", label: "Fee", render: (item) => <span className="font-semibold">{item.amount} rs</span> },
    {
      key: "action",
      label: "Status / Action",
      render: (item) => (
        <AppointmentStatus
          item={item}
          processingId={processingId}
          onCancel={(id) => cancelAppointment(id, refresh)}
          onComplete={(id) => completeAppointment(id, refresh)}
          onNoShow={(id) => noShowAppointment(id, refresh)}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Appointments" subtitle="Complete sessions, mark no-shows or cancel bookings." />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="flex gap-2" role="tablist" aria-label="Range">
          {TABS.map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={range === k}
              className={`chip ${range === k ? "active" : ""}`}
              onClick={() => {
                setRange(k);
                setPage(1);
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-44"
        >
          {STATUSES.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>
      </div>
      {appointmentsLoading && appointments.length === 0 ? (
        <PageLoader text="Loading appointments..." />
      ) : appointments.length === 0 ? (
        <EmptyState icon={<IconCalendar />} text="No appointments here." />
      ) : (
        <>
          <ResponsiveTable
            columns={columns}
            rows={appointments}
            rowKey={(r) => r._id}
            template="2.2fr 1.8fr 0.8fr 1.6fr"
            className={`anim-fade-up ${appointmentsLoading ? "opacity-60" : ""}`}
          />
          {apptMeta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-small">
              <Button variant="outline" size="sm" disabled={page <= 1 || appointmentsLoading} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span>
                Page {apptMeta.page} of {apptMeta.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= apptMeta.totalPages || appointmentsLoading} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DoctorAppointments;
