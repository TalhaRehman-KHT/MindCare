import { Container, IconCalendar, IconChat, IconSearch, Reveal, SectionHeading } from "./ui";

const STEPS = [
  { icon: IconSearch, title: "Choose a speciality", text: "Pick the area you need help with and browse verified psychiatrists." },
  { icon: IconCalendar, title: "Pick a time slot", text: "See real availability for the next 7 days and book in a couple of taps." },
  { icon: IconChat, title: "Get support", text: "Meet your doctor in person — and chat with MindAI any time in between." },
];

const HowItWorks = () => (
  <section className="section bg-surface">
    <Container>
      <Reveal>
        <SectionHeading eyebrow="How it works" title="Three calm steps to care" />
      </Reveal>
      <Reveal as="ol" stagger className="mt-10 grid gap-4 sm:gap-6 md:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="card relative flex flex-col gap-3 p-6">
            <span className="absolute right-5 top-4 font-display text-4xl font-bold text-line">{i + 1}</span>
            <span className="grid size-12 place-items-center rounded-xl bg-brand-soft text-brand-strong">
              <Icon />
            </span>
            <h3 className="text-h3 font-semibold">{title}</h3>
            <p className="text-small text-ink-muted">{text}</p>
          </li>
        ))}
      </Reveal>
    </Container>
  </section>
);

export default HowItWorks;
