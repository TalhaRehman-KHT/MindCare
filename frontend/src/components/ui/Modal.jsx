import { useEffect, useRef } from "react";
import { IconX } from "./Icons.jsx";

// Accessible modal built on the native <dialog> (focus trap + Esc for free).
export default function Modal({ open, onClose, title, children, footer, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose?.();
      }}
      onClick={(e) => e.target === ref.current && onClose?.()}
      aria-labelledby={title ? "modal-title" : undefined}
      className={`m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-lg backdrop:bg-black/45 anim-scale-in ${className}`}
    >
      {open && (
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-4">
            {title && (
              <h2 id="modal-title" className="text-h3 font-semibold">
                {title}
              </h2>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="btn btn-ghost btn-icon btn-sm -mr-2 -mt-1"
            >
              <IconX size={18} />
            </button>
          </div>
          <div className="text-ink-muted">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 pt-2">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
