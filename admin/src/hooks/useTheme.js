import { useCallback, useEffect, useState } from "react";

// Optional light/dark toggle. Default follows the OS (prefers-color-scheme).
const KEY = "mc-theme";

const read = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

const systemDark = () =>
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-color-scheme: dark)").matches;

export default function useTheme() {
  const [theme, setTheme] = useState(() => read() || (systemDark() ? "dark" : "light"));

  useEffect(() => {
    if (read()) document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* storage unavailable: theme still applies for this visit */
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
