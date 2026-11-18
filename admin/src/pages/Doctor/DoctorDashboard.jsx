import { useContext, useEffect } from "react";
import { Link } from "react-router-dom";
import { DoctorContext } from "../../context/DoctorContext";
import { PageLoader } from "../../components/Spinner.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { AppointmentStatus } from "../../components/BookingRow.jsx";
import { Avatar, Button, Card, EmptyState, IconCalendar, IconCheck, IconClock, IconMail, IconPhone, IconUsers, IconWallet, Reveal, StatCard } from "../../components/ui";
import { formatDate, formatTime } from "../../utils/time.js";

const Contact = ({ patient }) => (
  <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
    {patient?.phone && (
      <a href={`tel:${patient.phone}`} className="link inline-flex items-center gap-1">
        <IconPhone size={14} /> {patient.phone}
      </a>
    )}
    {patient?.email && (
      <a href={`mailto:${patient.email}`} className="link inline-flex min-w-0 items-center gap-1 break-all">
        <IconMail size={14} /> {patient.email}
      </a>
    )}
  </span>
);

const DoctorDashboard = () => {
  const { dashData, getDashData, dToken, completeAppointment, cancelAppointment, noShowAppointment, dashLoading, processingId } =
    useContext(DoctorContext);

  useEffect(() => {
    if (dToken) getDashData();
  }, [dToken]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!dashData) {
    return dashLoading ? <PageLoader text="Loading dashboard..." /> : <EmptyState text="Could not load the dashboard." />;
  }

  const next = dashData.next;
  const actions = {
    processingId,
    onCancel: (id) => cancelAppointment(id, getDashData),
    onComplete: (id) => completeAppointment(id, getDashData),
    onNoShow: (id) => noShowAppointment(id, getDashData),
  };

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Today, ${formatDate(new Date())}`} />
      <Reveal stagger className="grid grid-cols-[repeat(auto-fit,minmax(min(12rem,100%),1fr))] gap-4">
        <StatCard icon={<IconClock />} value={dashData.todayCount} label="Today" />
        <StatCard icon={<IconCalendar />} value={dashData.weekCount} label="This week" tone="accent" />
        <StatCard icon={<IconCheck />} value={dashData.completed} label="Completed" tone="warm" />
        <StatCard icon={<IconWallet />} value={`${dashData.earnings} rs`} label="Earnings" />
        <StatCard icon={<IconUsers />} value={dashData.patients} label="Patients" tone="accent" />
      </Reveal>

      {next && (
        <Card className="anim-fade-up mt-6 border-brand/40 bg-brand-soft p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-strong">Next appointment</p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <Avatar src={next.patient?.image} name={next.patient?.name} size={48} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-h3 font-semibold">{next.patient?.name || "Patient"}</p>
              <p className="text-small text-ink-muted">
                {formatDate(next.startAt)} · {formatTime(next.startAt)}
              </p>
              <Contact patient={next.patient} />
            </div>
          </div>
        </Card>
      )}

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between gap-2.5 border-b border-line bg-surface-2 px-4 py-4 sm:px-6">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <IconClock size={18} className="text-brand" /> Today&apos;s schedule
          </h2>
          <Button as={Link} to="/doctor-appointments" variant="ghost" size="sm">
            All appointments
          </Button>
        </div>
        {dashData.today.length === 0 ? (
          <p className="py-10 text-center text-small text-ink-subtle">No appointments today.</p>
        ) : (
          <ol className="divide-y divide-line">
            {dashData.today.map((a) => {
              const isNext = next && next._id === a._id;
              return (
                <li key={a._id} className={`grid gap-3 px-4 py-4 sm:grid-cols-[5.5rem_1fr_auto] sm:items-center sm:px-6 ${isNext ? "bg-brand-soft/50" : ""}`}>
                  <p className="font-display text-h3 font-semibold tabular-nums">{formatTime(a.startAt)}</p>
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar src={a.patient?.image} name={a.patient?.name} size={40} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate font-medium">
                        {a.patient ? (
                          <Link to={`/doctor-patients/${a.patient._id}`} className="hover:underline">
                            {a.patient.name}
                          </Link>
                        ) : (
                          "Unknown"
                        )}
                        {isNext && <span className="badge badge-brand">Next</span>}
                      </p>
                      <Contact patient={a.patient} />
                    </div>
                  </div>
                  <AppointmentStatus item={a} {...actions} />
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
};

export default DoctorDashboard;
