import { useId } from "react";

// Label + control + error/hint wrapper shared by Input, Select and Textarea.
export const Wrap = ({ id, label, error, hint, className = "", children }) => (
  <div className={className}>
    {label && (
      <label htmlFor={id} className="field-label">
        {label}
      </label>
    )}
    {children}
    {error ? (
      <p id={`${id}-err`} className="field-error" role="alert">
        {error}
      </p>
    ) : hint ? (
      <p id={`${id}-hint`} className="field-hint">
        {hint}
      </p>
    ) : null}
  </div>
);

export const useFieldProps = ({ id, error, hint }) => {
  const auto = useId();
  const fid = id || auto;
  return {
    fid,
    aria: {
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? `${fid}-err` : hint ? `${fid}-hint` : undefined,
    },
  };
};

export function Input({ label, error, hint, id, className = "", inputClassName = "", ...rest }) {
  const { fid, aria } = useFieldProps({ id, error, hint });
  return (
    <Wrap id={fid} label={label} error={error} hint={hint} className={className}>
      <input id={fid} className={`field-input ${inputClassName}`} {...aria} {...rest} />
    </Wrap>
  );
}

export function Select({ label, error, hint, id, className = "", inputClassName = "", children, ...rest }) {
  const { fid, aria } = useFieldProps({ id, error, hint });
  return (
    <Wrap id={fid} label={label} error={error} hint={hint} className={className}>
      <select id={fid} className={`field-input ${inputClassName}`} {...aria} {...rest}>
        {children}
      </select>
    </Wrap>
  );
}

export function Textarea({ label, error, hint, id, className = "", inputClassName = "", ...rest }) {
  const { fid, aria } = useFieldProps({ id, error, hint });
  return (
    <Wrap id={fid} label={label} error={error} hint={hint} className={className}>
      <textarea id={fid} className={`field-input ${inputClassName}`} {...aria} {...rest} />
    </Wrap>
  );
}
