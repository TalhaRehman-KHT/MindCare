import { useEffect, useState } from "react";

// ONE IntersectionObserver for the whole app (module-level singleton).
// Elements are unobserved after their first reveal.
const callbacks = new WeakMap();
let observer = null;

const getObserver = () => {
  if (observer || typeof IntersectionObserver === "undefined") return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const cb = callbacks.get(entry.target);
        observer.unobserve(entry.target);
        callbacks.delete(entry.target);
        cb?.();
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );
  return observer;
};

export default function useInView(ref) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = getObserver();
    if (!io) {
      setInView(true); // no IO support: just show content
      return;
    }
    callbacks.set(el, () => setInView(true));
    io.observe(el);
    return () => {
      io.unobserve(el);
      callbacks.delete(el);
    };
  }, [ref, inView]);

  return inView;
}
