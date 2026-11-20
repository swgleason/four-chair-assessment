import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultChairLinks,
  getDefaultLinksForChair,
} from "../content/defaultChairLinks";
import type { ChairNumber } from "./scoring";
import {
  createChairLink,
  deleteChairLink,
  fetchAllChairLinks,
  fetchLinksForChair,
  reorderChairLinks,
  updateChairLink,
  validateChairLinkPatch,
} from "./chairLinksService";
import type { ChairLinkInput, ChairLinkRow } from "../types/chairLinks";

let mockIsConfigured = true;
let mockFromImplementation: (table: string) => any;

vi.mock("./supabaseClient", () => ({
  get isSupabaseConfigured() {
    return mockIsConfigured;
  },
  get supabase() {
    if (!mockIsConfigured) return null;
    return {
      from: (table: string) => mockFromImplementation(table),
    };
  },
}));

describe("defaultChairLinks & getDefaultLinksForChair", () => {
  it("exports representative default links across Chairs 1-4 with valid URLs and properties", () => {
    expect(defaultChairLinks.length).toBeGreaterThanOrEqual(8);

    const chairs: ChairNumber[] = [1, 2, 3, 4];
    for (const chair of chairs) {
      const chairLinks = getDefaultLinksForChair(chair);
      expect(chairLinks.length).toBeGreaterThanOrEqual(2);

      // Verify each chair has both 'group' and 'resource'
      const categories = chairLinks.map((l) => l.category);
      expect(categories).toContain("group");
      expect(categories).toContain("resource");

      // Verify sorting by sortOrder ascending
      for (let i = 0; i < chairLinks.length - 1; i++) {
        expect(chairLinks[i].sortOrder).toBeLessThanOrEqual(
          chairLinks[i + 1].sortOrder,
        );
      }

      // Verify URL format and active status
      for (const link of chairLinks) {
        expect(link.chair).toBe(chair);
        expect(link.isActive).toBe(true);
        expect(link.id).toBeTruthy();
        const url = new URL(link.url);
        expect(url.protocol).toBe("https:");
      }
    }
  });
});

describe("validateChairLinkPatch", () => {
  it("accepts valid patches", () => {
    expect(validateChairLinkPatch({ title: "New Title" })).toBe(true);
    expect(validateChairLinkPatch({ chair: 3 })).toBe(true);
    expect(validateChairLinkPatch({ category: "resource" })).toBe(true);
    expect(validateChairLinkPatch({ url: "https://example.com/test" })).toBe(
      true,
    );
    expect(validateChairLinkPatch({ sortOrder: 5 })).toBe(true);
    expect(validateChairLinkPatch({ isActive: false })).toBe(true);
  });

  it("rejects invalid patches", () => {
    expect(validateChairLinkPatch({})).toBe(false);
    expect(validateChairLinkPatch(null)).toBe(false);
    expect(validateChairLinkPatch({ chair: 0 as any })).toBe(false);
    expect(validateChairLinkPatch({ category: "invalid" as any })).toBe(false);
    expect(validateChairLinkPatch({ title: "  " })).toBe(false);
    expect(validateChairLinkPatch({ description: "" })).toBe(false);
    expect(validateChairLinkPatch({ url: "javascript:alert(1)" })).toBe(false);
    expect(validateChairLinkPatch({ sortOrder: 1.5 })).toBe(false);
    expect(validateChairLinkPatch({ isActive: "true" as any })).toBe(false);
  });
});

describe("fetchLinksForChair", () => {
  beforeEach(() => {
    mockIsConfigured = true;
    vi.clearAllMocks();
  });

  it("falls back to default links with isFallback: true when Supabase is unconfigured", async () => {
    mockIsConfigured = false;

    const result = await fetchLinksForChair(1);
    expect(result.isFallback).toBe(true);
    expect(result.items).toEqual(getDefaultLinksForChair(1));
  });

  it("falls back to default links with isFallback: true when Supabase query returns an error", async () => {
    mockFromImplementation = () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: null, error: { message: "DB connection failed" } }),
          }),
        }),
      }),
    });

    const result = await fetchLinksForChair(2);
    expect(result.isFallback).toBe(true);
    expect(result.items).toEqual(getDefaultLinksForChair(2));
  });

  it("falls back to default links with isFallback: true when query throws an exception", async () => {
    mockFromImplementation = () => ({
      select: () => {
        throw new Error("Network crash");
      },
    });

    const result = await fetchLinksForChair(3);
    expect(result.isFallback).toBe(true);
    expect(result.items).toEqual(getDefaultLinksForChair(3));
  });

  it("returns mapped rows with isFallback: false when Supabase query succeeds", async () => {
    const dbRow: ChairLinkRow = {
      id: "row-1",
      chair: 1,
      category: "group",
      title: "Custom DB Group",
      description: "Custom Description",
      url: "https://example.com/custom-group",
      sort_order: 0,
      is_active: true,
      updated_at: "2026-11-20T00:00:00Z",
    };

    mockFromImplementation = () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [dbRow], error: null }),
          }),
        }),
      }),
    });

    const result = await fetchLinksForChair(1);
    expect(result.isFallback).toBe(false);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      id: "row-1",
      chair: 1,
      category: "group",
      title: "Custom DB Group",
      description: "Custom Description",
      url: "https://example.com/custom-group",
      sortOrder: 0,
      isActive: true,
      updatedAt: "2026-11-20T00:00:00Z",
    });
  });

  it("returns an empty array with isFallback: false when Supabase succeeds with no rows", async () => {
    mockFromImplementation = () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    });

    const result = await fetchLinksForChair(4);
    expect(result.isFallback).toBe(false);
    expect(result.items).toEqual([]);
  });
});

describe("fetchAllChairLinks", () => {
  beforeEach(() => {
    mockIsConfigured = true;
    vi.clearAllMocks();
  });

  it("throws when Supabase is unconfigured", async () => {
    mockIsConfigured = false;
    await expect(fetchAllChairLinks()).rejects.toThrow(
      "Supabase is not configured",
    );
  });

  it("throws when query returns an error", async () => {
    mockFromImplementation = () => ({
      select: () => ({
        order: () => ({
          order: () => ({
            order: () =>
              Promise.resolve({
                data: null,
                error: { message: "Permission denied" },
              }),
          }),
        }),
      }),
    });

    await expect(fetchAllChairLinks()).rejects.toThrow("Permission denied");
  });

  it("returns mapped rows on success", async () => {
    const dbRows: ChairLinkRow[] = [
      {
        id: "link-1",
        chair: 1,
        category: "group",
        title: "Group 1",
        description: "Desc 1",
        url: "https://example.com/1",
        sort_order: 0,
        is_active: true,
      },
      {
        id: "link-2",
        chair: 2,
        category: "resource",
        title: "Resource 2",
        description: "Desc 2",
        url: "https://example.com/2",
        sort_order: 1,
        is_active: false,
      },
    ];

    mockFromImplementation = () => ({
      select: () => ({
        order: () => ({
          order: () => ({
            order: () => Promise.resolve({ data: dbRows, error: null }),
          }),
        }),
      }),
    });

    const result = await fetchAllChairLinks();
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Group 1");
    expect(result[1].isActive).toBe(false);
  });
});

describe("createChairLink", () => {
  beforeEach(() => {
    mockIsConfigured = true;
    vi.clearAllMocks();
  });

  it("rejects invalid input before hitting Supabase", async () => {
    const fromSpy = vi.fn();
    mockFromImplementation = fromSpy;

    const invalidInput: any = {
      chair: 5,
      category: "group",
      title: "Title",
      description: "Description",
      url: "https://example.com",
    };

    await expect(createChairLink(invalidInput)).rejects.toThrow(
      "Invalid chair link input",
    );
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it("inserts valid input and returns mapped ChairLinkItem", async () => {
    const input: ChairLinkInput = {
      chair: 2,
      category: "resource",
      title: "  New Resource  ",
      description: "  A helpful guide  ",
      url: "https://example.com/guide",
      sortOrder: 2,
      isActive: true,
    };

    const insertedRow: ChairLinkRow = {
      id: "new-id-123",
      chair: 2,
      category: "resource",
      title: "New Resource",
      description: "A helpful guide",
      url: "https://example.com/guide",
      sort_order: 2,
      is_active: true,
      updated_at: "2026-11-20T01:00:00Z",
    };

    let insertedPayload: any = null;

    mockFromImplementation = (table: string) => {
      expect(table).toBe("chair_links");
      return {
        insert: (payload: any) => {
          insertedPayload = payload;
          return {
            select: () => ({
              single: () =>
                Promise.resolve({ data: insertedRow, error: null }),
            }),
          };
        },
      };
    };

    const result = await createChairLink(input);
    expect(insertedPayload).toEqual({
      chair: 2,
      category: "resource",
      title: "New Resource",
      description: "A helpful guide",
      url: "https://example.com/guide",
      sort_order: 2,
      is_active: true,
    });
    expect(result.id).toBe("new-id-123");
    expect(result.title).toBe("New Resource");
  });

  it("throws when Supabase is unconfigured", async () => {
    mockIsConfigured = false;
    const input: ChairLinkInput = {
      chair: 1,
      category: "group",
      title: "Valid Group",
      description: "Valid Desc",
      url: "https://example.com",
      sortOrder: 0,
      isActive: true,
    };

    await expect(createChairLink(input)).rejects.toThrow(
      "Supabase is not configured",
    );
  });
});

describe("updateChairLink", () => {
  beforeEach(() => {
    mockIsConfigured = true;
    vi.clearAllMocks();
  });

  it("rejects invalid id or invalid patch before hitting Supabase", async () => {
    const fromSpy = vi.fn();
    mockFromImplementation = fromSpy;

    await expect(updateChairLink("", { title: "Title" })).rejects.toThrow(
      "Invalid id provided",
    );
    await expect(updateChairLink("id-1", {})).rejects.toThrow(
      "Invalid chair link update patch",
    );
    await expect(
      updateChairLink("id-1", { url: "javascript:void(0)" }),
    ).rejects.toThrow("Invalid chair link update patch");
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it("updates fields with snake_case and returns mapped item", async () => {
    const updatedRow: ChairLinkRow = {
      id: "id-123",
      chair: 3,
      category: "group",
      title: "Updated Title",
      description: "Updated Description",
      url: "https://example.com/updated",
      sort_order: 4,
      is_active: false,
    };

    let updatedPayload: any = null;
    let targetId: any = null;

    mockFromImplementation = (table: string) => {
      expect(table).toBe("chair_links");
      return {
        update: (payload: any) => {
          updatedPayload = payload;
          return {
            eq: (col: string, val: any) => {
              expect(col).toBe("id");
              targetId = val;
              return {
                select: () => ({
                  single: () =>
                    Promise.resolve({ data: updatedRow, error: null }),
                }),
              };
            },
          };
        },
      };
    };

    const result = await updateChairLink("id-123", {
      title: "  Updated Title  ",
      sortOrder: 4,
      isActive: false,
    });

    expect(targetId).toBe("id-123");
    expect(updatedPayload).toEqual({
      title: "Updated Title",
      sort_order: 4,
      is_active: false,
    });
    expect(result.id).toBe("id-123");
    expect(result.isActive).toBe(false);
  });
});

describe("deleteChairLink", () => {
  beforeEach(() => {
    mockIsConfigured = true;
    vi.clearAllMocks();
  });

  it("rejects invalid id", async () => {
    await expect(deleteChairLink("   ")).rejects.toThrow("Invalid id provided");
  });

  it("calls delete with eq('id', id)", async () => {
    let deletedId: any = null;

    mockFromImplementation = (table: string) => {
      expect(table).toBe("chair_links");
      return {
        delete: () => ({
          eq: (col: string, val: any) => {
            expect(col).toBe("id");
            deletedId = val;
            return Promise.resolve({ error: null });
          },
        }),
      };
    };

    await deleteChairLink("delete-id-1");
    expect(deletedId).toBe("delete-id-1");
  });
});

describe("reorderChairLinks", () => {
  beforeEach(() => {
    mockIsConfigured = true;
    vi.clearAllMocks();
  });

  it("rejects non-array input", async () => {
    await expect(reorderChairLinks(null as any)).rejects.toThrow(
      "orderedIds must be an array",
    );
  });

  it("updates sort_order sequentially for each ID", async () => {
    const updates: Array<{ id: string; sort_order: number }> = [];

    mockFromImplementation = (table: string) => {
      expect(table).toBe("chair_links");
      return {
        update: (payload: any) => ({
          eq: (col: string, val: any) => {
            expect(col).toBe("id");
            updates.push({ id: val, sort_order: payload.sort_order });
            return Promise.resolve({ error: null });
          },
        }),
      };
    };

    await reorderChairLinks(["id-a", "id-b", "id-c"]);
    expect(updates).toEqual([
      { id: "id-a", sort_order: 0 },
      { id: "id-b", sort_order: 1 },
      { id: "id-c", sort_order: 2 },
    ]);
  });
});
