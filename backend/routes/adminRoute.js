import express from "express";
import {
  addDoctor, loginAdmin, allDoctors, appointmentsAdmin, appointmentCancel, adminDashboard, deleteDoctor,
  doctorRequests, approveDoctor, rejectDoctor, removeDoctor,
} from "../controllers/adminController.js";
import upload from "../middlewares/multer.js";
import authAdmin from "../middlewares/authAdmin.js";
import { changeAvailability } from "../controllers/doctorController.js";

const adminRouter = express.Router();

adminRouter.post("/login", loginAdmin);
adminRouter.post("/add-doctor", authAdmin, upload.single("image"), addDoctor);
adminRouter.post("/all-doctors", authAdmin, allDoctors);
adminRouter.get("/all-doctors", authAdmin, allDoctors);
adminRouter.post("/change-availability", authAdmin, changeAvailability);
adminRouter.get("/appointments", authAdmin, appointmentsAdmin);
adminRouter.post("/cancel-appointment", authAdmin, appointmentCancel);
adminRouter.get("/dashboard", authAdmin, adminDashboard);

// doctor approval workflow
adminRouter.get("/doctor-requests", authAdmin, doctorRequests);
adminRouter.post("/approve-doctor", authAdmin, approveDoctor);
adminRouter.post("/reject-doctor", authAdmin, rejectDoctor);
adminRouter.post("/remove-doctor", authAdmin, removeDoctor);
adminRouter.post("/delete-doctor", authAdmin, deleteDoctor);

export default adminRouter;
