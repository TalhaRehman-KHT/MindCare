import express from "express";

import {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  bookAppointment,
  listAppointment,
  cancelAppointment,
  forgotPassword,
  resetPassword,
  verifyOTP,
  resendUserOtp,
} from "../controllers/userController.js";
import authUser from "../middlewares/authUser.js";
import upload from "../middlewares/multer.js";

const userRouter = express.Router();
//REGISTER USER
userRouter.post("/register", registerUser);

//LOGIN USER
userRouter.post("/login", loginUser);

//GET USER DATA
userRouter.get("/get-profile", authUser, getProfile);

//UPDATE PROFILE
userRouter.post(
  "/update-profile",
  upload.single("img"),
  authUser,
  updateProfile,
);

//APPOINTMENT BOOKING API
userRouter.post("/book-appointment", authUser, bookAppointment);

//APOINTMENT PAGE API
userRouter.post("/appointments", authUser, listAppointment);

//CANCEL APPOINTMENT
userRouter.post("/cancel-appointment", authUser, cancelAppointment);

//FORGET PASSWORD
userRouter.post("/forgot-password", forgotPassword);

//RESET PASSWORD ROUTE
userRouter.post("/reset-password/:token", resetPassword);

//OTP VERIFICATION WHILE SIGNING UP
userRouter.post("/verify-otp", verifyOTP);
userRouter.post("/resend-otp", resendUserOtp);

export default userRouter;
