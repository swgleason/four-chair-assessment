import type { ChairNumber } from "../lib/scoring";

export interface ChairContact {
  chair: ChairNumber;
  contactName?: string | null;
  contactEmail: string;
  isEnabled: boolean;
  updatedAt?: string;
}

export interface ChairContactRow {
  chair: number;
  contact_name: string | null;
  contact_email: string;
  is_enabled: boolean;
  updated_at?: string | null;
}

export interface ChairContactInput {
  chair: ChairNumber;
  contactName?: string | null;
  contactEmail: string;
  isEnabled?: boolean;
}

export function isValidEmail(email: unknown): boolean {
  if (typeof email !== "string" || email.trim().length === 0) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateChairContactInput(
  input: Partial<ChairContactInput> | null | undefined,
): boolean {
  if (!input || typeof input !== "object") {
    return false;
  }

  if (
    input.chair !== 1 &&
    input.chair !== 2 &&
    input.chair !== 3 &&
    input.chair !== 4
  ) {
    return false;
  }

  if (!isValidEmail(input.contactEmail)) {
    return false;
  }

  if (
    input.contactName !== undefined &&
    input.contactName !== null &&
    typeof input.contactName !== "string"
  ) {
    return false;
  }

  if (
    input.isEnabled !== undefined &&
    typeof input.isEnabled !== "boolean"
  ) {
    return false;
  }

  return true;
}

export function mapRowToChairContact(row: ChairContactRow): ChairContact {
  return {
    chair: row.chair as ChairNumber,
    contactName: row.contact_name ?? undefined,
    contactEmail: row.contact_email,
    isEnabled: row.is_enabled,
    ...(row.updated_at ? { updatedAt: row.updated_at } : {}),
  };
}
