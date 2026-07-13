import { describe, it, expect } from "vitest";
import {
  qualificationScore,
  qualificationParts,
  qualificationVerdict,
  dealValuePoints,
  temperatureScore,
  temperature,
  recencyPenalty,
  type QualificationInput,
} from "@/lib/scoring";

const perfect: QualificationInput = {
  budgetStatus: "CONFIRMED",
  authority: "DECISION_MAKER",
  timeline: "IMMEDIATE",
  source: "REFERRAL",
  dealValue: 120_000,
};

const weakest: QualificationInput = {
  budgetStatus: "NONE",
  authority: "UNKNOWN",
  timeline: "UNKNOWN",
  source: "OTHER",
  dealValue: 0,
};

describe("fit score", () => {
  it("a perfect BANT lead scores exactly 100", () => {
    expect(qualificationScore(perfect)).toBe(100);
  });

  it("the weakest possible lead still gets the unknown-floor points, not zero", () => {
    // NONE budget 0 + UNKNOWN authority 8 + UNKNOWN timeline 5 + OTHER source 2 + RM0 deal 0
    expect(qualificationScore(weakest)).toBe(15);
  });

  it("the parts breakdown sums to the score and covers all five dimensions", () => {
    const parts = qualificationParts(perfect);
    expect(parts).toHaveLength(5);
    expect(parts.reduce((s, p) => s + p.points, 0)).toBe(qualificationScore(perfect));
    expect(parts.reduce((s, p) => s + p.max, 0)).toBe(100);
  });

  it("deal value points step at the documented RM bands", () => {
    expect(dealValuePoints(0)).toBe(0);
    expect(dealValuePoints(1_000)).toBe(2);
    expect(dealValuePoints(5_000)).toBe(4);
    expect(dealValuePoints(20_000)).toBe(6);
    expect(dealValuePoints(50_000)).toBe(8);
    expect(dealValuePoints(100_000)).toBe(10);
  });
});

describe("qualification verdict (the intake gate)", () => {
  it("maps score bands to Qualify / Review / Nurture", () => {
    expect(qualificationVerdict(100)).toBe("QUALIFY");
    expect(qualificationVerdict(65)).toBe("QUALIFY");
    expect(qualificationVerdict(64)).toBe("REVIEW");
    expect(qualificationVerdict(40)).toBe("REVIEW");
    expect(qualificationVerdict(39)).toBe("NURTURE");
    expect(qualificationVerdict(0)).toBe("NURTURE");
  });
});

describe("temperature", () => {
  const now = new Date("2026-07-13T12:00:00Z");
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

  it("terminal leads have no temperature", () => {
    for (const status of ["WON", "LOST"] as const) {
      expect(
        temperatureScore({ fitScore: 80, status, lastActivityAt: now, nextFollowUpAt: null, now })
      ).toBeNull();
    }
  });

  it("adds the stage bonus: deeper in the funnel runs hotter", () => {
    const base = { fitScore: 50, lastActivityAt: now, nextFollowUpAt: null, now };
    expect(temperatureScore({ ...base, status: "NEW" })).toBe(50);
    expect(temperatureScore({ ...base, status: "CONTACTED" })).toBe(55);
    expect(temperatureScore({ ...base, status: "QUALIFIED" })).toBe(60);
    expect(temperatureScore({ ...base, status: "PROPOSAL" })).toBe(65);
  });

  it("idle leads cool down in steps", () => {
    expect(recencyPenalty(daysAgo(1), now)).toBe(0);
    expect(recencyPenalty(daysAgo(5), now)).toBe(-5);
    expect(recencyPenalty(daysAgo(10), now)).toBe(-15);
    expect(recencyPenalty(daysAgo(30), now)).toBe(-25);
    expect(recencyPenalty(null, now)).toBe(-25);
  });

  it("an overdue follow-up costs a further 10 points", () => {
    const base = { fitScore: 60, status: "QUALIFIED" as const, lastActivityAt: now, now };
    expect(temperatureScore({ ...base, nextFollowUpAt: daysAgo(1) })).toBe(60); // 60+10-10
    expect(temperatureScore({ ...base, nextFollowUpAt: daysAgo(-1) })).toBe(70); // due tomorrow — no penalty
  });

  it("clamps to 0–100", () => {
    expect(
      temperatureScore({ fitScore: 5, status: "NEW", lastActivityAt: daysAgo(60), nextFollowUpAt: daysAgo(9), now })
    ).toBe(0);
    expect(
      temperatureScore({ fitScore: 100, status: "PROPOSAL", lastActivityAt: now, nextFollowUpAt: null, now })
    ).toBe(100);
  });

  it("bands: ≥70 Hot, ≥45 Warm, else Cold", () => {
    expect(temperature(70)).toBe("HOT");
    expect(temperature(69)).toBe("WARM");
    expect(temperature(45)).toBe("WARM");
    expect(temperature(44)).toBe("COLD");
  });
});
