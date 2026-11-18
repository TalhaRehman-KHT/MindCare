import { v2 as cloudinary } from "cloudinary";

const connectCloudinary = async () => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_SECRET_KEY,
    });

    // Verify config actually loaded (cloudinary.config() khud throw nahi karta)
    if (
      !process.env.CLOUDINARY_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_SECRET_KEY
    ) {
      throw new Error(
        "Cloudinary credentials missing. Check CLOUDINARY_NAME, CLOUDINARY_API_KEY, CLOUDINARY_SECRET_KEY in .env"
      );
    }

    console.log("Cloudinary connected ");
   
  } catch (error) {
    console.error("Cloudinary connection failed");
    console.error(`   Reason: ${error.message}`);
    // Agar app ko crash karwana ho to throw dobara karein:
    // throw error;
  }
};

export default connectCloudinary;