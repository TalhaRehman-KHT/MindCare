import { Link } from "react-router-dom";
import { assets } from "../assets/assets";
import { ASSISTANT_NAME } from "../config.js";
import { Button, Carousel, Container, IconArrowRight, IconChat, IconLock, IconShield, IconVerified } from "./ui";

// Shared slide layout: copy on the left, visual on the right (stacks on mobile).
const Slide = ({ eyebrow, title, text, actions, visual, titleAs: T = "h2" }) => (
  <div className="grid h-full items-center gap-8 px-6 py-10 sm:px-10 md:grid-cols-[1.05fr_1fr] md:py-14 lg:px-14">
    <div className="flex flex-col items-start gap-5 text-hero-ink">
      <span className="eyebrow text-primary-200!">{eyebrow}</span>
      <T className="text-display font-bold text-hero-ink!">{title}</T>
      <p className="max-w-lg text-primary-100/90">{text}</p>
      <div className="flex flex-wrap gap-3">{actions}</div>
    </div>
    <div className="relative flex min-h-56 items-center justify-center sm:min-h-64">{visual}</div>
  </div>
);

const ChatMock = () => (
  <div aria-hidden="true" className="anim-float w-full max-w-sm rounded-2xl bg-white/8 p-4 ring-1 ring-white/15 backdrop-blur-sm">
    <div className="mb-3 flex items-center gap-2 text-small text-primary-100">
      <img src={assets.logo} alt="" width="28" height="28" className="size-7 rounded-full" />
      {ASSISTANT_NAME}
      <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-primary-200">
        <span className="size-1.5 rounded-full bg-emerald-400" /> Online
      </span>
    </div>
    <div className="flex flex-col gap-2.5 text-small">
      <p className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-white px-3.5 py-2 text-primary-900">
        I can&apos;t switch off at night.
      </p>
      <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-primary-700/80 px-3.5 py-2 text-white">
        That sounds exhausting. Want to try a 2-minute wind-down breathing exercise together?
      </p>
      <span className="inline-flex gap-1 self-start rounded-full bg-primary-700/60 px-3 py-2">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 rounded-full bg-white/80" style={{ animation: `typing-dot 1.2s ${i * 0.15}s infinite` }} />
        ))}
      </span>
    </div>
  </div>
);

const SafetyMock = () => (
  <div aria-hidden="true" className="relative grid place-items-center">
    <div className="absolute size-56 rounded-full bg-primary-400/20 blur-2xl" />
    <div className="anim-float relative grid size-40 place-items-center rounded-[2.5rem] bg-white/10 ring-1 ring-white/20">
      <IconShield size={84} strokeWidth={1.4} className="text-white" />
    </div>
  </div>
);

const Header = () => (
  <Container className="pt-4 sm:pt-6">
    <div className="overflow-hidden rounded-2xl bg-hero shadow-lg">
      <Carousel label="Highlights" autoplay={3000} controlsClassName="mt-0 pb-3 text-white [&_.btn]:text-primary-100 [&_.btn:hover]:bg-white/10 [&_.bg-brand]:bg-white [&_.bg-line-strong]:bg-white/35">
        <Slide
          titleAs="h1"
          eyebrow="Mental health matters"
          title={<>Talk to {ASSISTANT_NAME}, anytime you need to.</>}
          text="A gentle AI companion that listens without judgement — day or night. Sort through your thoughts, learn coping skills, and know when it's time to see a professional."
          actions={
            <>
              <Button as={Link} to="/chatbot" variant="light" size="lg">
                <IconChat size={18} /> Start a conversation
              </Button>
              <Button as="a" href="#speciality" variant="ghost" size="lg" className="text-white! hover:bg-white/10!">
                Book appointment <IconArrowRight size={18} />
              </Button>
            </>
          }
          visual={<ChatMock />}
        />
        <Slide
          eyebrow="MindCare Psychological Clinic"
          title="Book a trusted psychiatrist in minutes."
          text="Browse verified specialists by speciality, see real availability, and reserve the slot that suits you — no phone queues."
          actions={
            <>
              <Button as={Link} to="/doctors" variant="light" size="lg">
                Find a doctor <IconArrowRight size={18} />
              </Button>
              <img src={assets.group_profiles} alt="" width="130" height="56" loading="lazy" decoding="async" className="h-10 w-auto self-center" />
            </>
          }
          visual={
            <img
              src={assets.hero}
              alt="A psychiatrist listening to a patient"
              width="960"
              height="640"
              loading="lazy"
              decoding="async"
              className="w-full max-w-md rounded-2xl bg-white object-cover"
            />
          }
        />
        <Slide
          eyebrow="Privacy & safety"
          title="Private by design. Supportive by nature."
          text="Email-verified accounts, a sign-in that protects your sessions, and conversations that stay in your own account. Only verified clinicians can be booked."
          actions={
            <ul className="grid gap-2 text-small text-primary-100">
              <li className="flex items-center gap-2"><IconLock size={18} /> Secure, verified sign-in</li>
              <li className="flex items-center gap-2"><IconVerified size={18} /> Verified psychiatrists only</li>
            </ul>
          }
          visual={<SafetyMock />}
        />
      </Carousel>
    </div>
  </Container>
);

export default Header;
