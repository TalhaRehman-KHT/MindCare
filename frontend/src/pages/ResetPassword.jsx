import { useContext, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import AuthCard from "../components/AuthCard.jsx";
import { Button, Input, PasswordInput } from "../components/ui";

const ResetPassword = () => {
  const { backendUrl } = useContext(AppContext);
  const navigate = useNavigate();
  const { token } = useParams(); // reset token from the email link

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    try {
      setIsSubmitting(true);

      const { data } = await axios.post(
        backendUrl + "/api/user/reset-password/" + token,
        { password: newPassword }
      );

      if (data.success) {
        toast.success("Password has been reset successfully!");
        navigate("/login");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const mismatch = confirmNewPassword.length > 0 && newPassword !== confirmNewPassword;

  return (
    <AuthCard title="Reset Password" subtitle="Enter your new password below." onSubmit={onSubmitHandler}>
      <PasswordInput
        label="New Password"
        autoComplete="new-password"
        onChange={(e) => setNewPassword(e.target.value)}
        value={newPassword}
        required
        minLength={6}
        hint="At least 6 characters"
      />
      <PasswordInput
        label="Confirm New Password"
        autoComplete="new-password"
        onChange={(e) => setConfirmNewPassword(e.target.value)}
        value={confirmNewPassword}
        error={mismatch ? "Passwords do not match" : undefined}
        required
      />
      <Button type="submit" size="lg" block loading={isSubmitting} className="mt-2">
        Submit New Password
      </Button>
    </AuthCard>
  );
};

export default ResetPassword;
