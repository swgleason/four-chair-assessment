import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  mapRowToChairContact,
  validateChairContactInput,
  type ChairContactInput,
  type ChairContactRow,
} from "../types/chairContacts";
import {
  fetchChairContacts,
  upsertChairContact,
} from "./chairContactsService";

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

describe("validateChairContactInput & mapRowToChairContact", () => {
  it("validates valid chair contact input", () => {
    const valid: ChairContactInput = {
      chair: 1,
      contactName: "Pastor John",
      contactEmail: "pastor@ocupc.com",
      isEnabled: true,
    };
    expect(validateChairContactInput(valid)).toBe(true);
  });

  it("rejects invalid chair numbers or malformed emails", () => {
    expect(
      validateChairContactInput({
        chair: 0 as any,
        contactEmail: "test@example.com",
      }),
    ).toBe(false);
    expect(
      validateChairContactInput({
        chair: 5 as any,
        contactEmail: "test@example.com",
      }),
    ).toBe(false);
    expect(
      validateChairContactInput({
        chair: 2,
        contactEmail: "not-an-email",
      }),
    ).toBe(false);
    expect(
      validateChairContactInput({
        chair: 2,
        contactEmail: "",
      }),
    ).toBe(false);
    expect(
      validateChairContactInput({
        chair: 2,
        contactEmail: "test@test.com",
        contactName: 123 as any,
      }),
    ).toBe(false);
  });

  it("maps snake_case database row cleanly to camelCase ChairContact", () => {
    const row: ChairContactRow = {
      chair: 3,
      contact_name: "Leader Sarah",
      contact_email: "sarah@ocupc.com",
      is_enabled: true,
      updated_at: "2026-11-21T00:00:00Z",
    };

    const contact = mapRowToChairContact(row);
    expect(contact).toEqual({
      chair: 3,
      contactName: "Leader Sarah",
      contactEmail: "sarah@ocupc.com",
      isEnabled: true,
      updatedAt: "2026-11-21T00:00:00Z",
    });
  });
});

describe("chairContactsService CRUD", () => {
  beforeEach(() => {
    mockIsConfigured = true;
    vi.clearAllMocks();
  });

  it("throws when Supabase is unconfigured", async () => {
    mockIsConfigured = false;
    await expect(fetchChairContacts()).rejects.toThrow("Supabase is not configured");
    await expect(
      upsertChairContact({ chair: 1, contactEmail: "leader@ocupc.com" }),
    ).rejects.toThrow("Supabase is not configured");
  });

  it("fetches and maps chair contacts", async () => {
    const dbRows: ChairContactRow[] = [
      {
        chair: 1,
        contact_name: "Seeker Leader",
        contact_email: "seeker@ocupc.com",
        is_enabled: true,
        updated_at: "2026-11-21T00:00:00Z",
      },
      {
        chair: 2,
        contact_name: "Believer Leader",
        contact_email: "believer@ocupc.com",
        is_enabled: false,
        updated_at: "2026-11-21T00:00:00Z",
      },
    ];

    mockFromImplementation = () => ({
      select: () => ({
        order: () => Promise.resolve({ data: dbRows, error: null }),
      }),
    });

    const result = await fetchChairContacts();
    expect(result).toHaveLength(2);
    expect(result[0].chair).toBe(1);
    expect(result[0].contactEmail).toBe("seeker@ocupc.com");
    expect(result[1].isEnabled).toBe(false);
  });

  it("upserts chair contact with normalized payload", async () => {
    let upsertedPayload: any = null;
    const returnedRow: ChairContactRow = {
      chair: 4,
      contact_name: "Disciple Leader",
      contact_email: "disciple@ocupc.com",
      is_enabled: true,
      updated_at: "2026-11-21T00:00:00Z",
    };

    mockFromImplementation = (table: string) => {
      expect(table).toBe("chair_contacts");
      return {
        upsert: (payload: any) => {
          upsertedPayload = payload;
          return {
            select: () => ({
              single: () => Promise.resolve({ data: returnedRow, error: null }),
            }),
          };
        },
      };
    };

    const saved = await upsertChairContact({
      chair: 4,
      contactName: "  Disciple Leader  ",
      contactEmail: "  DISCIPLE@OCUPC.COM  ",
      isEnabled: true,
    });

    expect(upsertedPayload).toEqual({
      chair: 4,
      contact_name: "Disciple Leader",
      contact_email: "disciple@ocupc.com",
      is_enabled: true,
    });
    expect(saved.contactEmail).toBe("disciple@ocupc.com");
  });
});
