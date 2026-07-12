import { describe, it, expect } from "vitest";
import { normalizePhone, fillTemplate, buildWaLink, TEMPLATES } from "@/lib/whatsapp";

describe("normalizePhone", () => {
  it("strips spaces, dashes and the plus sign", () => {
    expect(normalizePhone("+60 12-345 6789")).toBe("60123456789");
  });

  it("converts a Malaysian leading 0 to the 60 country code", () => {
    expect(normalizePhone("012-345 6789")).toBe("60123456789");
    expect(normalizePhone("0123456789")).toBe("60123456789");
  });

  it("leaves an already-normalised number untouched", () => {
    expect(normalizePhone("60123456789")).toBe("60123456789");
  });
});

describe("fillTemplate", () => {
  it("substitutes every placeholder", () => {
    const out = fillTemplate(TEMPLATES.intro.body, {
      leadName: "Nurul",
      company: "Petronas SB",
      repName: "Hui Ting",
    });
    expect(out).toContain("Hi Nurul");
    expect(out).toContain("Hui Ting");
    expect(out).toContain("Petronas SB");
    expect(out).not.toContain("{");
  });

  it("falls back gracefully when company is missing", () => {
    const out = fillTemplate("Help {company} today", { leadName: "X", repName: "Y" });
    expect(out).toBe("Help your team today");
  });
});

describe("buildWaLink", () => {
  it("builds a wa.me link with a normalised number and URL-encoded message", () => {
    expect(buildWaLink("012-345 6789", "Hi there")).toBe(
      "https://wa.me/60123456789?text=Hi%20there"
    );
  });

  it("encodes special characters in the message", () => {
    const link = buildWaLink("60123456789", "Deal? RM 48,000 & more");
    expect(link.startsWith("https://wa.me/60123456789?text=")).toBe(true);
    expect(link).toContain("%3F"); // ?
    expect(link).toContain("%26"); // &
    expect(link).not.toContain(" ");
  });
});
