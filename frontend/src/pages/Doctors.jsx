import { useContext, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import { SkeletonCards } from "../components/Spinner.jsx";
import DoctorCard from "../components/DoctorCard.jsx";
import { SPECIALITIES } from "../config.js";
import { Container, EmptyState, IconStethoscope, Reveal, SectionHeading } from "../components/ui";

const GRID = "grid grid-cols-[repeat(auto-fill,minmax(min(13rem,100%),1fr))] gap-4 sm:gap-5";

const Doctors = () => {
  const { speciality } = useParams();
  const { doctors, doctorsLoading } = useContext(AppContext);

  const filterDoc = useMemo(
    () => (speciality ? doctors.filter((doc) => doc.speciality === speciality) : doctors),
    [doctors, speciality],
  );

  return (
    <Container className="py-8 sm:py-12">
      <SectionHeading
        as="h1"
        align="left"
        eyebrow="Doctors"
        title={speciality ? `${speciality} specialists` : "All doctors"}
        subtitle="Browse through our specialist doctors and book a slot that suits you."
      />

      {/* Filter chips: tap again to clear (same behaviour as before) */}
      <div
        role="toolbar"
        aria-label="Filter by speciality"
        className="no-scrollbar -mx-(--gutter) mt-8 flex gap-2 overflow-x-auto px-(--gutter) pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        <Link to="/doctors" className="chip" aria-current={!speciality ? "page" : undefined}>
          All
        </Link>
        {SPECIALITIES.map((s) => (
          <Link
            key={s}
            to={speciality === s ? "/doctors" : `/doctors/${s}`}
            aria-current={speciality === s ? "page" : undefined}
            className="chip"
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="mt-8">
        {doctorsLoading ? (
          <div className={GRID}>
            <SkeletonCards count={8} className="aspect-[3/4]" />
          </div>
        ) : filterDoc.length === 0 ? (
          <EmptyState icon={<IconStethoscope />} text="No doctors found for this speciality." />
        ) : (
          <Reveal key={speciality || "all"} stagger className={GRID}>
            {filterDoc.map((item) => (
              <DoctorCard key={item._id} doctor={item} />
            ))}
          </Reveal>
        )}
      </div>
    </Container>
  );
};

export default Doctors;
