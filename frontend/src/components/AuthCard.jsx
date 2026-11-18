import { assets } from "../assets/assets";
import { Card } from "./ui";

// Centered card layout shared by Login / Sign up / OTP / Reset password.
export default function AuthCard({ title, subtitle, children, onSubmit, wide = false }) {
  return (
    <div className="grid min-h-[calc(100dvh-var(--nav-h)-4rem)] place-items-center px-(--gutter) py-10">
      <Card as="form" onSubmit={onSubmit} className={`anim-scale-in w-full ${wide ? "max-w-xl" : "max-w-md"} p-6 shadow-lg sm:p-8`}>
        <img src={assets.logo} alt="" width="56" height="56" className="mx-auto mb-4 size-14 rounded-full" />
        <div key={title} className="anim-fade-in text-center">
          <h1 className="text-h2 font-bold">{title}</h1>
          {subtitle && <p className="mt-1.5 text-small text-ink-muted">{subtitle}</p>}
        </div>
        <div className="mt-7 flex flex-col gap-4">{children}</div>
      </Card>
    </div>
  );
}
