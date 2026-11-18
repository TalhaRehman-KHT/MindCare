import { useLayoutEffect, useRef, useState } from "react";
import { Wrap, useFieldProps } from "./Field.jsx";

const Eye = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOff = (p) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="m2 2 20 20" />
  </svg>
);

/** Drop-in for <Input type="password">: same props (label, error, hint, …) plus a show/hide toggle. */
export default function PasswordInput({ label, error, hint, id, className = "", inputClassName = "", ref: externalRef, ...rest }) {
  const { fid, aria } = useFieldProps({ id, error, hint });
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);
  const selection = useRef(null);

  const setRefs = (el) => {
    inputRef.current = el;
    if (typeof externalRef === "function") externalRef(el);
    else if (externalRef) externalRef.current = el;
  };

  const toggle = () => {
    const el = inputRef.current;
    // remember focus + caret so switching the input type doesn't move it
    selection.current = el && document.activeElement === el ? [el.selectionStart, el.selectionEnd] : null;
    setVisible((v) => !v);
  };

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el || !selection.current) return;
    el.focus();
    try {
      el.setSelectionRange(...selection.current);
    } catch {
      /* some input types don't support selection */
    }
    selection.current = null;
  }, [visible]);

  return (
    <Wrap id={fid} label={label} error={error} hint={hint} className={className}>
      <div className="relative">
        <input ref={setRefs} id={fid} {...aria} {...rest} type={visible ? "text" : "password"} className={`field-input pr-11 ${inputClassName}`} />
        <button
          type="button"
          onClick={toggle}
          onMouseDown={(e) => e.preventDefault() /* keep focus in the input */}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          aria-controls={fid}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-ink-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
        >
          {visible ? <EyeOff /> : <Eye />}
        </button>
      </div>
    </Wrap>
  );
}
