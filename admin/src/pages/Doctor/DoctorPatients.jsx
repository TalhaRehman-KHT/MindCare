import { useContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { DoctorContext } from "../../context/DoctorContext";
import { PageLoader } from "../../components/Spinner.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { Avatar, Button, Card, EmptyState, IconChevronLeft, IconMail, IconPhone, IconSearch, IconUsers, Input } from "../../components/ui";
import { formatDate, formatDateTime, formatTime } from "../../utils/time.js";

const Contact = ({ p }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1 text-small">
    {p.phone ? (
      <a href={`tel:${p.phone}`} className="link inline-flex items-center gap-1.5">
        <IconPhone size={15} /> {p.phone}
      </a>
    ) : (
      <span className="text-ink-subtle">No phone</span>
    )}
    <a href={`mailto:${p.email}`} className="link inline-flex min-w-0 items-center gap-1.5 break-all">
      <IconMail size={15} /> {p.email}
    </a>
  </div>
);

const meta = (p) => [p.gender, p.age != null ? `${p.age} yrs` : ""].filter(Boolean).join(" · ");

function PatientDetail({ userId }) {
  const { api, errMsg } = useContext(DoctorContext);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    api("get", `patients/${userId}`)
      .then((d) => live && (d.success ? setData(d) : setError(d.message)))
      .catch((e) => live && setError(e.response?.status === 403 ? "You can only view patients who booked with you." : errMsg(e)));
    return () => {
      live = false;
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const back = (
    <Button as={Link} to="/doctor-patients" variant="ghost" size="sm" className="mb-4">
      <IconChevronLeft size={16} /> All patients
    </Button>
  );
  if (error) return <div>{back}<EmptyState icon={<IconUsers />} text={error} /></div>;
  if (!data) return <PageLoader text="Loading patient..." />;
  const p = data.patient;
  return (
    <div>
      {back}
      <Card className="anim-fade-up p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar src={p.image} name={p.name} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="text-h2 font-bold">{p.name}</h1>
            {meta(p) && <p className="text-small text-ink-muted">{meta(p)}</p>}
            <div className="mt-2">
              <Contact p={p} />
            </div>
          </div>
        </div>
      </Card>
      <h2 className="mb-3 mt-8 text-h3 font-semibold">Appointment history with you</h2>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
          {data.appointments.map((a) => (
            <li key={a._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="text-small">
                <p className="font-medium">{formatDate(a.startAt)}</p>
                <p className="text-ink-subtle">
                  {formatTime(a.startAt)} · {a.amount} rs{a.cancelReason ? ` · ${a.cancelReason}` : ""}
                </p>
              </div>
              <StatusBadge item={a} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

const DoctorPatients = () => {
  const { userId } = useParams();
  const { api, errMsg, dToken } = useContext(DoctorContext);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // debounce the search box
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (userId || !dToken) return;
    setLoading(true);
    api("get", "patients", undefined, { search: query || undefined, page })
      .then((d) => (d.success ? setData(d) : toast.error(d.message)))
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }, [query, page, userId, dToken]); // eslint-disable-line react-hooks/exhaustive-deps

  if (userId) return <PatientDetail userId={userId} />;

  return (
    <div>
      <PageHeader title="My Patients" subtitle="Patients who have booked with you. Contact details are shown only to you." />
      <div className="relative mb-5 max-w-md">
        <IconSearch size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
        <Input aria-label="Search patients" placeholder="Search by name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} inputClassName="pl-10" />
      </div>
      {loading && !data ? (
        <PageLoader text="Loading patients..." />
      ) : !data || data.patients.length === 0 ? (
        <EmptyState icon={<IconUsers />} text={query ? "No patients match your search." : "No patients yet."} />
      ) : (
        <>
          <div className={`grid gap-3 ${loading ? "opacity-60" : ""}`}>
            {data.patients.map((p) => (
              <Card key={p._id} className="@container p-4 sm:p-5">
                <div className="flex flex-col gap-3 @[36rem]:flex-row @[36rem]:items-center">
                  <Link to={`/doctor-patients/${p._id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar src={p.image} name={p.name} size={48} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold hover:underline">{p.name}</p>
                      {meta(p) && <p className="text-xs text-ink-subtle">{meta(p)}</p>}
                    </div>
                  </Link>
                  <div className="min-w-0 @[36rem]:w-72">
                    <Contact p={p} />
                  </div>
                  <div className="text-xs text-ink-muted @[36rem]:w-48 @[36rem]:text-right">
                    <p>
                      {p.completedVisits} visit{p.completedVisits === 1 ? "" : "s"} · {p.totalAppointments} booking{p.totalAppointments === 1 ? "" : "s"}
                    </p>
                    {p.nextAppointment && <p className="font-medium text-brand-strong">Next: {formatDateTime(p.nextAppointment)}</p>}
                    {p.lastVisit && <p>Last visit: {formatDate(p.lastVisit)}</p>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-small">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>
                Previous
              </Button>
              <span>
                Page {data.page} of {data.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((x) => x + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DoctorPatients;
