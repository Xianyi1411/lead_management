// Display formatting helpers. Money uses Malaysian Ringgit grouping.

const RM = new Intl.NumberFormat("en-MY", { maximumFractionDigits: 0 });

/** Accepts a number, string, or Prisma Decimal-like value and renders "RM 48,000". */
export function formatRM(value: number | string | { toString(): string }): string {
  const n = typeof value === "number" ? value : Number(value.toString());
  return `RM ${RM.format(Number.isFinite(n) ? n : 0)}`;
}

/** Plain grouped number, e.g. "486,200" (no currency prefix). */
export function formatNumber(value: number): string {
  return RM.format(value);
}

/** Compact relative time: "just now", "2h ago", "3d ago", or a date for older items. */
export function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const secs = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}
