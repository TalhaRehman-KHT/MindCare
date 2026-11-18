import { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";
import axios from "axios";
import Spinner, { PageLoader } from "../components/Spinner.jsx";
import { Avatar, Badge, Button, Card, Container, EmptyState, IconCalendar, IconClock, IconInfo, IconStethoscope, IconVerified, IconWallet } from "../components/ui";
import { cdnImage, cdnSrcSet } from "../utils/cdnImage.js";
import { CLINIC_TZ, formatShortDate, formatTime } from "../utils/time.js";

// Slots come from the server (single source of truth): GET /api/doctor/:docId/slots
const Appointment = () => {
  const { docId } = useParams();
  const { doctors, doctorsLoading, backendUrl, token } = useContext(AppContext);
  const navigate = useNavigate();

  const [docInfo, setDocInfo] = useState(null);
  const [days, setDays] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState("");
  const [dayIndex, setDayIndex] = useState(0);
  const [selected, setSelected] = useState(null); // slot { startAt, label }
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    setDocInfo(doctors.find((doc) => doc._id === docId) || null);
  }, [docId, doctors]);

  const loadSlots = useCallback(async () => {
    setSlotsLoading(true);
    try {
      const { data } = await axios.get(`${backendUrl}/api/doctor/${docId}/slots`, { params: { days: 7 } });
      if (data.success) {
        setDays(data.days);
        setSlotsError("");
        setDayIndex((i) => {
          if (i > 0 && i < data.days.length) return i; // keep the day the patient was looking at
          const firstFree = data.days.findIndex((d) => d.slots.some((s) => s.available));
          return firstFree >= 0 ? firstFree : 0;
        });
      } else {
        setDays([]);
        setSlotsError(data.message);
      }
    } catch (error) {
      setDays([]);
      setSlotsError(error.response?.data?.message || error.message);
    } finally {
      setSlotsLoading(false);
    }
  }, [backendUrl, docId]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const bookAppointment = async () => {
    if (!token) {
      toast.warn("Sign in To Book Appointment");
      return navigate("/login"), scrollTo(0, 0);
    }
    if (!selected) return toast.info("Please pick a time first");
    if (booking) return;
    setBooking(true);
    try {
      const { data } = await axios.post(backendUrl + "/api/user/book-appointment", { docId, startAt: selected.startAt }, { headers: { token } });
      if (data.success) {
        toast.success(data.message);
        navigate("/my-appointments");
      } else {
        toast.error(data.message);
        setSelected(null);
        loadSlots();
      }
    } catch (error) {
      // 409 = slot just taken / patient already busy; 400 = slot no longer valid
      toast.error(error.response?.data?.message || error.message);
      setSelected(null);
      loadSlots();
    } finally {
      setBooking(false);
    }
  };

  if (!docInfo) {
    return doctorsLoading ? <PageLoader text="Loading doctor details..." /> : <EmptyState icon={<IconStethoscope />} text="Doctor not found." />;
  }

  const day = days[dayIndex];
  const times = day?.slots || [];

  return (
    <Container className="py-8 sm:py-12">
      <div className="grid gap-6 md:grid-cols-[minmax(14rem,18rem)_1fr]">
        <div className="anim-fade-in overflow-hidden rounded-2xl bg-brand-soft md:self-start">
          <img
            src={cdnImage(docInfo.image, 576)}
            srcSet={cdnSrcSet(docInfo.image, [320, 576])}
            sizes="(max-width: 768px) 100vw, 18rem"
            alt={docInfo.name}
            width="576"
            height="576"
            fetchPriority="high"
            decoding="async"
            className="aspect-square w-full object-cover object-top"
          />
        </div>

        <Card className="anim-fade-up p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-h1 font-bold">{docInfo.name}</h1>
            <IconVerified className="text-brand" aria-label="Verified" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-ink-muted">
            <span>
              {docInfo.degree} — {docInfo.speciality}
            </span>
            <Badge>{docInfo.experience}</Badge>
            <Badge tone={docInfo.available ? "success" : "neutral"} dot>
              {docInfo.available ? "Available" : "Not Available"}
            </Badge>
          </div>
          <h2 className="mt-6 flex items-center gap-2 text-small font-semibold uppercase tracking-wider text-ink-subtle">
            About <IconInfo size={16} />
          </h2>
          <p className="mt-2 max-w-prose text-ink-muted">{docInfo.about}</p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-xl bg-surface-2 px-4 py-2.5 font-semibold">
            <IconWallet size={18} className="text-brand" />
            Appointment fee: <span className="text-brand-strong">{docInfo.fee} rs</span>
          </p>
        </Card>
      </div>

      {/* BOOKING SLOTS */}
      <Card className="mt-6 p-5 sm:p-8 md:ml-[calc(min(18rem,100%)+1.5rem)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-h3 font-semibold">
            <IconCalendar size={20} className="text-brand" /> Booking slots
          </h2>
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-subtle">
            Times in {CLINIC_TZ.replace("_", " ")}
            {slotsLoading && days.length > 0 && <Spinner size="sm" className="text-brand" />}
          </span>
        </div>

        {slotsLoading && days.length === 0 ? (
          <PageLoader text="Loading available times..." className="py-10" />
        ) : slotsError ? (
          <p className="mt-4 text-small text-ink-muted">{slotsError}</p>
        ) : (
          <>
            <div className="no-scrollbar -mx-1 mt-5 flex gap-2.5 overflow-x-auto px-1 pb-1" role="listbox" aria-label="Choose a day">
              {days.map((d, index) => {
                const free = d.slots.filter((s) => s.available).length;
                const [wd, dd] = d.dayLabel.split(" ");
                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={dayIndex === index}
                    aria-label={`${d.dayLabel}: ${free} free slots`}
                    onClick={() => {
                      setDayIndex(index);
                      setSelected(null);
                    }}
                    key={d.date}
                    className={`flex min-w-16 shrink-0 flex-col items-center gap-0.5 rounded-2xl border px-3 py-4 text-small font-semibold transition-all duration-200 ease-out-soft ${
                      dayIndex === index
                        ? "border-brand bg-brand text-brand-ink shadow-md"
                        : `border-line-strong bg-surface hover:-translate-y-0.5 hover:border-brand ${free === 0 ? "opacity-50" : ""}`
                    }`}
                  >
                    <span className="text-xs uppercase opacity-80">{wd}</span>
                    <span className="font-display text-h3">{dd}</span>
                  </button>
                );
              })}
            </div>

            <h3 className="mt-6 flex items-center gap-2 text-small font-semibold text-ink-muted">
              <IconClock size={16} /> Available times
            </h3>
            {times.length === 0 ? (
              <p className="mt-3 text-small text-ink-subtle">No slots on this day — please pick another day.</p>
            ) : (
              <div key={day.date} className="anim-fade-in mt-3 grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2" role="listbox" aria-label="Choose a time">
                {times.map((s) => {
                  const isSel = selected?.startAt === s.startAt;
                  return (
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      disabled={!s.available}
                      title={s.available ? undefined : "Already booked"}
                      onClick={() => setSelected(s)}
                      className={`min-h-11 rounded-full border px-3 text-small transition-all duration-150 disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-2 disabled:text-ink-subtle disabled:line-through ${
                        isSel ? "border-brand bg-brand font-semibold text-brand-ink" : "border-line-strong hover:border-brand hover:text-brand-strong"
                      }`}
                      key={s.startAt}
                    >
                      {formatTime(s.startAt)}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button onClick={bookAppointment} loading={booking} size="lg" disabled={!!slotsError || !docInfo.available}>
            Book an Appointment
          </Button>
          {selected && (
            <span className="anim-fade-in flex items-center gap-2 text-small text-ink-muted">
              <Avatar src={docInfo.image} name={docInfo.name} size={28} />
              {formatShortDate(selected.startAt)} · {formatTime(selected.startAt)}
            </span>
          )}
        </div>
      </Card>
    </Container>
  );
};

export default Appointment;
