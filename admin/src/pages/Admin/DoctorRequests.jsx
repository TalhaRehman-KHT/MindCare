import { useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AdminContext } from "../../context/AdminContext";
import { PageLoader } from "../../components/Spinner.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { Avatar, Badge, Button, Card, EmptyState, IconCheck, IconMail, IconPhone, IconShield, IconX, Modal, Textarea } from "../../components/ui";
import { formatDate } from "../../utils/time.js";

const Row = ({ label, children }) => (
  <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr]">
    <dt className="text-xs font-medium uppercase tracking-wide text-ink-subtle">{label}</dt>
    <dd className="min-w-0 break-words text-small text-ink">{children || "—"}</dd>
  </div>
);

const DoctorRequests = () => {
  const { aToken, getDoctorRequests, approveDoctor, rejectDoctor, processingId } = useContext(AdminContext);
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  const load = async (status = tab) => {
    setLoading(true);
    try {
      setItems(await getDoctorRequests(status));
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (aToken) load(tab);
  }, [aToken, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const approve = async (d) => {
    if (await approveDoctor(d._id)) {
      setSelected(null);
      load();
    }
  };

  const submitReject = async () => {
    if (!reason.trim()) return setReasonError("Please give a reason — it is emailed to the applicant.");
    const d = rejecting;
    if (await rejectDoctor(d._id, reason.trim())) {
      setRejecting(null);
      setSelected(null);
      setReason("");
      load();
    }
  };

  return (
    <div>
      <PageHeader title="Doctor Requests" subtitle="Review self-signup applications and their PMDC license before they go live." />
      <div className="mb-5 flex gap-2" role="tablist" aria-label="Request status">
        {[
          ["pending", "Pending"],
          ["rejected", "Rejected"],
        ].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={`chip ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>

      {loading && items.length === 0 ? (
        <PageLoader text="Loading requests..." />
      ) : items.length === 0 ? (
        <EmptyState icon={<IconShield />} text={tab === "pending" ? "No applications waiting for review." : "No rejected applications."} />
      ) : (
        <div className="grid gap-3">
          {items.map((d) => (
            <Card key={d._id} className="@container p-4 sm:p-5">
              <div className="flex flex-col gap-4 @[40rem]:flex-row @[40rem]:items-center">
                <button type="button" onClick={() => setSelected(d)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                  <Avatar src={d.image} name={d.name} size={56} />
                  <div className="min-w-0">
                    <p className="truncate font-display text-h3 font-semibold">{d.name}</p>
                    <p className="text-small text-ink-muted">
                      {d.speciality} · {d.degree} · {d.experience}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-subtle">
                      <span>PMDC {d.licenseNumber || "—"}</span>
                      <span>{d.email}</span>
                      {d.phone && <span>{d.phone}</span>}
                      <span>Applied {formatDate(d.appliedAt || d.date)}</span>
                    </p>
                    {tab === "rejected" && d.rejectionReason && <p className="mt-1 text-xs text-danger-strong">Reason: {d.rejectionReason}</p>}
                  </div>
                </button>
                <div className="flex shrink-0 gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelected(d)}>
                    Details
                  </Button>
                  {tab === "pending" && (
                    <>
                      <Button variant="danger" size="sm" onClick={() => { setRejecting(d); setReason(""); setReasonError(""); }} disabled={!!processingId}>
                        <IconX size={16} /> Reject
                      </Button>
                      <Button size="sm" onClick={() => approve(d)} loading={processingId === d._id} disabled={!!processingId}>
                        <IconCheck size={16} /> Approve
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!selected && !rejecting}
        onClose={() => setSelected(null)}
        title="Application details"
        className="w-[min(36rem,calc(100vw-2rem))]"
        footer={
          selected?.status === "pending" && (
            <>
              <Button variant="danger" onClick={() => { setRejecting(selected); setReason(""); setReasonError(""); }}>
                Reject
              </Button>
              <Button onClick={() => approve(selected)} loading={processingId === selected?._id}>
                Approve
              </Button>
            </>
          )
        }
      >
        {selected && (
          <div className="grid gap-4">
            <div className="flex items-center gap-4">
              <Avatar src={selected.image} name={selected.name} size={72} square />
              <div>
                <p className="font-display text-h3 font-semibold text-ink">{selected.name}</p>
                <Badge tone={selected.status === "pending" ? "warn" : "danger"}>{selected.status}</Badge>
              </div>
            </div>
            <dl className="grid gap-2.5">
              <Row label="PMDC license">{selected.licenseNumber}</Row>
              <Row label="Speciality">{selected.speciality}</Row>
              <Row label="Degree">{selected.degree}</Row>
              <Row label="Experience">{selected.experience}</Row>
              <Row label="Fee">{selected.fee} rs</Row>
              <Row label="Email">
                <a className="link inline-flex items-center gap-1" href={`mailto:${selected.email}`}>
                  <IconMail size={14} /> {selected.email}
                </a>
              </Row>
              <Row label="Phone">
                {selected.phone && (
                  <a className="link inline-flex items-center gap-1" href={`tel:${selected.phone}`}>
                    <IconPhone size={14} /> {selected.phone}
                  </a>
                )}
              </Row>
              <Row label="Address">{[selected.address?.line1, selected.address?.line2].filter(Boolean).join(", ")}</Row>
              <Row label="Applied">{formatDate(selected.appliedAt || selected.date)}</Row>
              <Row label="About">{selected.about}</Row>
              {selected.rejectionReason && <Row label="Rejection reason">{selected.rejectionReason}</Row>}
            </dl>
          </div>
        )}
      </Modal>

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title={`Reject ${rejecting?.name || "application"}?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={submitReject} loading={processingId === rejecting?._id}>
              Reject application
            </Button>
          </>
        }
      >
        <Textarea
          label="Reason (sent to the applicant)"
          rows={4}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setReasonError("");
          }}
          error={reasonError || undefined}
          placeholder="e.g. PMDC license number could not be verified."
          maxLength={500}
          required
        />
      </Modal>
    </div>
  );
};

export default DoctorRequests;
