// Public, non-secret site config. Values come from frontend/.env (VITE_*).
const env = import.meta.env;

export const SITE_NAME = "MindCare";
export const ASSISTANT_NAME = "MindAI";
export const SUPPORT_EMAIL = env.VITE_SUPPORT_EMAIL || "support@example.com";
export const SUPPORT_PHONE = env.VITE_SUPPORT_PHONE || "+92 000 0000000";
export const OFFICE_ADDRESS = ["26000", "Kohat, Pakistan"];

// Must match the values the admin panel saves (admin AddDoctor select).
export const SPECIALITIES = ["Forensic", "Addiction", "Clinical", "Child", "OCD"];
export const ADMIN_PANEL_URL = (env.VITE_ADMIN_PANEL_URL || "http://localhost:5174").replace(/\/$/, "");
export const EXPERIENCE = ["1 Year", ...Array.from({ length: 9 }, (_, i) => `${i + 2} Years`), "10+ Years"];
