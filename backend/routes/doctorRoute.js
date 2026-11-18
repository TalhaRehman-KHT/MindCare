import express from "express";
import {
  appointmentsDoctor, doctorList, doctorSlots, appointmentComplete, appointmentCancel, appointmentNoShow,
  doctorDashboard, doctorProfile, updateDoctorProfile, doctorPatients, doctorPatient,
  getSchedule, updateSchedule, addTimeOff, deleteTimeOff,
} from "../controllers/doctorController.js";
import {
  registerDoctor, verifyDoctorOtp, resendDoctorOtp, doctorLogin, doctorLoginHandoff, exchangeHandoffCode,
  applicationStatus, reapplyDoctor, doctorForgotPassword, doctorResetPassword,
} from "../controllers/doctorAuthController.js";
import authDoctor, { authApplicant } from "../middlewares/authDoctor.js";
import upload from "../middlewares/multer.js";

const doctorRouter = express.Router();

// ---- public ----
doctorRouter.get("/list", doctorList);

// ---- signup / approval workflow ----
doctorRouter.post("/register", upload.single("image"), registerDoctor);
doctorRouter.post("/verify-otp", verifyDoctorOtp);
doctorRouter.post("/resend-otp", resendDoctorOtp);
doctorRouter.post("/login", doctorLogin);
doctorRouter.post("/login-handoff", doctorLoginHandoff);
doctorRouter.post("/exchange-code", exchangeHandoffCode);
doctorRouter.get("/application-status", applicationStatus);
doctorRouter.post("/application-status", applicationStatus);
doctorRouter.post("/reapply", authApplicant, upload.single("image"), reapplyDoctor);
doctorRouter.post("/forgot-password", doctorForgotPassword);
doctorRouter.post("/reset-password/:token", doctorResetPassword);

// ---- doctor panel (approved doctors only) ----
doctorRouter.get("/appointments", authDoctor, appointmentsDoctor);
doctorRouter.post("/complete-appointment", authDoctor, appointmentComplete);
doctorRouter.post("/no-show-appointment", authDoctor, appointmentNoShow);
doctorRouter.post("/cancel-appointment", authDoctor, appointmentCancel);
doctorRouter.get("/dashboard", authDoctor, doctorDashboard);
doctorRouter.get("/profile", authDoctor, doctorProfile);
doctorRouter.post("/update-profile", authDoctor, upload.single("image"), updateDoctorProfile);
doctorRouter.get("/patients", authDoctor, doctorPatients);
doctorRouter.get("/patients/:userId", authDoctor, doctorPatient);
doctorRouter.get("/schedule", authDoctor, getSchedule);
doctorRouter.put("/schedule", authDoctor, updateSchedule);
doctorRouter.post("/time-off", authDoctor, addTimeOff);
doctorRouter.delete("/time-off/:id", authDoctor, deleteTimeOff);

// ---- public slots (keep last: parameterised path) ----
doctorRouter.get("/:docId/slots", doctorSlots);

export default doctorRouter;
