export default function Skeleton({ className = "", ...rest }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} {...rest} />;
}
