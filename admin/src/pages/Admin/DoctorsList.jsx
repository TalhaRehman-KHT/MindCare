import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminContext } from "../../context/AdminContext";
import Spinner, { PageLoader } from "../../components/Spinner.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { Badge, Button, Card, EmptyState, IconPlus, IconStethoscope, IconTrash, Modal, Reveal, Textarea } from "../../components/ui";
import { cdnImage, cdnSrcSet } from "../../utils/cdnImage.js";
import { formatDate } from "../../utils/time.js";

const FILTERS = [
  ["approved", "Approved"],
  ["removed", "Removed"],
];

const DoctorsList = () => {
  const { doctors, aToken, getAllDoctors, changeAvailability, deleteDoctor, removeDoctor, doctorsLoading, processingId } =
    useContext(AdminContext);
  const [filter, setFilter] = useState("approved");
  const [toRemove, setToRemove] = useState(null);
  const [removeReason, setRemoveReason] = useState("");
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    if (aToken) getAllDoctors(filter);
  }, [aToken, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <PageHeader
        title="All Doctors"
        subtitle={`${doctors.length} ${filter} doctor${doctors.length === 1 ? "" : "s"}`}
        actions={
          <Button as={Link} to="/add-doctor" size="sm">
            <IconPlus size={16} /> Add Doctor
          </Button>
        }
      />
      <div className="mb-5 flex gap-2" role="tablist" aria-label="Doctor status">
        {FILTERS.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={filter === k} className={`chip ${filter === k ? "active" : ""}`} onClick={() => setFilter(k)}>
            {l}
          </button>
        ))}
      </div>
      {doctorsLoading && doctors.length === 0 && <PageLoader text="Loading doctors..." />}
      {!doctorsLoading && doctors.length === 0 && (
        <EmptyState icon={<IconStethoscope />} text={filter === "removed" ? "No removed doctors." : "No doctors added yet."} />
      )}

      <Reveal key={filter} stagger className="grid grid-cols-[repeat(auto-fill,minmax(min(14rem,100%),1fr))] gap-4">
        {doctors.map((item) => (
          <Card key={item._id} hover className="@container group flex flex-col overflow-hidden">
            <div className="aspect-square overflow-hidden bg-brand-soft">
              <img
                src={cdnImage(item.image, 400)}
                srcSet={cdnSrcSet(item.image, [240, 400])}
                sizes="(max-width: 640px) 100vw, 240px"
                alt={item.name}
                width="400"
                height="400"
                loading="lazy"
                decoding="async"
                className={`size-full object-cover object-top transition-transform duration-500 ease-out-soft group-hover:scale-[1.04] ${item.status === "removed" ? "grayscale" : ""}`}
              />
            </div>
            <div className="flex flex-1 flex-col p-4">
              <p className="font-display text-h3 font-semibold">{item.name}</p>
              <p className="text-small text-ink-muted">{item.speciality}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone={item.status === "removed" ? "danger" : "success"}>{item.status === "removed" ? "Removed" : "Approved"}</Badge>
                <Badge>
                  {item.totalAppointments} appt{item.totalAppointments === 1 ? "" : "s"}
                </Badge>
              </div>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4 text-small">
                {item.status === "approved" ? (
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5">
                    {processingId === item._id ? (
                      <Spinner size="sm" className="text-ink-subtle" />
                    ) : (
                      <input
                        onChange={() => changeAvailability(item._id, filter)}
                        type="checkbox"
                        checked={item.available}
                        disabled={!!processingId}
                        className="peer sr-only"
                      />
                    )}
                    {processingId !== item._id && (
                      <span
                        aria-hidden="true"
                        className="relative h-6 w-10 rounded-full bg-line-strong transition-colors duration-200 after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-200 peer-checked:bg-brand peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-brand"
                      />
                    )}
                    <span>{processingId === item._id ? "Please wait..." : item.available ? "Active" : "Not active"}</span>
                  </label>
                ) : (
                  <span className="text-xs text-ink-subtle">Removed {formatDate(item.removedAt)}</span>
                )}
                <div className="flex gap-1.5">
                  {item.status === "approved" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (processingId) return;
                        setToRemove(item);
                        setRemoveReason("");
                      }}
                      disabled={!!processingId}
                      title="Remove from hospital"
                    >
                      Remove
                    </Button>
                  )}
                  {item.totalAppointments === 0 && (
                    <Button
                      variant="danger"
                      size="sm"
                      iconOnly
                      onClick={() => !processingId && setToDelete(item)}
                      disabled={!!processingId}
                      aria-label={`Delete ${item.name} permanently`}
                      title="Delete permanently"
                    >
                      <IconTrash size={18} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </Reveal>

      <Modal
        open={!!toRemove}
        onClose={() => setToRemove(null)}
        title={`Remove ${toRemove?.name || "doctor"} from the hospital?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setToRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={processingId === toRemove?._id}
              onClick={async () => {
                if (await removeDoctor(toRemove._id, removeReason.trim())) {
                  setToRemove(null);
                  getAllDoctors(filter);
                }
              }}
            >
              Remove doctor
            </Button>
          </>
        }
      >
        {toRemove && (
          <div className="grid gap-3">
            <p>
              Their login stops working immediately and they disappear from the public doctor list.{" "}
              {toRemove.futureAppointments > 0 ? (
                <strong className="text-danger-strong">
                  {toRemove.futureAppointments} upcoming appointment{toRemove.futureAppointments === 1 ? "" : "s"} will be cancelled and the
                  patients emailed.
                </strong>
              ) : (
                "They have no upcoming appointments."
              )}{" "}
              Past appointment history is kept.
            </p>
            <Textarea
              label="Reason (optional, emailed to the doctor)"
              rows={3}
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
              maxLength={500}
              placeholder="e.g. Left the hospital"
            />
          </div>
        )}
      </Modal>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete permanently?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                const id = toDelete._id;
                setToDelete(null);
                if (await deleteDoctor(id)) getAllDoctors(filter);
              }}
            >
              Delete permanently
            </Button>
          </>
        }
      >
        {toDelete && (
          <p>
            <strong className="text-ink">{toDelete.name}</strong> has no appointments, so the account and photo will be deleted for good. This
            cannot be undone.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default DoctorsList;
