import { describe, expect, it } from "vitest";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

describe("supabaseClient", () => {
  it("exports isSupabaseConfigured as boolean and supabase safely without throwing", () => {
    expect(typeof isSupabaseConfigured).toBe("boolean");
    if (isSupabaseConfigured) {
      expect(supabase).not.toBeNull();
    } else {
      expect(supabase).toBeNull();
    }
  });
});
