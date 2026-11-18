import { Children, cloneElement, isValidElement, useRef } from "react";
import useInView from "../../hooks/useInView.js";

/**
 * The ONLY way sections animate in on scroll.
 * <Reveal as="section" variant="fade-up|fade-in|scale-in|slide-left|slide-right"
 *         delay={0} stagger>
 * With `stagger`, direct children animate one after another.
 */
export default function Reveal({
  as: Tag = "div",
  variant = "fade-up",
  delay = 0,
  stagger = false,
  className = "",
  style,
  children,
  ...rest
}) {
  const ref = useRef(null);
  const inView = useInView(ref);

  const content = stagger
    ? Children.map(children, (child, i) =>
        isValidElement(child)
          ? cloneElement(child, { style: { ...child.props.style, "--i": i } })
          : child,
      )
    : children;

  return (
    <Tag
      ref={ref}
      data-stagger={stagger || undefined}
      className={`reveal ${inView ? "is-visible" : ""} ${className}`}
      style={{ "--reveal-anim": variant, "--reveal-delay": `${delay}ms`, ...style }}
      {...rest}
    >
      {content}
    </Tag>
  );
}
