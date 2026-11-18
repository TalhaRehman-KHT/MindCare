import { Link } from "react-router-dom";
import { assets } from "../assets/assets";
import { SITE_NAME, SUPPORT_EMAIL, SUPPORT_PHONE } from "../config.js";
import { Container, IconMail, IconPhone } from "./ui";

const linkCls = "inline-flex min-h-10 items-center text-ink-muted transition-colors hover:text-brand-strong";

const Footer = () => (
  <footer className="mt-8 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
    <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
      <div className="max-w-sm">
        <div className="mb-4 flex items-center gap-2.5">
          <img src={assets.logo} alt="" width="40" height="40" loading="lazy" decoding="async" className="size-10 rounded-full" />
          <span className="font-display text-lg font-bold">{SITE_NAME}</span>
        </div>
        <p className="text-small text-ink-muted">
          A calm, private place to look after your mental health — book trusted
          psychiatrists or talk things through with our AI companion, any time.
        </p>
      </div>

      <nav aria-label="Footer">
        <h2 className="mb-3 text-small font-semibold uppercase tracking-wider text-ink-subtle">Company</h2>
        <ul className="text-small">
          <li><Link to="/" className={linkCls}>Home</Link></li>
          <li><Link to="/about" className={linkCls}>About Us</Link></li>
          <li><Link to="/contact" className={linkCls}>Contact Us</Link></li>
          <li><Link to="/doctors" className={linkCls}>Find a Doctor</Link></li>
          <li><Link to="/login?role=doctor&mode=signup" className={linkCls}>Join as a Doctor</Link></li>
        </ul>
      </nav>

      <div>
        <h2 className="mb-3 text-small font-semibold uppercase tracking-wider text-ink-subtle">Get in Touch</h2>
        <ul className="text-small">
          <li>
            <a href={`tel:${SUPPORT_PHONE.replace(/[^\d+]/g, "")}`} className={`${linkCls} gap-2`}>
              <IconPhone size={16} /> {SUPPORT_PHONE}
            </a>
          </li>
          <li>
            <a href={`mailto:${SUPPORT_EMAIL}`} className={`${linkCls} gap-2 break-all`}>
              <IconMail size={16} /> {SUPPORT_EMAIL}
            </a>
          </li>
        </ul>
      </div>
    </Container>
    <div className="border-t border-line">
      <Container className="py-5 text-center text-small text-ink-subtle">
        © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
      </Container>
    </div>
  </footer>
);

export default Footer;
