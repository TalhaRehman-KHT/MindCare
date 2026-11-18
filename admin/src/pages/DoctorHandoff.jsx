import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { DoctorContext } from "../context/DoctorContext";
import { PageLoader } from "../components/Spinner.jsx";
import { Button, Card } from "../components/ui";

// /auth/doctor?code=... — exchanges a one-time code (from the patient app login) for a doctor session.
const DoctorHandoff = () => {
  const [params] = useSearchParams();
  const { backendUrl, setdToken } = useContext(DoctorContext);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const ran = useRef(false); // StrictMode runs effects twice; the code is single-use

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const code = params.get("code");
    // remove the code from the address bar/history immediately
    window.history.replaceState(null, "", "/auth/doctor");
    if (!code) return setError("This sign-in link is missing its code.");
    axios
      .post(`${backendUrl}/api/doctor/exchange-code`, { code })
      .then(({ data }) => {
        if (!data.success) throw new Error(data.message);
        localStorage.setItem("dToken", data.token);
        setdToken(data.token);
        navigate("/doctor-dashboard", { replace: true });
      })
      .catch((e) => setError(e.response?.data?.message || e.message || "Invalid or expired login link"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!error) return <PageLoader className="min-h-dvh" text="Signing you in to the Doctor Panel..." />;
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-(--gutter)">
      <Card className="anim-scale-in w-full max-w-md p-6 text-center sm:p-8">
        <h1 className="text-h2 font-bold">Sign-in link expired</h1>
        <p className="mt-2 text-small text-ink-muted">{error} Links work once and expire after 60 seconds.</p>
        <Button as={Link} to="/doctor/login" className="mt-6">
          Sign in to the Doctor Panel
        </Button>
      </Card>
    </div>
  );
};

export default DoctorHandoff;
