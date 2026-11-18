export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  as: Tag = "h2",
  className = "",
  children,
}) {
  const center = align === "center";
  return (
    <div className={`flex flex-col gap-3 ${center ? "items-center text-center" : "items-start"} ${className}`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <Tag className="text-h2 font-bold">{title}</Tag>
      {subtitle && (
        <p className={`max-w-2xl text-ink-muted ${center ? "mx-auto" : ""}`}>{subtitle}</p>
      )}
      {children}
    </div>
  );
}
