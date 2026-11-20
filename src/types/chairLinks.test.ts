import { describe, expect, it } from "vitest";
import {
  mapRowToChairLinkItem,
  validateChairLinkInput,
  type ChairLinkInput,
  type ChairLinkRow,
} from "./chairLinks";

describe("validateChairLinkInput", () => {
  it("accepts valid group and resource inputs with https:// and http:// URLs", () => {
    const validGroup: ChairLinkInput = {
      chair: 1,
      category: "group",
      title: "Alpha Group",
      description: "A small group for seekers to explore faith.",
      url: "https://example.com/alpha",
      sortOrder: 0,
      isActive: true,
    };

    const validResource: ChairLinkInput = {
      chair: 2,
      category: "resource",
      title: "Bible Reading Plan",
      description: "A 30-day foundational reading plan.",
      url: "http://example.org/plan",
      sortOrder: 1,
      isActive: true,
    };

    expect(validateChairLinkInput(validGroup)).toBe(true);
    expect(validateChairLinkInput(validResource)).toBe(true);
  });

  it("accepts valid input without optional sortOrder or isActive", () => {
    const minimal = {
      chair: 3 as const,
      category: "group" as const,
      title: "Leadership Collective",
      description: "Bi-weekly training cohort.",
      url: "https://example.com/lead",
    };

    expect(validateChairLinkInput(minimal)).toBe(true);
  });

  it("rejects missing or whitespace-only title", () => {
    const base: ChairLinkInput = {
      chair: 1,
      category: "group",
      title: "Valid Title",
      description: "Valid description",
      url: "https://example.com",
      sortOrder: 0,
      isActive: true,
    };

    expect(validateChairLinkInput({ ...base, title: "" })).toBe(false);
    expect(validateChairLinkInput({ ...base, title: "   " })).toBe(false);
    expect(validateChairLinkInput({ ...base, title: undefined })).toBe(false);
  });

  it("rejects missing or whitespace-only description", () => {
    const base: ChairLinkInput = {
      chair: 1,
      category: "resource",
      title: "Valid Title",
      description: "Valid description",
      url: "https://example.com",
      sortOrder: 0,
      isActive: true,
    };

    expect(validateChairLinkInput({ ...base, description: "" })).toBe(false);
    expect(
      validateChairLinkInput({ ...base, description: "   \t\n  " }),
    ).toBe(false);
    expect(validateChairLinkInput({ ...base, description: undefined })).toBe(
      false,
    );
  });

  it("rejects invalid chair numbers (e.g., 0, 5, negative numbers, non-integers)", () => {
    const base = {
      category: "group" as const,
      title: "Valid Title",
      description: "Valid description",
      url: "https://example.com",
    };

    expect(validateChairLinkInput({ ...base, chair: 0 as any })).toBe(false);
    expect(validateChairLinkInput({ ...base, chair: 5 as any })).toBe(false);
    expect(validateChairLinkInput({ ...base, chair: -1 as any })).toBe(false);
    expect(validateChairLinkInput({ ...base, chair: 2.5 as any })).toBe(false);
    expect(validateChairLinkInput({ ...base, chair: undefined })).toBe(false);

    // Verify all 4 valid chair numbers are accepted
    expect(validateChairLinkInput({ ...base, chair: 1 })).toBe(true);
    expect(validateChairLinkInput({ ...base, chair: 2 })).toBe(true);
    expect(validateChairLinkInput({ ...base, chair: 3 })).toBe(true);
    expect(validateChairLinkInput({ ...base, chair: 4 })).toBe(true);
  });

  it("rejects invalid category values", () => {
    const base = {
      chair: 1 as const,
      title: "Valid Title",
      description: "Valid description",
      url: "https://example.com",
    };

    expect(
      validateChairLinkInput({ ...base, category: "other" as any }),
    ).toBe(false);
    expect(validateChairLinkInput({ ...base, category: "" as any })).toBe(
      false,
    );
    expect(
      validateChairLinkInput({ ...base, category: "GROUPS" as any }),
    ).toBe(false);
    expect(validateChairLinkInput({ ...base, category: undefined })).toBe(
      false,
    );
  });

  it("rejects unsafe or malformed URLs (javascript:alert(1), not-a-url, empty string)", () => {
    const base = {
      chair: 1 as const,
      category: "group" as const,
      title: "Valid Title",
      description: "Valid description",
    };

    expect(
      validateChairLinkInput({ ...base, url: "javascript:alert(1)" }),
    ).toBe(false);
    expect(validateChairLinkInput({ ...base, url: "not-a-url" })).toBe(false);
    expect(validateChairLinkInput({ ...base, url: "" })).toBe(false);
    expect(validateChairLinkInput({ ...base, url: "   " })).toBe(false);
    expect(
      validateChairLinkInput({
        ...base,
        url: "data:text/html,<script>alert(1)</script>",
      }),
    ).toBe(false);
    expect(
      validateChairLinkInput({ ...base, url: "ftp://example.com" }),
    ).toBe(false);
    expect(validateChairLinkInput({ ...base, url: undefined })).toBe(false);
  });

  it("rejects null or non-object input", () => {
    expect(validateChairLinkInput(null)).toBe(false);
    expect(validateChairLinkInput(undefined)).toBe(false);
    expect(validateChairLinkInput("invalid" as any)).toBe(false);
  });
});

describe("mapRowToChairLinkItem", () => {
  it("converts snake_case database fields into camelCase ChairLinkItem", () => {
    const row: ChairLinkRow = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      chair: 2,
      category: "group",
      title: "Discipleship 101",
      description: "Foundational discipleship group",
      url: "https://example.com/discipleship",
      sort_order: 3,
      is_active: true,
      updated_at: "2026-11-20T04:00:00Z",
    };

    const item = mapRowToChairLinkItem(row);

    expect(item).toEqual({
      id: "123e4567-e89b-12d3-a456-426614174000",
      chair: 2,
      category: "group",
      title: "Discipleship 101",
      description: "Foundational discipleship group",
      url: "https://example.com/discipleship",
      sortOrder: 3,
      isActive: true,
      updatedAt: "2026-11-20T04:00:00Z",
    });
  });

  it("handles rows with null or omitted updated_at", () => {
    const rowWithNullDate: ChairLinkRow = {
      id: "abc-123",
      chair: 4,
      category: "resource",
      title: "Multiplying Disciples PDF",
      description: "Guidebook for spiritual parents",
      url: "https://example.com/guide.pdf",
      sort_order: 0,
      is_active: false,
      updated_at: null,
    };

    const item = mapRowToChairLinkItem(rowWithNullDate);

    expect(item).toEqual({
      id: "abc-123",
      chair: 4,
      category: "resource",
      title: "Multiplying Disciples PDF",
      description: "Guidebook for spiritual parents",
      url: "https://example.com/guide.pdf",
      sortOrder: 0,
      isActive: false,
    });
    expect(item.updatedAt).toBeUndefined();
  });
});
