import { Link } from "react-router-dom";
import { specialityData } from "../assets/assets";
import { Container, Reveal, SectionHeading } from "./ui";

const SpecialityMenu = () => (
  <Container as="section" id="speciality" className="section">
    <Reveal>
      <SectionHeading
        eyebrow="Specialities"
        title="Find care that fits you"
        subtitle="Browse our trusted psychiatrists by speciality and book an appointment hassle-free."
      />
    </Reveal>
    <Reveal
      stagger
      className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(min(9.5rem,100%),1fr))] gap-3 sm:gap-4"
    >
      {specialityData.map((item) => (
        <Link
          key={item.speciality}
          to={`/doctors/${item.speciality}`}
          className="card card-hover group flex flex-col items-center gap-3 px-3 py-5 text-center"
        >
          <span className="grid size-20 place-items-center rounded-full bg-brand-soft transition-transform duration-300 ease-spring group-hover:scale-105 sm:size-24">
            <img src={item.image} alt="" width="96" height="96" loading="lazy" decoding="async" className="size-16 sm:size-20" />
          </span>
          <span className="text-small font-semibold">{item.label}</span>
        </Link>
      ))}
    </Reveal>
  </Container>
);

export default SpecialityMenu;
