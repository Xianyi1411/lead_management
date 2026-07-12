import { describe, it, expect } from "vitest";
import {
  allowedTransitions,
  canTransition,
  isTerminal,
  reopenTarget,
} from "@/lib/transitions";

describe("allowedTransitions", () => {
  it("advances one step forward, with Lost always available, for active statuses", () => {
    expect(allowedTransitions("NEW")).toEqual(["CONTACTED", "LOST"]);
    expect(allowedTransitions("CONTACTED")).toEqual(["QUALIFIED", "LOST"]);
    expect(allowedTransitions("QUALIFIED")).toEqual(["PROPOSAL", "LOST"]);
    expect(allowedTransitions("PROPOSAL")).toEqual(["WON", "LOST"]);
  });

  it("freezes terminal statuses (no plain transitions out of Won/Lost)", () => {
    expect(allowedTransitions("WON")).toEqual([]);
    expect(allowedTransitions("LOST")).toEqual([]);
  });
});

describe("canTransition", () => {
  it("allows forward-by-one and any active → Lost", () => {
    expect(canTransition("NEW", "CONTACTED")).toBe(true);
    expect(canTransition("PROPOSAL", "WON")).toBe(true);
    expect(canTransition("NEW", "LOST")).toBe(true);
    expect(canTransition("QUALIFIED", "LOST")).toBe(true);
  });

  it("rejects skipping stages, moving backwards, and leaving terminals", () => {
    expect(canTransition("NEW", "QUALIFIED")).toBe(false); // skip
    expect(canTransition("NEW", "WON")).toBe(false); // jump to close
    expect(canTransition("QUALIFIED", "CONTACTED")).toBe(false); // backwards
    expect(canTransition("WON", "PROPOSAL")).toBe(false); // reopen is not a plain transition
    expect(canTransition("LOST", "NEW")).toBe(false);
  });
});

describe("isTerminal", () => {
  it("is true only for Won and Lost", () => {
    expect(isTerminal("WON")).toBe(true);
    expect(isTerminal("LOST")).toBe(true);
    expect(isTerminal("NEW")).toBe(false);
    expect(isTerminal("PROPOSAL")).toBe(false);
  });
});

describe("reopenTarget", () => {
  it("reopens Won to Proposal", () => {
    expect(reopenTarget("WON")).toBe("PROPOSAL");
  });

  it("reopens Lost to its prior active status, or Contacted when unknown", () => {
    expect(reopenTarget("LOST", "QUALIFIED")).toBe("QUALIFIED");
    expect(reopenTarget("LOST")).toBe("CONTACTED");
    expect(reopenTarget("LOST", "WON")).toBe("CONTACTED"); // never reopen into a terminal
  });

  it("returns null for active statuses (nothing to reopen)", () => {
    expect(reopenTarget("NEW")).toBeNull();
    expect(reopenTarget("PROPOSAL")).toBeNull();
  });
});
