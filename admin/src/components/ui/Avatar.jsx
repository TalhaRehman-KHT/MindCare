import { useState } from "react";
import { cdnImage, cdnSrcSet } from "../../utils/cdnImage.js";

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .filter((w) => !/^dr\.?$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

// Image avatar that falls back to initials when the URL is missing or broken.
export default function Avatar({ src, name = "", size = 40, className = "", square = false }) {
  const [failed, setFailed] = useState(false);
  const shape = square ? "rounded-lg" : "rounded-full";
  const style = { width: size, height: size };

  if (!src || failed) {
    return (
      <span
        role="img"
        aria-label={name || "User"}
        style={{ ...style, fontSize: Math.max(11, size * 0.38) }}
        className={`inline-grid shrink-0 place-items-center bg-brand-soft font-semibold text-brand-strong ${shape} ${className}`}
      >
        {initials(name)}
      </span>
    );
  }
  return (
    <img
      src={cdnImage(src, size * 2)}
      srcSet={cdnSrcSet(src, [size, size * 2])}
      sizes={`${size}px`}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      style={style}
      className={`shrink-0 bg-surface-2 object-cover ${shape} ${className}`}
    />
  );
}
