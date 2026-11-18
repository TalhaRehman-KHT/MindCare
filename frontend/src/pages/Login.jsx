import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext.jsx";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthCard from "../components/AuthCard.jsx";
import DoctorSignup, { APP_TOKEN_KEY } from "../components/DoctorSignup.jsx";
import { Button, Input, PasswordInput } from "../components/ui";
import { ADMIN_PANEL_URL } from "../config.js";

const RoleToggle = ({ role, onChange }) => (
  <div role="tablist" aria-label="I am a" className="grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1">
    {["Patient", "Doctor"].map((r) => (
      <button
        key={r}
        type="button"
        role="tab"
        aria-selected={role === r}
        onClick={() => onChange(r)}
        className={`min-h-10 rounded-full text-small font-semibold transition-all duration-200 ${
          role === r ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
        }`}
      >
        {r}
      </button>
    ))}
  </div>
);

const Switch = ({ q, cta, onClick }) => (
  <p className="text-center text-small text-ink-muted">
    {q}{" "}
    <button type="button" onClick={onClick} className="link">
      {cta}
    </button>
  </p>
);

const AdminLink = () => (
  <p className="text-center text-small text-ink-subtle">
    Hospital staff?{" "}
    <a href={`${ADMIN_PANEL_URL}/login`} className="link">
      Admin login
    </a>
  </p>
);

const Login = () => {
  const { backendUrl, token, setToken } = useContext(AppContext);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  // State options: "Sign in", "Sign up", "Reset Password", "Verify OTP"
  const [state, setState] = useState(params.get("mode") === "signup" ? "Sign up" : "Sign in");
  // "Patient" keeps the original flow untouched; "Doctor" uses the doctor endpoints
  const [role, setRole] = useState(params.get("role") === "doctor" ? "Doctor" : "Patient");
  // unverified doctor who tried to sign in -> resume signup at the OTP step
  const [doctorOtpEmail, setDoctorOtpEmail] = useState("");
  const isDoctor = role === "Doctor";
  const changeRole = (r) => {
    setRole(r);
    setDoctorOtpEmail("");
    if (state === "Verify OTP") setState("Sign up");
    const next = new URLSearchParams(params);
    if (r === "Doctor") next.set("role", "doctor");
    else next.delete("role");
    setParams(next, { replace: true });
  };

  // DOCTOR SIGN IN from the patient app: one-time code handoff to the Doctor Panel (no token in URLs)
  const doctorSignIn = async () => {
    const { data } = await axios.post(backendUrl + "/api/doctor/login-handoff", { email, password });
    if (data.success) {
      toast.success("Opening the Doctor Panel...");
      window.location.assign(`${ADMIN_PANEL_URL}/auth/doctor?code=${encodeURIComponent(data.code)}`);
      return;
    }
    if (data.code === "PENDING_APPROVAL" || data.code === "REJECTED") {
      localStorage.setItem(APP_TOKEN_KEY, data.applicantToken);
      navigate("/doctor/application");
      return;
    }
    if (data.code === "EMAIL_NOT_VERIFIED") {
      toast.info(data.message);
      setDoctorOtpEmail(data.email || email);
      setState("Sign up");
      return;
    }
    toast.error(data.message);
  };

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isDisabled, setIsDisabled] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // resend patient OTP + verification link (the old code and link stop working)
  const resendOtp = async () => {
    try {
      setIsDisabled(true);
      const { data } = await axios.post(backendUrl + "/api/user/resend-otp", { email });
      if (data.success) {
        toast.success(data.message);
        setCooldown(60);
      } else {
        toast.error(data.message);
        if (data.retryAfter) setCooldown(data.retryAfter);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setIsDisabled(false);
    }
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    // 1. FORGOT PASSWORD REQUEST
    if (state === "Reset Password") {
      try {
        setIsDisabled(true);
        const { data } = await axios.post(
          backendUrl + (isDoctor ? "/api/doctor/forgot-password" : "/api/user/forgot-password"),
          { email },
        );

        if (data.success) {
          toast.success("Reset link sent to your email");
          setState("Sign in"); // Return to login
        } else {
          toast.error(data.message);
        }
      } catch (error) {
        toast.error(error.message);
      } finally {
        setIsDisabled(false);
      }
      return;
    }

    // 2. VERIFY OTP REQUEST
    if (state === "Verify OTP") {
      try {
        setIsDisabled(true);
        const { data } = await axios.post(backendUrl + "/api/user/verify-otp", {
          email,
          otp,
        });

        if (data.success) {
          // If verified successfully, log the user in
          localStorage.setItem("token", data.token);
          setToken(data.token);
          toast.success(data.message); // "Account Verified Successfully"
        } else {
          toast.error(data.message);
        }
      } catch (error) {
        toast.error(error.message);
      } finally {
        setIsDisabled(false);
      }
      return;
    }

    // 3. CHECK PASSWORDS FOR SIGN UP
    if (state === "Sign up" && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // 4. SIGN UP OR SIGN IN REQUESTS
    try {
      setIsDisabled(true);

      if (isDoctor && state === "Sign in") {
        await doctorSignIn();
        return;
      }

      if (state === "Sign up") {
        // --- REGISTRATION (Sends OTP) ---
        const { data } = await axios.post(backendUrl + "/api/user/register", {
          name,
          email,
          password,
        });

        if (data.success) {
          toast.success(data.message); // "OTP sent to your email"
          setState("Verify OTP"); // Switch view to OTP input
        } else {
          toast.error(data.message);
        }
      } else {
        // --- LOGIN ---
        const { data } = await axios.post(backendUrl + "/api/user/login", {
          email,
          password,
        });

        if (data.success) {
          localStorage.setItem("token", data.token);
          setToken(data.token);
          toast.success("Signed In");
        } else {
          toast.error(data.message);
        }
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsDisabled(false);
    }
  };

  useEffect(() => {
    if (token) {
      navigate("/");
    }
  }, [token, navigate]);

  const passwordsDoNotMatch =
    state === "Sign up" &&
    password !== confirmPassword &&
    confirmPassword.length > 0;

  const doctorSignup = isDoctor && state === "Sign up";

  const title =
    doctorSignup
      ? "Join as a Doctor"
      : state === "Sign up"
      ? "Create Account"
      : state === "Reset Password"
        ? "Reset Password"
        : state === "Verify OTP"
          ? "Verify Email"
          : "Welcome back";

  const subtitle =
    state === "Reset Password"
      ? "Enter your email to receive a reset link"
      : state === "Verify OTP"
        ? "Check your email for the 6-digit code"
        : doctorSignup
          ? "Apply to join MindCare. An admin reviews every application."
          : isDoctor
            ? "Sign in to open your Doctor Panel"
            : `Please ${state === "Sign up" ? "create an account" : "sign in"} to book an appointment`;

  return (
    <AuthCard title={title} subtitle={subtitle} onSubmit={doctorSignup ? (e) => e.preventDefault() : onSubmitHandler} wide={doctorSignup}>
      {(state === "Sign in" || state === "Sign up") && <RoleToggle role={role} onChange={changeRole} />}

      {doctorSignup ? (
        <>
          <DoctorSignup key={doctorOtpEmail || "new"} initialStep={doctorOtpEmail ? 2 : 0} initialEmail={doctorOtpEmail} />
          <Switch q="Already applied?" cta="Sign in here" onClick={() => setState("Sign in")} />
          <AdminLink />
        </>
      ) : (
      <>
      {/* name / email / password (hidden while verifying OTP or resetting) */}
      {state !== "Verify OTP" && state !== "Reset Password" && (
        <>
          {state === "Sign up" && (
            <Input label="Full Name" type="text" autoComplete="name" onChange={(e) => setName(e.target.value)} value={name} required />
          )}
          <Input label="Email" type="email" autoComplete="email" onChange={(e) => setEmail(e.target.value)} value={email} required />
          <PasswordInput
            label="Password"
            autoComplete={state === "Sign up" ? "new-password" : "current-password"}
            onChange={(e) => setPassword(e.target.value)}
            value={password}
            required
          />
          {state === "Sign up" && (
            <PasswordInput
              label="Confirm Password"
              autoComplete="new-password"
              onChange={(e) => setConfirmPassword(e.target.value)}
              value={confirmPassword}
              error={passwordsDoNotMatch ? "Passwords do not match" : undefined}
              required
            />
          )}
        </>
      )}

      {state === "Reset Password" && (
        <Input label="Email" type="email" autoComplete="email" onChange={(e) => setEmail(e.target.value)} value={email} required />
      )}

      {state === "Verify OTP" && (
        <Input
          label="Enter 6-Digit OTP"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength="6"
          onChange={(e) => setOtp(e.target.value)}
          value={otp}
          required
          inputClassName="text-center font-display text-2xl font-bold tracking-[0.5em]"
          hint={<>OTP sent to <span className="font-semibold text-ink">{email}</span>. Or click the link in your email.</>}
        />
      )}

      {state === "Verify OTP" && (
        <button type="button" className="link -mt-2 self-center text-small disabled:opacity-50" onClick={resendOtp} disabled={isDisabled || cooldown > 0}>
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
      )}

      {state === "Sign in" && (
        <button type="button" className="link -mt-2 self-end text-small" onClick={() => setState("Reset Password")}>
          Forgot Password?
        </button>
      )}

      <Button type="submit" size="lg" block loading={isDisabled} disabled={passwordsDoNotMatch} className="mt-2">
        {state === "Sign up"
          ? "Create Account"
          : state === "Reset Password"
            ? "Send Email"
            : state === "Verify OTP"
              ? "Verify OTP"
              : "Sign in"}
      </Button>

      {state === "Sign up" ? (
        <Switch
          q="Already have an account?"
          cta="Sign in here"
          onClick={() => {
            setState("Sign in");
            setConfirmPassword("");
          }}
        />
      ) : state === "Reset Password" ? (
        <Switch q="Remember your password?" cta="Sign in here" onClick={() => setState("Sign in")} />
      ) : state === "Verify OTP" ? (
        <Switch
          q="Typo in your email?"
          cta="Sign up again"
          onClick={() => {
            setState("Sign up");
            setOtp("");
          }}
        />
      ) : (
        <Switch q="New to MindCare?" cta={isDoctor ? "Apply as a doctor" : "Create an account"} onClick={() => setState("Sign up")} />
      )}
      {(state === "Sign in" || state === "Sign up") && <AdminLink />}
      </>
      )}
    </AuthCard>
  );
};

export default Login;
