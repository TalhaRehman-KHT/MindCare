import { useEffect } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";

/**
 * Page transitions with the native View Transitions API, without needing a
 * data router (keeps the bundle small). Internal <a href="/..."> clicks are
 * wrapped in document.startViewTransition; CSS lives in styles/motion.css.
 * Silently does nothing where unsupported or with reduced motion.
 */
export default function useViewTransitions() {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof document.startViewTransition !== "function") return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");

    const onClick = (e) => {
      if (reduce.matches || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest?.("a[href]");
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // hash / same page
      e.preventDefault();
      document.startViewTransition(() => {
        flushSync(() => navigate(url.pathname + url.search + url.hash));
      });
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate]);
}
