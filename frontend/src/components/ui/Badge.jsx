const TONES = {
  neutral: "",
  brand: "badge-brand",
  success: "badge-success",
  warn: "badge-warn",
  danger: "badge-danger",
};

export default function Badge({ tone = "neutral", dot = false, className = "", children, ...rest }) {
  return (
    <span className={`badge ${TONES[tone] ?? ""} ${dot ? "badge-dot" : ""} ${className}`} {...rest}>
      {children}
    </span>
  );
}
