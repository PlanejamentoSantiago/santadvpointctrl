"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

/** Lê e observa o tema atual (data-theme no <html>) e expõe um toggle persistido. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const read = () =>
      setTheme((document.documentElement.dataset.theme as Theme) || "light");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const toggle = () => {
    const next: Theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    const apply = () => {
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("pc-theme", next); } catch {}
    };
    // crossfade suave do tema quando o navegador suporta View Transitions
    const start = (document as unknown as { startViewTransition?: (cb: () => void) => void }).startViewTransition;
    if (typeof start === "function") start.call(document, apply);
    else apply();
  };

  return { theme, toggle };
}
