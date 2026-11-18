import express from "express";
import { verifyEmail } from "../controllers/authController.js";

const authRouter = express.Router();

authRouter.post("/verify-email", verifyEmail);

export default authRouter;
