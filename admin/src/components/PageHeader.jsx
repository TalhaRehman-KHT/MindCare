// Title row used at the top of every admin/doctor page.
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-h1 font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-small text-ink-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
