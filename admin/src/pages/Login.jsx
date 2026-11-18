import { useContext, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AdminContext } from "../context/AdminContext";
import { DoctorContext } from "../context/DoctorContext";
import { assets } from "../assets/assets";
import { Button, Card, Input, PasswordInput } from "../components/ui";

const PATIENT_APP_URL = (import.meta.env.VITE_PATIENT_APP_URL || "http://localhost:5173").replace(/\/$/, "");

const Login = ({ initialRole = "Admin" }) => {
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get("role") === "doctor" ? "Doctor" : initialRole);
  const [mode, setMode] = useState("login"); // login | forgot
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState(null); // { tone, text, action? }

  const { setAToken, backendUrl } = useContext(AdminContext);
  const { setdToken } = useContext(DoctorContext);
  const navigate = useNavigate();

  const switchRole = (r) => {
    // patients sign in on the patient app
    if (r === "Patient") return window.location.assign(`${PATIENT_APP_URL}/login`);
    setRole(r);
    setMode("login");
    setNotice(null);
    navigate(r === "Doctor" ? "/doctor/login" : "/login", { replace: true });
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setNotice(null);
    try {
      if (mode === "forgot") {
        const { data } = await axios.post(`${backendUrl}/api/doctor/forgot-password`, { email });
        toast.success(data.message);
        setMode("login");
        return;
      }
      if (role === "Admin") {
        const { data } = await axios.post(`${backendUrl}/api/admin/login`, { email, password });
        if (data.success) {
          localStorage.setItem("aToken", data.token);
          setAToken(data.token);
          navigate("/admin-dashboard", { replace: true });
        } else toast.error(data.message);
      } else {
        const { data } = await axios.post(`${backendUrl}/api/doctor/login`, { email, password });
        if (data.success) {
          localStorage.setItem("dToken", data.token);
          setdToken(data.token);
          navigate("/doctor-dashboard", { replace: true });
        } else if (data.code === "PENDING_APPROVAL") {
          setNotice({ tone: "warn", text: "Your application is still under review. You'll get an email once an admin approves it." });
        } else if (data.code === "REJECTED") {
          setNotice({
            tone: "danger",
            text: `Your application was not approved${data.reason ? `: ${data.reason}` : "."}`,
            action: { href: `${PATIENT_APP_URL}/login?role=doctor`, label: "Edit & reapply" },
          });
        } else if (data.code === "EMAIL_NOT_VERIFIED") {
          setNotice({
            tone: "warn",
            text: "Please verify your email first. We sent a new code.",
            action: { href: `${PATIENT_APP_URL}/login?role=doctor`, label: "Verify email" },
          });
        } else toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const toneCls = { warn: "bg-warn-soft text-ink", danger: "bg-danger-soft text-ink", info: "bg-brand-soft text-ink" };

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-(--gutter) py-10">
      <Card as="form" onSubmit={submitHandler} className="anim-scale-in w-full max-w-md p-6 shadow-lg sm:p-8">
        <img src={assets.logo} alt="" width="56" height="56" className="mx-auto mb-4 size-14 rounded-full" />
        <h1 key={role + mode} className="anim-fade-in text-center text-h2 font-bold">
          {mode === "forgot" ? (
            "Reset password"
          ) : (
            <>
              <span className="text-brand-strong">{role}</span> Login
            </>
          )}
        </h1>
        <p className="mt-1.5 text-center text-small text-ink-muted">
          {mode === "forgot" ? "We'll email you a reset link (approved doctors only)." : `Sign in to the MindCare ${role.toLowerCase()} panel`}
        </p>

        {mode === "login" && (
          <div role="tablist" aria-label="Login as" className="mt-6 grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1">
            {["Patient", "Doctor", "Admin"].map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={role === r}
                onClick={() => switchRole(r)}
                className={`min-h-10 rounded-full text-small font-semibold transition-all duration-200 ${
                  role === r ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}

        {notice && (
          <div role="status" className={`anim-fade-in mt-5 rounded-xl px-4 py-3 text-small ${toneCls[notice.tone] || toneCls.info}`}>
            <p>{notice.text}</p>
            {notice.action && (
              <a href={notice.action.href} className="link mt-1 inline-block font-semibold">
                {notice.action.label}
              </a>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4">
          <Input label="Email" onChange={(e) => setEmail(e.target.value)} value={email} type="email" autoComplete="username" required placeholder="abc@gmail.com" />
          {mode === "login" && (
            <PasswordInput label="Password" onChange={(e) => setPassword(e.target.value)} value={password} autoComplete="current-password" required />
          )}
          {role === "Doctor" && (
            <button type="button" className="link -mt-2 self-end text-small" onClick={() => setMode(mode === "login" ? "forgot" : "login")}>
              {mode === "login" ? "Forgot password?" : "Back to sign in"}
            </button>
          )}
          <Button type="submit" size="lg" block loading={loading} className="mt-2">
            {mode === "forgot" ? "Send reset link" : "Sign In"}
          </Button>
          {role === "Doctor" && mode === "login" && (
            <p className="text-center text-small text-ink-muted">
              New doctor?{" "}
              <a className="link" href={`${PATIENT_APP_URL}/login?role=doctor&mode=signup`}>
                Apply to join MindCare
              </a>
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Login;
