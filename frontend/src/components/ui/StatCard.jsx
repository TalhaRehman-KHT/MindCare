// Dashboard stat tile. A container query lets it adapt to whatever column
// width it is placed in (stacks icon above value when narrow).
const TONES = {
  brand: "bg-brand-soft text-brand-strong",
  accent: "bg-accent-50 text-accent-700",
  warm: "bg-warm-100 text-warm-500",
};

export default function StatCard({ icon, label, value, tone = "brand", className = "", style }) {
  return (
    <div className={`@container card card-hover p-4 sm:p-5 ${className}`} style={style}>
      <div className="flex flex-col items-start gap-3 @[12rem]:flex-row @[12rem]:items-center @[12rem]:gap-4">
        <div className={`grid size-12 shrink-0 place-items-center rounded-xl ${TONES[tone] ?? TONES.brand}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-h2 font-bold leading-none">{value}</p>
          <p className="mt-1.5 text-small text-ink-muted">{label}</p>
        </div>
      </div>
    </div>
  );
}
