import { useContext } from "react";
import { Link } from "react-router-dom";
import { assets } from "../assets/assets";
import { AppContext } from "../../context/AppContext";
import { Button, Container, Reveal } from "./ui";

const Banner = () => {
  const { token } = useContext(AppContext);
  return (
    <Container as="section" className="section">
      <Reveal variant="scale-in" className="relative flex overflow-hidden rounded-2xl bg-hero px-6 sm:px-10 lg:px-14">
        <div className="relative z-(--z-raised) flex-1 py-12 sm:py-16 lg:py-20">
          <h2 className="text-h1 font-bold text-hero-ink!">
            Book an appointment
            <span className="mt-2 block text-primary-200">with 1000+ trusted psychiatrists</span>
          </h2>
          <Button
            as={Link}
            to={token ? "/doctors" : "/login"}
            variant="light"
            size="lg"
            className="mt-8"
          >
            {token ? "Find a doctor" : "Sign in"}
          </Button>
        </div>
        <div className="relative hidden w-[22rem] md:block lg:w-[26rem]">
          <img
            src={assets.appointment}
            alt=""
            width="440"
            height="440"
            loading="lazy"
            decoding="async"
            className="absolute bottom-0 right-0 w-full"
          />
        </div>
      </Reveal>
    </Container>
  );
};

export default Banner;
