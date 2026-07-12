import { LeadStatus } from "@/lib/domain";
import { STATUS_UI } from "@/lib/status-ui";

// Status is conveyed by label + colour, never colour alone (accessibility).
// `flush` plays the colour-flush pulse — pair it with key={status} so the pill
// remounts (and pulses) when the status changes.
export default function StatusPill({ status, flush = false }: { status: LeadStatus; flush?: boolean }) {
  const s = STATUS_UI[status];
  return (
    <span className={`pill${flush ? " flush" : ""}`} style={{ background: s.tint, color: s.text }}>
      <i style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}
