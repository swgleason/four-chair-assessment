import type { ChairNumber } from "../lib/scoring";

export type LinkCategory = "group" | "resource";

export interface ChairLinkItem {
  id: string;
  chair: ChairNumber;
  category: LinkCategory;
  title: string;
  description: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt?: string;
}

export type ChairLinkInput = Omit<ChairLinkItem, "id" | "updatedAt">;

export interface ChairLinkRow {
  id: string;
  chair: number;
  category: string;
  title: string;
  description: string;
  url: string;
  sort_order: number;
  is_active: boolean;
  updated_at?: string | null;
}

function isValidHttpUrl(urlString: unknown): boolean {
  if (typeof urlString !== "string" || urlString.trim().length === 0) {
    return false;
  }
  try {
    const parsed = new URL(urlString);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateChairLinkInput(
  input: Partial<ChairLinkInput> | null | undefined,
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

  if (input.category !== "group" && input.category !== "resource") {
    return false;
  }

  if (typeof input.title !== "string" || input.title.trim().length === 0) {
    return false;
  }

  if (
    typeof input.description !== "string" ||
    input.description.trim().length === 0
  ) {
    return false;
  }

  if (!isValidHttpUrl(input.url)) {
    return false;
  }

  return true;
}

export function mapRowToChairLinkItem(row: ChairLinkRow): ChairLinkItem {
  return {
    id: row.id,
    chair: row.chair as ChairNumber,
    category: row.category as LinkCategory,
    title: row.title,
    description: row.description,
    url: row.url,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    ...(row.updated_at ? { updatedAt: row.updated_at } : {}),
  };
}
