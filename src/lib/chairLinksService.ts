import { getDefaultLinksForChair } from "../content/defaultChairLinks";
import type { ChairNumber } from "./scoring";
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import * as supabaseModule from "./supabaseClient";
import {
  mapRowToChairLinkItem,
  validateChairLinkInput,
  type ChairLinkInput,
  type ChairLinkItem,
} from "../types/chairLinks";

function getClient() {
  const configured =
    supabaseModule.isSupabaseConfigured ?? isSupabaseConfigured;
  const client = supabaseModule.supabase ?? supabase;
  return {
    isConfigured: Boolean(configured && client),
    client,
  };
}

export function validateChairLinkPatch(
  patch: Partial<ChairLinkInput> | null | undefined,
): boolean {
  if (!patch || typeof patch !== "object" || Object.keys(patch).length === 0) {
    return false;
  }

  if (
    patch.chair !== undefined &&
    patch.chair !== 1 &&
    patch.chair !== 2 &&
    patch.chair !== 3 &&
    patch.chair !== 4
  ) {
    return false;
  }

  if (
    patch.category !== undefined &&
    patch.category !== "group" &&
    patch.category !== "resource"
  ) {
    return false;
  }

  if (
    patch.title !== undefined &&
    (typeof patch.title !== "string" || patch.title.trim().length === 0)
  ) {
    return false;
  }

  if (
    patch.description !== undefined &&
    (typeof patch.description !== "string" ||
      patch.description.trim().length === 0)
  ) {
    return false;
  }

  if (patch.url !== undefined) {
    if (typeof patch.url !== "string" || patch.url.trim().length === 0) {
      return false;
    }
    try {
      const parsed = new URL(patch.url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return false;
      }
    } catch {
      return false;
    }
  }

  if (
    patch.sortOrder !== undefined &&
    (typeof patch.sortOrder !== "number" || !Number.isInteger(patch.sortOrder))
  ) {
    return false;
  }

  if (patch.isActive !== undefined && typeof patch.isActive !== "boolean") {
    return false;
  }

  return true;
}

export async function fetchLinksForChair(
  chair: ChairNumber,
): Promise<{ items: ChairLinkItem[]; isFallback: boolean }> {
  const { isConfigured, client } = getClient();
  if (!isConfigured || !client) {
    return { items: getDefaultLinksForChair(chair), isFallback: true };
  }

  try {
    const { data, error } = await client
      .from("chair_links")
      .select("*")
      .eq("chair", chair)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data) {
      return { items: getDefaultLinksForChair(chair), isFallback: true };
    }

    return { items: data.map(mapRowToChairLinkItem), isFallback: false };
  } catch {
    return { items: getDefaultLinksForChair(chair), isFallback: true };
  }
}

export async function fetchAllChairLinks(): Promise<ChairLinkItem[]> {
  const { isConfigured, client } = getClient();
  if (!isConfigured || !client) {
    throw new Error(
      "Supabase is not configured. Cannot fetch admin chair links.",
    );
  }

  const { data, error } = await client
    .from("chair_links")
    .select("*")
    .order("chair", { ascending: true })
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error || !data) {
    throw new Error(
      `Failed to fetch chair links: ${error?.message ?? "No data returned"}`,
    );
  }

  return data.map(mapRowToChairLinkItem);
}

export async function createChairLink(
  input: ChairLinkInput,
): Promise<ChairLinkItem> {
  if (!validateChairLinkInput(input)) {
    throw new Error(
      "Invalid chair link input: must provide valid chair (1-4), category ('group' | 'resource'), non-empty title/description, and valid http(s) URL.",
    );
  }

  const { isConfigured, client } = getClient();
  if (!isConfigured || !client) {
    throw new Error(
      "Supabase is not configured. Cannot perform create operation.",
    );
  }

  const { data, error } = await client
    .from("chair_links")
    .insert({
      chair: input.chair,
      category: input.category,
      title: input.title.trim(),
      description: input.description.trim(),
      url: input.url.trim(),
      sort_order: input.sortOrder ?? 0,
      is_active: input.isActive ?? true,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to create chair link: ${error?.message ?? "No data returned"}`,
    );
  }

  return mapRowToChairLinkItem(data);
}

export async function updateChairLink(
  id: string,
  patch: Partial<ChairLinkInput>,
): Promise<ChairLinkItem> {
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    throw new Error("Invalid id provided for update.");
  }

  if (!validateChairLinkPatch(patch)) {
    throw new Error(
      "Invalid chair link update patch: must provide valid fields.",
    );
  }

  const { isConfigured, client } = getClient();
  if (!isConfigured || !client) {
    throw new Error(
      "Supabase is not configured. Cannot perform update operation.",
    );
  }

  const updates: Record<string, unknown> = {};
  if (patch.chair !== undefined) updates.chair = patch.chair;
  if (patch.category !== undefined) updates.category = patch.category;
  if (patch.title !== undefined) updates.title = patch.title.trim();
  if (patch.description !== undefined)
    updates.description = patch.description.trim();
  if (patch.url !== undefined) updates.url = patch.url.trim();
  if (patch.sortOrder !== undefined) updates.sort_order = patch.sortOrder;
  if (patch.isActive !== undefined) updates.is_active = patch.isActive;

  const { data, error } = await client
    .from("chair_links")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to update chair link: ${error?.message ?? "No data returned"}`,
    );
  }

  return mapRowToChairLinkItem(data);
}

export async function deleteChairLink(id: string): Promise<void> {
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    throw new Error("Invalid id provided for deletion.");
  }

  const { isConfigured, client } = getClient();
  if (!isConfigured || !client) {
    throw new Error(
      "Supabase is not configured. Cannot perform delete operation.",
    );
  }

  const { error } = await client.from("chair_links").delete().eq("id", id);
  if (error) {
    throw new Error(`Failed to delete chair link: ${error.message}`);
  }
}

export async function reorderChairLinks(
  orderedIds: readonly string[],
): Promise<void> {
  if (!Array.isArray(orderedIds)) {
    throw new Error("orderedIds must be an array of IDs.");
  }

  if (orderedIds.length === 0) {
    return;
  }

  const { isConfigured, client } = getClient();
  if (!isConfigured || !client) {
    throw new Error(
      "Supabase is not configured. Cannot perform reorder operations.",
    );
  }

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      client.from("chair_links").update({ sort_order: index }).eq("id", id),
    ),
  );

  for (const { error } of results) {
    if (error) {
      throw new Error(`Failed to reorder chair links: ${error.message}`);
    }
  }
}
