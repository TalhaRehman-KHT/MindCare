import { Link } from "react-router-dom";
import { Badge } from "./ui";
import { cdnImage, cdnSrcSet } from "../utils/cdnImage.js";

// Shared doctor tile (Top Doctors, Doctors page). Container query keeps the
// text readable whether it sits in a narrow carousel slide or a wide grid cell.
export default function DoctorCard({ doctor, style, eager = false }) {
  return (
    <Link
      to={`/appointment/${doctor._id}`}
      style={style}
      className="@container card card-hover group flex h-full flex-col overflow-hidden"
    >
      <div className="aspect-square overflow-hidden bg-brand-soft">
        <img
          src={cdnImage(doctor.image, 400)}
          srcSet={cdnSrcSet(doctor.image, [240, 400, 560])}
          sizes="(max-width: 640px) 78vw, (max-width: 1024px) 33vw, 240px"
          alt={doctor.name}
          width="400"
          height="400"
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className="size-full object-cover object-top transition-transform duration-500 ease-out-soft group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4 @[15rem]:p-5">
        <Badge tone={doctor.available ? "success" : "neutral"} dot className="self-start">
          {doctor.available ? "Available" : "Not Available"}
        </Badge>
        <h3 className="mt-1 text-h3 font-semibold leading-snug">{doctor.name}</h3>
        <p className="text-small text-ink-muted">{doctor.speciality}</p>
      </div>
    </Link>
  );
}
