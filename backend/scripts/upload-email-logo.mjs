// One-off: upload the MindCare logo to Cloudinary for use in emails.
// Usage (from backend/): node scripts/upload-email-logo.mjs   → prints the URL to set as EMAIL_LOGO_URL
// Email clients block data: URIs / local paths and many don't render WebP, so we deliver a PNG over https.
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";

const here = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] || path.resolve(here, "../../frontend/src/assets/logo.webp");

for (const k of ["CLOUDINARY_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_SECRET_KEY"]) {
  if (!process.env[k]) {
    console.error(`Missing ${k} in backend/.env`);
    process.exit(1);
  }
}
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const res = await cloudinary.uploader.upload(file, {
  folder: "mindcare/brand",
  public_id: "email-logo",
  overwrite: true,
  invalidate: true,
  resource_type: "image",
  format: "png",
});
const url = cloudinary.url(res.public_id, { secure: true, format: "png", version: res.version, transformation: [{ width: 280, crop: "limit" }] });
console.log("Uploaded. Add this to backend/.env:");
console.log(`EMAIL_LOGO_URL=${url}`);
