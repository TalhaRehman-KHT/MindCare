import { useContext, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { DoctorContext } from "../context/DoctorContext";
import { assets } from "../assets/assets";
import { Button, Card, Input, PasswordInput } from "../components/ui";

const DoctorResetPassword = () => {
  const { token } = useParams();
  const { backendUrl } = useContext(DoctorContext);
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const mismatch = confirm.length > 0 && password !== confirm;

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (mismatch) return;
    setLoading(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/doctor/reset-password/${token}`, { password });
      if (data.success) {
        toast.success(data.message);
        navigate("/doctor/login", { replace: true });
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-(--gutter) py-10">
      <Card as="form" onSubmit={submit} className="anim-scale-in w-full max-w-md p-6 shadow-lg sm:p-8">
        <img src={assets.logo} alt="" width="56" height="56" className="mx-auto mb-4 size-14 rounded-full" />
        <h1 className="text-center text-h2 font-bold">Choose a new password</h1>
        <div className="mt-6 flex flex-col gap-4">
          <PasswordInput label="New password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 8 characters" required />
          <PasswordInput label="Confirm password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={mismatch ? "Passwords do not match" : undefined} required />
          <Button type="submit" size="lg" block loading={loading} disabled={mismatch}>
            Update password
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DoctorResetPassword;
