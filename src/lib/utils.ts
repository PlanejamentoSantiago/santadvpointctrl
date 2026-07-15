import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmtName(n: string) {
  const preps = ["da", "de", "do", "das", "dos", "e"];
  return n.split(" ").filter(Boolean).map((w) => {
    const lw = w.toLowerCase();
    if (preps.includes(lw)) return lw;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(" ");
}

export function initials(n: string) {
  return n.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
