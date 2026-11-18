import { assets } from "../assets/assets";
import { OFFICE_ADDRESS, SUPPORT_EMAIL, SUPPORT_PHONE } from "../config.js";
import { Card, Container, IconMail, IconMapPin, IconPhone, Reveal, SectionHeading } from "../components/ui";

const Item = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-4">
    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong">
      <Icon size={20} />
    </span>
    <div>
      <p className="text-small font-semibold text-ink-subtle">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  </div>
);

const Contact = () => (
  <Container className="py-8 sm:py-12">
    <SectionHeading as="h1" eyebrow="Contact" title="We're here to help" subtitle="Reach out with questions about appointments, your account, or our services." />

    <div className="mt-12 grid items-center gap-8 md:grid-cols-2 lg:gap-14">
      <Reveal variant="slide-right">
        <img
          src={assets.contact}
          alt="A doctor with a young patient and parent"
          width="560"
          height="560"
          loading="lazy"
          decoding="async"
          className="mx-auto w-full max-w-md rounded-2xl bg-surface-2 shadow-md"
        />
      </Reveal>
      <Reveal variant="slide-left">
        <Card className="flex flex-col gap-6 p-6 sm:p-8">
          <h2 className="text-h3 font-semibold">Our office</h2>
          <Item icon={IconMapPin} label="Address">
            {OFFICE_ADDRESS.map((l) => (
              <span key={l} className="block">{l}</span>
            ))}
          </Item>
          <Item icon={IconPhone} label="Phone">
            <a href={`tel:${SUPPORT_PHONE.replace(/[^\d+]/g, "")}`} className="link">{SUPPORT_PHONE}</a>
          </Item>
          <Item icon={IconMail} label="Email">
            <a href={`mailto:${SUPPORT_EMAIL}`} className="link break-all">{SUPPORT_EMAIL}</a>
          </Item>
        </Card>
      </Reveal>
    </div>
  </Container>
);

export default Contact;
