import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext.jsx";
import { Button, IconUpload, Input, PasswordInput, Select, Textarea } from "./ui";
import { EXPERIENCE, SPECIALITIES } from "../config.js";

export const APP_TOKEN_KEY = "appToken"; // limited applicant token (waiting screen / reapply)

const EMPTY = {
  name: "",
  email: "",
  password: "",
  confirm: "",
  phone: "",
  speciality: SPECIALITIES[0],
  degree: "",
  experience: EXPERIENCE[0],
  fee: "",
  licenseNumber: "",
  about: "",
  line1: "",
  line2: "",
};

const STEPS = ["Account", "Professional", "Verify email"];

function validateAccount(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = "Enter your full name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "Enter a valid email";
  if (f.password.length < 8) e.password = "At least 8 characters";
  if (f.confirm !== f.password) e.confirm = "Passwords do not match";
  if (!/^\+?[0-9 ()-]{7,20}$/.test(f.phone.trim())) e.phone = "Enter a valid phone number";
  return e;
}
function validateProfessional(f, needPhoto) {
  const e = {};
  if (!f.degree.trim()) e.degree = "Required";
  if (f.fee === "" || Number(f.fee) < 0) e.fee = "Enter a valid fee";
  if (f.licenseNumber.trim().length < 3) e.licenseNumber = "PMDC license number is required";
  if (f.about.trim().length < 10) e.about = "At least 10 characters";
  if (!f.line1.trim()) e.line1 = "Required";
  if (needPhoto) e.photo = "Please add a profile photo";
  return e;
}

/**
 * mode="signup": account -> professional -> OTP.  initialStep/initialEmail resume at OTP (unverified login).
 * mode="reapply": professional details only, prefilled from `initial`, sent with the applicant token.
 */
export default function DoctorSignup({ mode = "signup", initial, initialStep = 0, initialEmail = "", onDone }) {
  const { backendUrl } = useContext(AppContext);
  const navigate = useNavigate();
  const [step, setStep] = useState(mode === "reapply" ? 1 : initialStep);
  const [f, setF] = useState(() =>
    initial
      ? { ...EMPTY, ...initial, fee: String(initial.fee ?? ""), line1: initial.address?.line1 || "", line2: initial.address?.line2 || "" }
      : { ...EMPTY, email: initialEmail },
  );
  const [photo, setPhoto] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(initialStep === 2 ? 60 : 0);

  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const set = (k) => (e) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };
  const err = (k) => errors[k];

  const next = () => {
    const e = validateAccount(f);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep(1);
  };

  const submitDetails = async () => {
    const e = validateProfessional(f, mode === "signup" && !photo);
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      const fd = new FormData();
      const fields = ["name", "phone", "speciality", "degree", "experience", "fee", "licenseNumber", "about"];
      if (mode === "signup") fields.push("email", "password");
      fields.forEach((k) => fd.append(k, String(f[k]).trim()));
      fd.append("address", JSON.stringify({ line1: f.line1.trim(), line2: f.line2.trim() }));
      if (photo) fd.append("image", photo);
      const url = mode === "signup" ? "/api/doctor/register" : "/api/doctor/reapply";
      const headers = mode === "reapply" ? { apptoken: localStorage.getItem(APP_TOKEN_KEY) } : {};
      const { data } = await axios.post(backendUrl + url, fd, { headers });
      if (!data.success) {
        if (data.errors) setErrors(data.errors);
        if (data.errors?.email || data.errors?.password || data.errors?.phone || data.errors?.name) setStep(0);
        return toast.error(data.message);
      }
      toast.success(data.message);
      if (mode === "signup") {
        setStep(2);
        setCooldown(60);
      } else onDone?.(data.application);
    } catch (e2) {
      toast.error(e2.response?.data?.message || e2.message);
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e?.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setErrors({ otp: "Enter the 6-digit code" });
    setLoading(true);
    try {
      const { data } = await axios.post(backendUrl + "/api/doctor/verify-otp", { email: f.email.trim(), otp });
      if (!data.success) return setErrors({ otp: data.message + (data.attemptsLeft != null ? ` (${data.attemptsLeft} attempts left)` : "") });
      localStorage.setItem(APP_TOKEN_KEY, data.applicantToken);
      toast.success(data.message);
      navigate("/doctor/application");
    } catch (e2) {
      toast.error(e2.response?.data?.message || e2.message);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(backendUrl + "/api/doctor/resend-otp", { email: f.email.trim() });
      if (data.success) {
        toast.success(data.message);
        setCooldown(60);
      } else {
        toast.error(data.message);
        if (data.retryAfter) setCooldown(data.retryAfter);
      }
    } catch (e2) {
      toast.error(e2.response?.data?.message || e2.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {mode === "signup" && (
        <ol className="grid grid-cols-3 gap-2 text-center text-xs font-semibold" aria-label="Signup progress">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === step ? "step" : undefined} className={i <= step ? "text-brand-strong" : "text-ink-subtle"}>
              <span className={`mb-1 block h-1.5 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`} />
              {s}
            </li>
          ))}
        </ol>
      )}

      {step === 0 && (
        <>
          <Input label="Full name" autoComplete="name" value={f.name} onChange={set("name")} error={err("name")} placeholder="Dr. Ayesha Khan" />
          <Input label="Email" type="email" autoComplete="email" value={f.email} onChange={set("email")} error={err("email")} />
          <Input label="Phone" type="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} error={err("phone")} placeholder="+92 300 0000000" />
          <PasswordInput label="Password" autoComplete="new-password" value={f.password} onChange={set("password")} error={err("password")} hint="At least 8 characters" />
          <PasswordInput label="Confirm password" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} error={err("confirm")} />
          <Button size="lg" block onClick={next} className="mt-2">
            Continue
          </Button>
        </>
      )}

      {step === 1 && (
        <>
          {mode === "reapply" && <Input label="Full name" value={f.name} onChange={set("name")} error={err("name")} />}
          {mode === "reapply" && <Input label="Phone" type="tel" value={f.phone} onChange={set("phone")} error={err("phone")} />}
          <div className="flex items-center gap-4">
            <label className="grid size-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-line-strong bg-surface-2 text-ink-subtle hover:border-brand">
              {preview || initial?.image ? (
                <img src={preview || initial.image} alt="Profile preview" className="size-full object-cover" />
              ) : (
                <IconUpload />
              )}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && file.size > 5 * 1024 * 1024) return setErrors((p) => ({ ...p, photo: "Image must be 5 MB or smaller" }));
                  setPhoto(file || null);
                  setErrors((p) => ({ ...p, photo: undefined }));
                }}
              />
            </label>
            <div className="text-small">
              <p className="font-medium">Profile photo</p>
              <p className="text-ink-subtle">Shown to patients. JPG or PNG, up to 5 MB.</p>
              {err("photo") && <p className="field-error" role="alert">{err("photo")}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Speciality" value={f.speciality} onChange={set("speciality")}>
              {SPECIALITIES.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </Select>
            <Select label="Experience" value={f.experience} onChange={set("experience")}>
              {EXPERIENCE.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </Select>
            <Input label="Degree" value={f.degree} onChange={set("degree")} error={err("degree")} placeholder="MBBS, FCPS" />
            <Input label="Fee (rs)" type="number" min="0" value={f.fee} onChange={set("fee")} error={err("fee")} />
          </div>
          <Input label="PMDC license no." value={f.licenseNumber} onChange={set("licenseNumber")} error={err("licenseNumber")} hint="Verified by our admin team before approval" />
          <Textarea label="About" rows={3} value={f.about} onChange={set("about")} error={err("about")} placeholder="Your approach, areas of focus..." />
          <Input label="Clinic address" value={f.line1} onChange={set("line1")} error={err("line1") || err("address")} placeholder="Address line 1" />
          <Input aria-label="Address line 2" value={f.line2} onChange={set("line2")} placeholder="Address line 2 (optional)" />
          <div className="mt-2 flex gap-2">
            {mode === "signup" && (
              <Button variant="ghost" onClick={() => setStep(0)} disabled={loading}>
                Back
              </Button>
            )}
            <Button size="lg" className="flex-1" onClick={submitDetails} loading={loading} loadingText={mode === "signup" ? "Submitting..." : "Resubmitting..."}>
              {mode === "signup" ? "Submit application" : "Resubmit application"}
            </Button>
          </div>
        </>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4" onKeyDown={(e) => e.key === "Enter" && verify(e)}>
          <Input
            label="Enter 6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength="6"
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, ""));
              setErrors({});
            }}
            error={err("otp")}
            inputClassName="text-center font-display text-2xl font-bold tracking-[0.5em]"
            hint={
              <>
                Code sent to <span className="font-semibold text-ink">{f.email}</span>. Or click the link in your email.
              </>
            }
          />
          <Button size="lg" block loading={loading} onClick={verify}>
            Verify email
          </Button>
          <button type="button" className="link self-center text-small disabled:opacity-50" onClick={resend} disabled={cooldown > 0 || loading}>
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>
        </div>
      )}
    </div>
  );
}
