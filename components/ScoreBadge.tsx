import { temperature } from "@/lib/scoring";
import { TEMP_UI } from "@/lib/status-ui";

// Temperature pill for active leads: "Hot · 82". Same anatomy as StatusPill
// (dot + label, colour never alone) but on the temperature scale, not the
// stage spectrum. Terminal leads render a quiet dash — they aren't worked.
export default function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="unassigned">—</span>;
  const t = TEMP_UI[temperature(score)];
  return (
    <span className="pill" style={{ background: t.tint, color: t.text }}>
      <i style={{ background: t.dot }} />
      {t.label} · <span className="tnum">{score}</span>
    </span>
  );
}
