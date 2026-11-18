import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext.jsx";
import AuthCard from "../components/AuthCard.jsx";
import Spinner from "../components/Spinner.jsx";
import { APP_TOKEN_KEY } from "../components/DoctorSignup.jsx";
import { Button, Input } from "../components/ui";

// One request per token, even when React StrictMode runs the effect twice.
const inflight = new Map();
const verifyOnce = (backendUrl, token, type) => {
  const key = `${type}:${token}`;
  if (!inflight.has(key)) {
    inflight.set(
      key,
      axios
        .post(`${backendUrl}/api/auth/verify-email`, { token, type })
        .then((r) => r.data)
        .catch((e) => e.response?.data || { success: false, message: e.message }),
    );
  }
  return inflight.get(key);
};

// Read once at module load of the page; the URL is scrubbed right after.
const readParams = () => {
  const q = new URLSearchParams(window.location.search);
  return { token: q.get("token") || "", type: q.get("type") === "doctor" ? "doctor" : q.get("type") === "user" ? "user" : "" };
};

export default function VerifyEmail() {
  const { backendUrl, setToken } = useContext(AppContext);
  const navigate = useNavigate();
  const [{ token, type }] = useState(readParams);
  const [status, setStatus] = useState(token && type ? "loading" : "error"); // loading | success | error
  const [message, setMessage] = useState(token && type ? "" : "This verification link is incomplete. Request a new one below.");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // never leave the single-use token in the address bar / history
    if (window.location.search) window.history.replaceState(window.history.state, "", window.location.pathname);
    if (!token || !type) return;
    let active = true;
    verifyOnce(backendUrl, token, type).then((data) => {
      if (!active) return;
      if (!data?.success) {
        setStatus("error");
        setMessage(data?.message || "This verification link is invalid or expired.");
        return;
      }
      setStatus("success");
      setMessage(data.message);
      if (type === "user") {
        localStorage.setItem("token", data.token);
        setToken(data.token);
        toast.success("Email verified — welcome to MindCare!");
        navigate("/", { replace: true });
      } else {
        localStorage.setItem(APP_TOKEN_KEY, data.applicantToken);
        toast.success(data.message);
        navigate("/doctor/application", { replace: true });
      }
    });
    return () => {
      active = false;
    };
  }, [backendUrl, token, type, setToken, navigate]);

  const resend = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      const path = type === "doctor" ? "/api/doctor/resend-otp" : "/api/user/resend-otp";
      const { data } = await axios.post(backendUrl + path, { email: email.trim() });
      if (data.success) toast.success(data.message);
      else toast.error(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSending(false);
    }
  };

  if (status !== "error") {
    return (
      <AuthCard title={status === "success" ? "Email verified" : "Verifying your email"} subtitle={status === "success" ? "Redirecting…" : "Just a moment…"} onSubmit={(e) => e.preventDefault()}>
        <div className="flex justify-center py-4 text-brand" aria-live="polite">
          <Spinner size="lg" />
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Link not valid" subtitle={message} onSubmit={resend}>
      <Input label="Your email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required hint="We'll send a new code and link. The old ones stop working." />
      <Button type="submit" size="lg" block loading={sending}>
        Resend verification email
      </Button>
      <p className="text-center text-small text-ink-muted">
        <Link to={type === "doctor" ? "/login?role=doctor" : "/login"} className="link">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
