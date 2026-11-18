import { useContext, useEffect } from "react";
import { AdminContext } from "../../context/AdminContext";
import { PageLoader } from "../../components/Spinner.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { AppointmentStatus } from "../../components/BookingRow.jsx";
import { Avatar, EmptyState, IconCalendar, ResponsiveTable } from "../../components/ui";
import { apptDate, apptTime } from "../../utils/time.js";

const AllAppointments = () => {
  const { aToken, appointments, getAllAppointments, cancelAppointment, appointmentsLoading, processingId } =
    useContext(AdminContext);

  useEffect(() => {
    if (aToken) getAllAppointments();
  }, [aToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // full-page loader only for the first load; refreshes keep the list visible
  if (appointmentsLoading && appointments.length === 0) {
    return <PageLoader text="Loading appointments..." />;
  }

  const columns = [
    { key: "n", label: "#", render: (_, i) => <span className="text-ink-subtle">{i + 1}</span>, className: "max-sm:hidden" },
    {
      key: "patient",
      label: "Patient",
      render: (item) => (
        <span className="inline-flex min-w-0 items-center gap-2.5">
          <Avatar src={item.userData?.img} name={item.userData?.name} size={32} />
          <span className="truncate font-medium">{item.userData?.name}</span>
        </span>
      ),
    },
    { key: "date", label: "Date & Time", render: (item) => `${apptDate(item)}, ${apptTime(item)}` },
    { key: "doctor", label: "Doctor", render: (item) => <span className="truncate">{item.docData?.name}</span> },
    { key: "fee", label: "Fee", render: (item) => <span className="font-semibold">{item.docData?.fee} rs</span> },
    {
      key: "action",
      label: "Action",
      render: (item) => <AppointmentStatus item={item} processingId={processingId} onCancel={cancelAppointment} />,
    },
  ];

  return (
    <div>
      <PageHeader title="All Appointments" subtitle={`${appointments.length} total`} />
      {appointments.length === 0 ? (
        <EmptyState icon={<IconCalendar />} text="No appointments booked yet." />
      ) : (
        <ResponsiveTable
          columns={columns}
          rows={appointments}
          rowKey={(r) => r._id}
          template="2.5rem 2.2fr 1.6fr 1.8fr 0.8fr 1.1fr"
          className="anim-fade-up"
        />
      )}
    </div>
  );
};

export default AllAppointments;
