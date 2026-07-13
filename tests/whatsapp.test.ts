import { describe, it, expect } from "vitest";
import {
  normalizePhone,
  fillTemplate,
  buildWaLink,
  TEMPLATES,
  ALL_ROLES_CSV,
  parseTemplateRoles,
  templateAllowedFor,
  invalidPlaceholders,
} from "@/lib/whatsapp";

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

describe("template roles (Blueprint §14.9)", () => {
  it("parses the CSV, dropping unknown entries and whitespace", () => {
    expect(parseTemplateRoles("ADMIN, MANAGER")).toEqual(["ADMIN", "MANAGER"]);
    expect(parseTemplateRoles("ADMIN,BOGUS,")).toEqual(["ADMIN"]);
    expect(parseTemplateRoles(ALL_ROLES_CSV)).toEqual(["ADMIN", "MANAGER", "SALES_REP"]);
  });

  it("templateAllowedFor honours the CSV", () => {
    expect(templateAllowedFor("ADMIN,MANAGER", "MANAGER")).toBe(true);
    expect(templateAllowedFor("ADMIN,MANAGER", "SALES_REP")).toBe(false);
    expect(templateAllowedFor("", "ADMIN")).toBe(false);
  });
});

describe("invalidPlaceholders", () => {
  it("accepts the three documented placeholders", () => {
    expect(invalidPlaceholders("Hi {leadName} — {repName} for {company}")).toEqual([]);
    for (const t of Object.values(TEMPLATES)) {
      expect(invalidPlaceholders(t.body)).toEqual([]);
    }
  });

  it("flags typos that would reach a customer", () => {
    expect(invalidPlaceholders("Hi {leadname}, meet {rep}")).toEqual(["{leadname}", "{rep}"]);
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
