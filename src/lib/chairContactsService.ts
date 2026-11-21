import { isSupabaseConfigured, supabase } from "./supabaseClient";
import * as supabaseModule from "./supabaseClient";
import {
  mapRowToChairContact,
  validateChairContactInput,
  type ChairContact,
  type ChairContactInput,
  type ChairContactRow,
} from "../types/chairContacts";

function getClient() {
  const configured =
    supabaseModule.isSupabaseConfigured ?? isSupabaseConfigured;
  const client = supabaseModule.supabase ?? supabase;
  return {
    isConfigured: Boolean(configured && client),
    client,
  };
}

export async function fetchChairContacts(): Promise<ChairContact[]> {
  const { isConfigured, client } = getClient();
  if (!isConfigured || !client) {
    throw new Error(
      "Supabase is not configured. Cannot fetch chair contacts.",
    );
  }

  const { data, error } = await client
    .from("chair_contacts")
    .select("*")
    .order("chair", { ascending: true });

  if (error || !data) {
    throw new Error(
      `Failed to fetch chair contacts: ${error?.message ?? "No data returned"}`,
    );
  }

  return (data as ChairContactRow[]).map(mapRowToChairContact);
}

export async function upsertChairContact(
  input: ChairContactInput,
): Promise<ChairContact> {
  if (!validateChairContactInput(input)) {
    throw new Error(
      "Invalid chair contact input: must provide chair (1-4) and valid email address.",
    );
  }

  const { isConfigured, client } = getClient();
  if (!isConfigured || !client) {
    throw new Error(
      "Supabase is not configured. Cannot save chair contact.",
    );
  }

  const payload = {
    chair: input.chair,
    contact_name: input.contactName?.trim() || null,
    contact_email: input.contactEmail.trim().toLowerCase(),
    is_enabled: input.isEnabled ?? true,
  };

  const { data, error } = await client
    .from("chair_contacts")
    .upsert(payload)
    .select()
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to save chair contact: ${error?.message ?? "No data returned"}`,
    );
  }

  return mapRowToChairContact(data as ChairContactRow);
}
