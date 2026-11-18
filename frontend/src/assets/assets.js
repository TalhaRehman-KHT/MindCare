// Only assets that are actually used. Images are pre-optimised WebP.
import hero from "./hero.webp";
import about from "./about.webp";
import appointment from "./appointment.webp";
import contact from "./contact.webp";
import group_profiles from "./group_profiles.webp";
import logo from "./logo.webp";
import spec_forensic from "./spec_forensic.webp";
import spec_addiction from "./spec_addiction.webp";
import spec_clinical from "./spec_clinical.webp";
import spec_child from "./spec_child.webp";
import spec_neuro from "./spec_neuro.webp";

export const assets = { hero, about, appointment, contact, group_profiles, logo };

// Speciality tiles on the home page. `speciality` must match the value stored
// on doctors (see SPECIALITIES in src/config.js).
export const specialityData = [
  { speciality: "Forensic", label: "Forensic", image: spec_forensic },
  { speciality: "Addiction", label: "Addiction", image: spec_addiction },
  { speciality: "Clinical", label: "Clinical", image: spec_clinical },
  { speciality: "Child", label: "Child & Teen", image: spec_child },
  { speciality: "OCD", label: "OCD", image: spec_neuro },
];
