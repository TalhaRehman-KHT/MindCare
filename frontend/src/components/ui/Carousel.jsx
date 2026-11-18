import { Children, useCallback, useEffect, useRef, useState } from "react";
import { IconChevronLeft, IconChevronRight } from "./Icons.jsx";

const RM_QUERY = "(prefers-reduced-motion: reduce)";
const reducedMotion = () => typeof matchMedia !== "undefined" && matchMedia(RM_QUERY).matches;
const IDLE_RESUME_MS = 5000; // focus/touch pauses lift after this long without interaction

/** Live prefers-reduced-motion value (follows OS / DevTools emulation changes). */
function useReducedMotion() {
  const [rm, setRm] = useState(reducedMotion);
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const mq = matchMedia(RM_QUERY);
    const on = () => setRm(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return rm;
}

/**
 * Library-free carousel: native CSS scroll-snap (touch/drag/trackpad for free),
 * arrow buttons + dots, left/right arrow keys, optional autoplay (`autoplay` = ms per slide)
 * that loops, pauses on hover / hidden tab / keyboard focus / touch (the last two lift on blur,
 * touch end, or after 5 s idle) and restarts its timer after any manual navigation.
 * Reduced motion: autoplay keeps running, but slides change with an instant jump + opacity fade
 * instead of the sliding scroll animation.
 * Slide width is set with `slideClassName` (e.g. "basis-full", "basis-[78%]").
 */
export default function Carousel({
  children,
  label = "Carousel",
  autoplay = 0,
  slideClassName = "basis-full",
  className = "",
  trackClassName = "",
  showArrows = true,
  showDots = true,
  controlsClassName = "",
}) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [touching, setTouching] = useState(false);
  const rm = useReducedMotion();
  const idleRef = useRef(0);
  const canAutoplay = autoplay > 0 && count > 1;
  const [hidden, setHidden] = useState(() => typeof document !== "undefined" && document.visibilityState === "hidden");

  const goTo = useCallback(
    (i) => {
      const track = trackRef.current;
      if (!track || !count) return;
      const n = (i + count) % count;
      const first = track.children[0];
      const el = track.children[n];
      const instant = reducedMotion();
      track.scrollTo({ left: el.offsetLeft - first.offsetLeft, behavior: instant ? "auto" : "smooth" });
      // reduced motion (autoplaying carousels): no movement, just fade the new slide in
      if (instant && canAutoplay) el.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 350, easing: "ease-out" });
    },
    [count, canAutoplay],
  );

  const atEnd = () => {
    const t = trackRef.current;
    return t && t.scrollLeft + t.clientWidth >= t.scrollWidth - 4;
  };
  const next = useCallback(() => (atEnd() ? goTo(0) : goTo(index + 1)), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // Track the active slide from the scroll position (rAF-throttled).
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const base = track.children[0]?.offsetLeft ?? 0;
        let best = 0;
        let bestDist = Infinity;
        Array.from(track.children).forEach((c, i) => {
          const d = Math.abs(c.offsetLeft - base - track.scrollLeft);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        });
        if (track.scrollLeft > 0 && atEnd()) best = count - 1;
        setIndex(best);
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [count]);

  useEffect(() => {
    if (!canAutoplay) return;
    const onVis = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [canAutoplay]);

  // One timeout per slide: any change of the active slide (auto, arrow, dot, swipe) restarts the countdown.
  const running = canAutoplay && !hovering && !focusPaused && !userPaused && !touching && !hidden;
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(next, autoplay);
    return () => clearTimeout(id);
  }, [running, autoplay, next, index, rm]);

  // Focus / touch pauses never stick: every interaction re-arms a 5 s idle timer that lifts them.
  const armIdle = useCallback(() => {
    clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => {
      setFocusPaused(false);
      setTouching(false);
    }, IDLE_RESUME_MS);
  }, []);
  useEffect(() => () => clearTimeout(idleRef.current), []);

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    }
  };

  return (
    <div
      className={`relative ${className}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      // pause for keyboard focus only (a mouse click on an arrow shouldn't stop the slideshow)
      onFocusCapture={(e) => {
        if (!canAutoplay || !e.target.matches?.(":focus-visible")) return;
        setFocusPaused(true);
        armIdle();
      }}
      onKeyDownCapture={() => focusPaused && armIdle()}
      onBlurCapture={(e) => !e.currentTarget.contains(e.relatedTarget) && setFocusPaused(false)}
      onTouchStart={() => {
        if (!canAutoplay) return;
        setTouching(true);
        armIdle();
      }}
      onTouchMove={() => touching && armIdle()}
      onTouchEnd={() => setTouching(false)}
      onTouchCancel={() => setTouching(false)}
    >
      <div
        ref={trackRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-live={running ? "off" : "polite"}
        className={`no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-[inherit] ${trackClassName}`}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.key ?? i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            className={`shrink-0 snap-start ${slideClassName}`}
          >
            {slide}
          </div>
        ))}
      </div>

      {(showArrows || showDots) && count > 1 && (
        <div className={`mt-3 flex items-center justify-center gap-1 ${controlsClassName}`}>
          {showArrows && (
            <button type="button" onClick={prev} aria-label="Previous slide" className="btn btn-ghost btn-icon">
              <IconChevronLeft size={18} />
            </button>
          )}
          {showDots && (
            <div className="flex items-center">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === index || undefined}
                  className="group grid h-11 w-7 place-items-center"
                >
                  <span
                    className={`block h-2 rounded-full transition-all duration-300 ease-out-soft ${
                      i === index ? "w-6 bg-brand" : "w-2 bg-line-strong group-hover:bg-ink-subtle"
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
          {showArrows && (
            <button type="button" onClick={next} aria-label="Next slide" className="btn btn-ghost btn-icon">
              <IconChevronRight size={18} />
            </button>
          )}
          {canAutoplay && (
            <button
              type="button"
              onClick={() => setUserPaused((p) => !p)}
              aria-label={userPaused ? "Play slideshow" : "Pause slideshow"}
              className="btn btn-ghost btn-icon"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d={userPaused ? "M7 4.5v15l12.5-7.5z" : "M6 4.5h4v15H6zM14 4.5h4v15h-4z"} />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
