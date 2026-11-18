import { assets } from "../assets/assets";
import { ASSISTANT_NAME, SITE_NAME } from "../config.js";
import { Card, Container, IconCalendar, IconSparkles, IconStethoscope, Reveal, SectionHeading } from "../components/ui";

const REASONS = [
  { icon: IconStethoscope, title: "Expert Psychiatrists", text: "We connect you with qualified and experienced doctors to ensure you get the best care possible." },
  { icon: IconCalendar, title: "Easy Booking", text: "Book or cancel appointments instantly — no waiting on calls or in queues." },
  { icon: IconSparkles, title: "Modern Platform", text: "Built with modern technology for smooth, fast and secure performance on all devices." },
];

const About = () => (
  <Container className="py-8 sm:py-12">
    <SectionHeading
      as="h1"
      eyebrow="About us"
      title={`Who we are at ${SITE_NAME}`}
      subtitle="Learn more about who we are and what drives us."
    />

    <div className="mt-12 grid items-center gap-10 md:grid-cols-[1fr_1.3fr] lg:gap-16">
      <Reveal variant="slide-right">
        <img
          src={assets.about}
          alt="Two smiling clinicians in a consultation room"
          width="600"
          height="610"
          loading="lazy"
          decoding="async"
          className="w-full rounded-2xl bg-surface-2 shadow-md"
        />
      </Reveal>
      <Reveal variant="slide-left" className="flex flex-col gap-5 text-ink-muted">
        <p>
          Welcome to <strong className="text-brand-strong">{SITE_NAME}</strong>, your intelligent partner in
          mental health and emotional wellbeing. We believe that seeking help should be simple, accessible,
          and stigma-free. That&apos;s why we&apos;ve created a platform where you can easily book in-person
          sessions with certified psychiatrists or chat anytime with {ASSISTANT_NAME}, our AI-powered mental
          health assistant, for instant support.
        </p>
        <p>
          {SITE_NAME} combines modern technology with compassionate care. Whether you&apos;re managing stress,
          anxiety, depression, or just need someone to talk to, we connect you with real experts and empathetic
          AI guidance — helping you take control of your mental wellbeing, anytime and anywhere.
        </p>
        <h2 className="mt-2 text-h3 font-semibold">Our Vision</h2>
        <p>
          Our vision is to redefine how people experience mental healthcare. We aim to bridge the gap between
          technology and emotional health by offering a safe space where human expertise meets AI innovation —
          empowering every mind to heal, grow, and thrive.
        </p>
      </Reveal>
    </div>

    <section className="section pb-0">
      <Reveal>
        <SectionHeading
          title="Why choose us"
          subtitle="We don't just make appointments — we make mental health care easier, faster, and more reliable for everyone."
        />
      </Reveal>
      <Reveal stagger className="mt-10 grid gap-4 sm:gap-6 md:grid-cols-3">
        {REASONS.map(({ icon: Icon, title, text }) => (
          <Card key={title} hover className="flex flex-col gap-3 p-6">
            <span className="grid size-12 place-items-center rounded-xl bg-brand-soft text-brand-strong">
              <Icon />
            </span>
            <h3 className="text-h3 font-semibold">{title}</h3>
            <p className="text-small text-ink-muted">{text}</p>
          </Card>
        ))}
      </Reveal>
    </section>
  </Container>
);

export default About;
