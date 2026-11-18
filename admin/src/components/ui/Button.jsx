import Spinner from "../Spinner.jsx";

const VARIANTS = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  outline: "btn-outline",
  danger: "btn-danger",
  light: "btn-light",
};
const SIZES = { sm: "btn-sm", md: "", lg: "btn-lg" };

/**
 * <Button variant="primary|secondary|ghost|outline|danger|light" size="sm|md|lg"
 *         loading loadingText block icon as={Link} ...>
 * `loading` reuses the shared Spinner and disables the button.
 */
export default function Button({
  as: Tag = "button",
  variant = "primary",
  size = "md",
  loading = false,
  loadingText = "Please wait...",
  block = false,
  iconOnly = false,
  className = "",
  disabled,
  children,
  type,
  ...rest
}) {
  const cls = [
    "btn",
    VARIANTS[variant] ?? VARIANTS.primary,
    SIZES[size] ?? "",
    block && "btn-block",
    iconOnly && "btn-icon",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const isButton = Tag === "button";
  return (
    <Tag
      className={cls}
      {...(isButton ? { type: type || "button", disabled: disabled || loading } : {})}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner size="sm" />
          {!iconOnly && <span>{loadingText}</span>}
        </>
      ) : (
        children
      )}
    </Tag>
  );
}
