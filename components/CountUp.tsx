"use client";

import { useEffect, useRef } from "react";

const NF = new Intl.NumberFormat("en-MY");

// KPI count-up (DESIGN.md §7). SSR renders the final value, so with JS off or
// reduced motion nothing is ever missing; the animation only enhances. A timeout
// guarantees the final value even if rAF is throttled (backgrounded tab).
export default function CountUp({
  to,
  comma = false,
  duration = 950,
}: {
  to: number;
  comma?: boolean;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const fmt = (v: number) => (comma ? NF.format(v) : String(v));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = fmt(to);
      return;
    }
    let done = false;
    const start = performance.now();
    const tick = (now: number) => {
      if (done) return;
      const p = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(to * e));
      if (p < 1) requestAnimationFrame(tick);
      else {
        done = true;
        el.textContent = fmt(to);
      }
    };
    requestAnimationFrame(tick);
    const fallback = setTimeout(() => {
      done = true;
      el.textContent = fmt(to);
    }, duration + 150);
    return () => {
      done = true;
      clearTimeout(fallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, comma, duration]);

  return <span ref={ref}>{fmt(to)}</span>;
}
