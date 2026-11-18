import { useContext } from "react";
import { Link } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import { SkeletonCards } from "./Spinner.jsx";
import DoctorCard from "./DoctorCard.jsx";
import { Button, Carousel, Container, EmptyState, IconArrowRight, Reveal, SectionHeading } from "./ui";

const GRID = "grid grid-cols-[repeat(auto-fill,minmax(min(13rem,100%),1fr))] gap-4 sm:gap-5";

const TopDoctors = () => {
  const { doctors, doctorsLoading } = useContext(AppContext);
  const top = doctors.slice(0, 10);

  return (
    <Container as="section" className="section">
      <Reveal>
        <SectionHeading
          eyebrow="Our team"
          title="Top doctors to book"
          subtitle="Simply browse through our extensive list of trusted doctors."
        />
      </Reveal>

      <div className="mt-10">
        {doctorsLoading ? (
          <div className={GRID}>
            <SkeletonCards count={4} className="aspect-[3/4]" />
          </div>
        ) : top.length === 0 ? (
          <EmptyState text="No doctors available right now." />
        ) : (
          <>
            {/* Mobile: swipeable carousel */}
            <div className="md:hidden">
              <Carousel label="Top doctors" slideClassName="basis-[76%] pr-4 sm:basis-[45%]" showArrows={false}>
                {top.map((d) => (
                  <DoctorCard key={d._id} doctor={d} />
                ))}
              </Carousel>
            </div>
            {/* Tablet & desktop: grid */}
            <Reveal stagger className={`hidden md:grid ${GRID}`}>
              {top.map((d) => (
                <DoctorCard key={d._id} doctor={d} />
              ))}
            </Reveal>
          </>
        )}
      </div>

      <div className="mt-10 flex justify-center">
        <Button as={Link} to="/doctors" variant="outline">
          See all doctors <IconArrowRight size={18} />
        </Button>
      </div>
    </Container>
  );
};

export default TopDoctors;
