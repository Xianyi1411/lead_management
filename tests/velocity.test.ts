import { describe, it, expect } from "vitest";
import {
  parseTransition,
  stageHistory,
  avgDaysInStage,
  stageConversion,
  avgSalesCycleDays,
  reachedAt,
  type LeadHistory,
} from "@/lib/velocity";

const T0 = new Date("2026-07-01T00:00:00Z");
const day = (n: number) => new Date(T0.getTime() + n * 86_400_000);

function change(detail: string, atDay: number) {
  return { detail, createdAt: day(atDay) };
}

describe("parseTransition", () => {
  it("parses a plain transition", () => {
    expect(parseTransition("New → Contacted", T0)).toEqual({ from: "NEW", to: "CONTACTED", at: T0 });
  });

  it("ignores the lost-reason suffix after the middle dot", () => {
    expect(parseTransition("Contacted → Lost · Price too high", T0)).toEqual({
      from: "CONTACTED",
      to: "LOST",
      at: T0,
    });
  });

  it("handles reopen rows with a null origin", () => {
    expect(parseTransition("Reopened → Proposal", T0)).toEqual({ from: null, to: "PROPOSAL", at: T0 });
  });

  it("returns null for notes and unrecognised text", () => {
    expect(parseTransition("Intro template", T0)).toBeNull();
    expect(parseTransition("Assigned to Hui Ting", T0)).toBeNull();
    expect(parseTransition("A → B → C", T0)).toBeNull();
  });
});

describe("stageHistory", () => {
  it("starts in NEW at creation and closes each stay on transition", () => {
    const stays = stageHistory(
      day(0),
      [change("New → Contacted", 2), change("Contacted → Qualified", 5)],
      day(9)
    );
    expect(stays).toEqual([
      { status: "NEW", days: 2, ongoing: false },
      { status: "CONTACTED", days: 3, ongoing: false },
      { status: "QUALIFIED", days: 4, ongoing: true },
    ]);
  });

  it("a lead with no changes is one ongoing NEW stay", () => {
    expect(stageHistory(day(0), [], day(7))).toEqual([{ status: "NEW", days: 7, ongoing: true }]);
  });

  it("sorts out-of-order rows and survives a reopen", () => {
    const stays = stageHistory(
      day(0),
      [
        change("Contacted → Lost · Went quiet", 4),
        change("New → Contacted", 1),
        change("Reopened → Contacted", 6),
      ],
      day(8)
    );
    expect(stays.map((s) => s.status)).toEqual(["NEW", "CONTACTED", "LOST", "CONTACTED"]);
    expect(stays[3]).toEqual({ status: "CONTACTED", days: 2, ongoing: true });
  });
});

describe("avgDaysInStage", () => {
  it("averages stays per stage across leads, including ongoing stays", () => {
    const leads: LeadHistory[] = [
      { createdAt: day(0), changes: [change("New → Contacted", 2)] }, // NEW 2d, CONTACTED ongoing 8d
      { createdAt: day(4), changes: [change("New → Contacted", 8)] }, // NEW 4d, CONTACTED ongoing 2d
    ];
    const avg = avgDaysInStage(leads, day(10));
    expect(avg.NEW).toBe(3); // (2+4)/2
    expect(avg.CONTACTED).toBe(5); // (8+2)/2
    expect(avg.QUALIFIED).toBeUndefined();
  });
});

describe("stageConversion", () => {
  it("counts leads that reached each stage and the share that advanced", () => {
    const leads: LeadHistory[] = [
      // won the full funnel
      {
        createdAt: day(0),
        changes: [
          change("New → Contacted", 1),
          change("Contacted → Qualified", 2),
          change("Qualified → Proposal", 3),
          change("Proposal → Won", 4),
        ],
      },
      // stalled in Contacted
      { createdAt: day(0), changes: [change("New → Contacted", 1)] },
      // lost from New — never advanced
      { createdAt: day(0), changes: [change("New → Lost · Not interested", 1)] },
    ];
    const steps = stageConversion(leads, day(10));
    expect(steps[0]).toMatchObject({ from: "NEW", to: "CONTACTED", reached: 3, advanced: 2 });
    expect(steps[0].rate).toBeCloseTo(2 / 3);
    expect(steps[1]).toMatchObject({ from: "CONTACTED", to: "QUALIFIED", reached: 2, advanced: 1 });
    expect(steps[3]).toMatchObject({ from: "PROPOSAL", to: "WON", reached: 1, advanced: 1, rate: 1 });
  });

  it("reports null rates on an empty pipeline instead of dividing by zero", () => {
    for (const step of stageConversion([], day(1))) {
      expect(step.rate).toBeNull();
    }
  });
});

describe("sales cycle", () => {
  it("averages created → Won over won leads only", () => {
    const leads: LeadHistory[] = [
      { createdAt: day(0), changes: [change("New → Contacted", 1), change("Proposal → Won", 10)] },
      { createdAt: day(0), changes: [change("Proposal → Won", 20)] },
      { createdAt: day(0), changes: [change("New → Contacted", 1)] }, // not won — excluded
    ];
    expect(avgSalesCycleDays(leads)).toBe(15);
  });

  it("is null when nothing has been won", () => {
    expect(avgSalesCycleDays([{ createdAt: day(0), changes: [] }])).toBeNull();
  });

  it("reachedAt finds the first transition to the target", () => {
    const changes = [change("Proposal → Won", 9), change("New → Contacted", 1)];
    expect(reachedAt(changes, "WON")).toEqual(day(9));
    expect(reachedAt(changes, "QUALIFIED")).toBeNull();
  });
});
