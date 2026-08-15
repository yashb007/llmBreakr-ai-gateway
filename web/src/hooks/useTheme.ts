"use client";

import { useEffect, useState } from "react";

export type Theme = "dark" | "light";
const STORAGE_KEY = "llmbreakr-theme";

// Starts at "dark" to match what the server always renders (it has no way
// to know the stored preference) and what layout.tsx's inline script
// applies before hydration — this effect only exists to pick up a
// previously-stored "light" preference after mount, without causing a
// server/client render mismatch.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    setTheme(current);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    if (next === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  };

  return { theme, toggleTheme };
}
