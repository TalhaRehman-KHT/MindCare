import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import adminRouter from "./routes/adminRoute.js";
import doctorRouter from "./routes/doctorRoute.js";
import userRouter from "./routes/userRouter.js";
import chatRouter from "./routes/chatRoute.js";
import authRouter from "./routes/authRoute.js";
import { verifyMailer } from "./config/mailer.js";
import appointmentModel from "./models/appointmentModel.js";
import doctorModel from "./models/doctorModel.js";

//APP CONFIGURATION
const app = express();
const PORT = process.env.PORT || 4000;

// Build/refresh indexes (incl. the unique partial slot indexes) and log the result.
const syncIndexes = async () => {
  for (const model of [doctorModel, appointmentModel]) {
    try {
      const dropped = await model.syncIndexes();
      const names = (await model.listIndexes()).map((i) => i.name);
      console.log(`INDEXES ${model.modelName}: ok [${names.join(", ")}]${dropped?.length ? ` dropped: ${dropped.join(", ")}` : ""}`);
    } catch (err) {
      console.error(`INDEXES ${model.modelName}: FAILED — ${err.message} (run: node scripts/migrate.mjs --apply)`);
    }
  }
};

connectDB()
  .then(syncIndexes)
  .catch((err) => console.error("DATABASE ERROR:", err.message));
connectCloudinary();
verifyMailer();

// MIDDLEWARES
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("MindAI backend Working");
});

//API ENDPOINTS
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/user", userRouter);
app.use("/api/chat", chatRouter);
app.use("/api/auth", authRouter);

// JSON errors (e.g. multer file-type / size errors) instead of Express' HTML page
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.code === "LIMIT_FILE_SIZE" ? 413 : err.status || 400;
  res.status(status).json({ success: false, message: err.code === "LIMIT_FILE_SIZE" ? "Image must be 5 MB or smaller" : err.message || "Request failed" });
});

app.listen(PORT, () => {
  console.log(`SERVER IS LISTENING ON PORT http://localhost:${PORT}`);
});
