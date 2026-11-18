import { useCallback, useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext.jsx";
import { PageLoader } from "../components/Spinner.jsx";
import DoctorSignup, { APP_TOKEN_KEY } from "../components/DoctorSignup.jsx";
import { Avatar, Badge, Button, Card, Container, EmptyState, IconClock, IconShield, IconVerified } from "../components/ui";
import { ADMIN_PANEL_URL } from "../config.js";
import { formatDate } from "../utils/time.js";

const STATUS = {
  pending: { tone: "warn", label: "Under review", icon: IconClock },
  rejected: { tone: "danger", label: "Not approved", icon: IconShield },
  approved: { tone: "success", label: "Approved", icon: IconVerified },
};

// /doctor/application — waiting screen for doctor applicants (uses the limited applicant token).
const DoctorApplication = () => {
  const { backendUrl } = useContext(AppContext);
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const load = useCallback(
    async (manual = false) => {
      const apptoken = localStorage.getItem(APP_TOKEN_KEY);
      if (!apptoken) {
        setError("Sign in with your doctor email and password to see your application.");
        setLoading(false);
        return;
      }
      manual && setRefreshing(true);
      try {
        const { data } = await axios.get(`${backendUrl}/api/doctor/application-status`, { headers: { apptoken } });
        if (data.success) {
          setApp(data.application);
          setError("");
          manual && toast.success("Status updated");
        } else setError(data.message);
      } catch (e) {
        if (e.response?.status === 401) localStorage.removeItem(APP_TOKEN_KEY);
        setError(e.response?.status === 401 ? "Your session expired. Please sign in again." : e.response?.data?.message || e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [backendUrl],
  );

  useEffect(() => {
    load();
  }, [load]);

  // poll while pending so the screen updates when an admin decides
  useEffect(() => {
    if (app?.status !== "pending") return;
    const t = setInterval(() => load(), 30000);
    return () => clearInterval(t);
  }, [app?.status, load]);

  if (loading) return <PageLoader text="Loading your application..." />;
  if (error || !app)
    return (
      <Container className="py-12">
        <EmptyState
          icon={<IconShield />}
          title="Doctor application"
          text={error || "Application not found."}
          action={
            <Button as={Link} to="/login?role=doctor" size="sm">
              Doctor sign in
            </Button>
          }
        />
      </Container>
    );

  const s = STATUS[app.status] || STATUS.pending;
  const Icon = s.icon;

  return (
    <Container className="max-w-2xl py-8 sm:py-12">
      <Card className="anim-fade-up p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar src={app.image} name={app.name} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="text-h2 font-bold">{app.name}</h1>
            <p className="text-small text-ink-muted">
              {app.speciality} · {app.degree} · PMDC {app.licenseNumber}
            </p>
          </div>
          <Badge tone={s.tone} dot>
            {s.label}
          </Badge>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl bg-surface-2 p-4">
          <Icon className={app.status === "approved" ? "text-success" : app.status === "rejected" ? "text-danger" : "text-warn"} />
          <div className="text-small">
            {app.status === "pending" && (
              <>
                <p className="font-semibold text-ink">Application under review</p>
                <p className="mt-1 text-ink-muted">
                  Submitted {formatDate(app.appliedAt)}. Our admin team is checking your details and PMDC license. We&apos;ll email you at{" "}
                  <strong className="text-ink">{app.email}</strong> once a decision is made.
                </p>
              </>
            )}
            {app.status === "rejected" && (
              <>
                <p className="font-semibold text-ink">Your application was not approved</p>
                {app.rejectionReason && <p className="mt-1 text-ink">Reason: {app.rejectionReason}</p>}
                <p className="mt-1 text-ink-muted">You can fix the details below and reapply.</p>
              </>
            )}
            {app.status === "approved" && (
              <>
                <p className="font-semibold text-ink">You&apos;re approved!</p>
                <p className="mt-1 text-ink-muted">Patients can now find and book you. Sign in to the Doctor Panel to manage your schedule.</p>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {app.status === "approved" ? (
            <Button
              as="a"
              href={`${ADMIN_PANEL_URL}/doctor/login`}
              onClick={() => localStorage.removeItem(APP_TOKEN_KEY)}
            >
              Open Doctor Panel
            </Button>
          ) : app.status === "rejected" && !editing ? (
            <Button onClick={() => setEditing(true)}>Edit &amp; reapply</Button>
          ) : null}
          {!editing && (
            <Button variant="outline" onClick={() => load(true)} loading={refreshing} loadingText="Refreshing...">
              Refresh status
            </Button>
          )}
        </div>
      </Card>

      {editing && (
        <Card className="anim-fade-up mt-6 p-6 sm:p-8">
          <h2 className="mb-4 text-h3 font-semibold">Update your application</h2>
          <DoctorSignup
            mode="reapply"
            initial={app}
            onDone={(updated) => {
              setApp(updated);
              setEditing(false);
            }}
          />
          <Button variant="ghost" className="mt-3" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </Card>
      )}
    </Container>
  );
};

export default DoctorApplication;
