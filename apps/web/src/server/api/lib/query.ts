import { z } from "zod";

// Shared list-query params for admin tables and public listings.
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
  q: z.string().trim().max(100).optional().catch(undefined),
});

export function paging(page: number, pageSize: number) {
  return { limit: pageSize, offset: (page - 1) * pageSize };
}

// A LIKE pattern that matches the term literally.
export function likePattern(term: string) {
  return `%${term.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
}

export const idParam = (raw: string | undefined) => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : 0;
};

export const bool = (v: 0 | 1 | boolean | null | undefined) => v === 1 || v === true;
