// Reusable loaders. Spinner inherits the current text color.
// Identical in frontend/ and admin/.
import Skeleton from "./ui/Skeleton.jsx";

const SIZES = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-10 h-10 border-[3px]",
};

const Spinner = ({ size = "sm", className = "" }) => (
  <span
    role="status"
    aria-label="Loading"
    className={`inline-block shrink-0 animate-spin rounded-full border-current border-t-transparent align-middle ${
      SIZES[size] || SIZES.sm
    } ${className}`}
  />
);

export const PageLoader = ({ text = "Loading...", className = "" }) => (
  <div
    className={`anim-fade-in flex w-full flex-col items-center justify-center gap-3 py-20 text-ink-muted ${className}`}
  >
    <Spinner size="lg" className="text-brand" />
    <p className="text-small">{text}</p>
  </div>
);

// Placeholder cards for grids (e.g. doctor cards) while the first load runs
export const SkeletonCards = ({ count = 6, className = "h-72" }) =>
  Array.from({ length: count }, (_, i) => (
    <Skeleton key={i} className={`rounded-xl ${className}`} />
  ));

// Button content: spinner + "Please wait..." while loading, children otherwise
export const ButtonContent = ({ loading, children, text = "Please wait..." }) =>
  loading ? (
    <span className="inline-flex items-center justify-center gap-2">
      <Spinner size="sm" />
      {text}
    </span>
  ) : (
    children
  );

export default Spinner;
