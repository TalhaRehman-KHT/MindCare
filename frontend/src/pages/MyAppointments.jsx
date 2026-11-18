import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext";
import { PageLoader } from "../components/Spinner.jsx";
import { Avatar, Badge, Button, Card, Container, EmptyState, IconCalendar, IconClock, IconMapPin, Modal, Reveal, SectionHeading } from "../components/ui";
import { apptDate, apptStatus, apptTime, STATUS_META } from "../utils/time.js";

const MyAppointments = () => {
  const { backendUrl, token, getDoctorsData } = useContext(AppContext);

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  // id of the appointment currently being cancelled (row-level loader)
  const [cancellingId, setCancellingId] = useState(null);
  // appointment waiting for the user to confirm cancellation
  const [confirming, setConfirming] = useState(null);

  const getUserAppointments = async () => {
    try {
      const { data } = await axios.post(
        backendUrl + "/api/user/appointments",
        {},
        {
          headers: { token },
        },
      );

      if (data.success) {
        // newest first (server sorts by start time)
        setAppointments(data.appointments);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (appointmentId) => {
    if (cancellingId) return;
    setCancellingId(appointmentId);
    try {
      const { data } = await axios.post(
        backendUrl + "/api/user/cancel-appointment",
        { appointmentId },
        { headers: { token } },
      );
      if (data.success) {
        toast.success(data.message);
        await Promise.all([getUserAppointments(), getDoctorsData()]);
      } else toast.error(data.message);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    if (token) {
      getUserAppointments();
    } else {
      setLoading(false);
    }
  }, [token]);


  return (
    <Container className="py-8 sm:py-12">
      <SectionHeading as="h1" align="left" eyebrow="Your care" title="My appointments" />
      <div className="mt-8">
        {loading ? (
          <PageLoader text="Loading your appointments..." />
        ) : appointments.length === 0 ? (
          <EmptyState
            icon={<IconCalendar />}
            text="You have no appointments yet."
            action={
              <Button as={Link} to="/doctors" size="sm">
                Find a doctor
              </Button>
            }
          />
        ) : (
          <Reveal stagger className="grid gap-4">
            {appointments.map((item) => (
              <Card key={item._id} className="@container p-4 sm:p-5">
                <div className="flex flex-col gap-4 @[34rem]:flex-row @[34rem]:items-center">
                  <div className="flex flex-1 items-start gap-4">
                    <Avatar src={item.docData.image} name={item.docData.name} size={72} square />
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-h3 font-semibold">{item.docData.name}</p>
                      <p className="text-small text-ink-muted">{item.docData.speciality}</p>
                      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-small">
                        <span className="inline-flex items-center gap-1.5">
                          <IconCalendar size={16} className="text-brand" /> {apptDate(item)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <IconClock size={16} className="text-brand" /> {apptTime(item)}
                        </span>
                      </p>
                      {(item.docData.address?.line1 || item.docData.address?.line2) && (
                        <p className="mt-1 flex items-start gap-1.5 text-xs text-ink-subtle">
                          <IconMapPin size={14} className="mt-0.5" />
                          <span>
                            {item.docData.address.line1} {item.docData.address.line2}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 @[34rem]:justify-end">
                    {apptStatus(item) === "booked" ? (
                      <div className="flex flex-col items-start gap-1.5 @[34rem]:items-end">
                        <Badge tone="brand" dot>Booked</Badge>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setConfirming(item)}
                          loading={cancellingId === item._id}
                          disabled={!!cancellingId || item.canCancel === false}
                          title={item.canCancel === false ? item.cancelBlockedReason : undefined}
                        >
                          Cancel Appointment
                        </Button>
                        {item.canCancel === false && <p className="max-w-56 text-xs text-ink-subtle">{item.cancelBlockedReason}</p>}
                      </div>
                    ) : (
                      <div className="flex flex-col items-start gap-1 @[34rem]:items-end">
                        <Badge tone={STATUS_META[apptStatus(item)]?.tone} dot>
                          {STATUS_META[apptStatus(item)]?.label}
                        </Badge>
                        {apptStatus(item) === "cancelled" && item.cancelledBy && item.cancelledBy !== "user" && (
                          <p className="max-w-56 text-xs text-ink-subtle">
                            Cancelled by the {item.cancelledBy === "admin" ? "hospital" : "doctor"}
                            {item.cancelReason ? `: ${item.cancelReason}` : ""}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </Reveal>
        )}
      </div>

      <Modal
        open={!!confirming}
        onClose={() => setConfirming(null)}
        title="Cancel this appointment?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const id = confirming._id;
                setConfirming(null);
                cancelAppointment(id);
              }}
            >
              Yes, cancel
            </Button>
          </>
        }
      >
        {confirming && (
          <p>
            Your slot with <strong className="text-ink">{confirming.docData.name}</strong> on{" "}
            {apptDate(confirming)} at {apptTime(confirming)} will be released.
          </p>
        )}
      </Modal>
    </Container>
  );
};

export default MyAppointments;
