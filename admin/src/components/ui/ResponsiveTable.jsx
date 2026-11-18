/**
 * Table at >=640px, stacked label/value cards below 640px.
 * columns: [{ key, label, render(row, i), className }]
 * template: CSS grid-template-columns used for the header and rows at sm+.
 */
export default function ResponsiveTable({ columns, rows, rowKey, template, className = "" }) {
  const gridStyle = { "--cols": template };
  return (
    <div className={`card overflow-hidden ${className}`} role="table">
      <div
        role="row"
        style={gridStyle}
        className="hidden border-b border-line bg-surface-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-subtle sm:grid sm:grid-cols-(--cols) sm:gap-3"
      >
        {columns.map((c) => (
          <span role="columnheader" key={c.key}>
            {c.label}
          </span>
        ))}
      </div>
      <div className="divide-y divide-line">
        {rows.map((row, i) => (
          <div
            role="row"
            key={rowKey ? rowKey(row, i) : i}
            style={gridStyle}
            className="grid gap-2.5 px-4 py-4 text-small transition-colors duration-150 hover:bg-surface-2/60 sm:grid-cols-(--cols) sm:items-center sm:gap-3 sm:px-5"
          >
            {columns.map((c) => (
              <div
                role="cell"
                key={c.key}
                className={`flex min-w-0 items-center justify-between gap-3 sm:block ${c.className ?? ""}`}
              >
                <span className="shrink-0 text-xs font-medium text-ink-subtle sm:hidden">{c.label}</span>
                <div className="min-w-0 text-right sm:text-left">{c.render(row, i)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
