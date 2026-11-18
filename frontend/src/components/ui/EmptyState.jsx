// Friendly empty / error state. `text` is kept for backwards compatibility.
export default function EmptyState({ icon, title, text = "Nothing to show yet.", action, className = "" }) {
  return (
    <div className={`anim-fade-in flex flex-col items-center gap-3 px-4 py-14 text-center ${className}`}>
      {icon && (
        <div className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-strong">
          {icon}
        </div>
      )}
      {title && <h3 className="text-h3 font-semibold">{title}</h3>}
      <p className="max-w-sm text-small text-ink-muted">{text}</p>
      {action}
    </div>
  );
}
