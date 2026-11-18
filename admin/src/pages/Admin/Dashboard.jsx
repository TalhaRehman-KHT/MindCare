import { useContext, useEffect } from "react";
import { Link } from "react-router-dom";
import { AdminContext } from "../../context/AdminContext.jsx";
import { PageLoader } from "../../components/Spinner.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import LatestBookings from "../../components/LatestBookings.jsx";
import { Button, Card, EmptyState, IconCalendar, IconShield, IconStethoscope, IconUsers, Reveal, StatCard } from "../../components/ui";

const Dashboard = () => {
  const { aToken, getDashData, cancelAppointment, dashData, dashLoading, processingId } = useContext(AdminContext);

  // cancel, then refresh the dashboard numbers
  const cancelAndRefresh = async (id) => {
    await cancelAppointment(id);
    getDashData();
  };

  useEffect(() => {
    if (aToken) getDashData();
  }, [aToken]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!dashData) {
    return dashLoading ? <PageLoader text="Loading dashboard..." /> : <EmptyState text="Could not load the dashboard." />;
  }

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of doctors, bookings and patients." />
      {dashData.pendingRequests > 0 && (
        <Card className="anim-fade-up mb-5 flex flex-wrap items-center justify-between gap-3 border-warn/40 bg-warn-soft p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <IconShield className="text-warn" />
            <p className="font-medium">
              {dashData.pendingRequests} doctor application{dashData.pendingRequests === 1 ? "" : "s"} waiting for review
            </p>
          </div>
          <Button as={Link} to="/doctor-requests" size="sm">
            Review requests
          </Button>
        </Card>
      )}
      <Reveal stagger className="grid grid-cols-[repeat(auto-fit,minmax(min(13rem,100%),1fr))] gap-4">
        <StatCard icon={<IconStethoscope />} value={dashData.doctors} label="Doctors" />
        <StatCard icon={<IconCalendar />} value={dashData.appointments} label="Appointments" tone="accent" />
        <StatCard icon={<IconUsers />} value={dashData.patients} label="Patients" tone="warm" />
        <StatCard icon={<IconShield />} value={dashData.pendingRequests || 0} label="Doctor requests" />
      </Reveal>
      <LatestBookings items={dashData.latestAppointments} personKey="docData" processingId={processingId} onCancel={cancelAndRefresh} />
    </div>
  );
};

export default Dashboard;
