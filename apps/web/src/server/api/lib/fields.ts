import { z } from "zod";

// Optional fields accept "" from CMS forms and store it as NULL; undefined
// (field omitted on PATCH) leaves the column untouched.
export function optionalField<T extends z.ZodType<string>>(schema: T) {
  return z
    .union([schema, z.literal("")])
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null));
}

export const optionalText = (max: number) => optionalField(z.string().trim().max(max));

// Site path ("/about"), absolute URL, mailto: or tel:.
export const linkSchema = z
  .string()
  .trim()
  .max(700)
  .refine(
    (v) => /^(\/|#|https?:\/\/|mailto:|tel:)/i.test(v),
    "Use a path like /about or a full URL",
  );
export const optionalLink = optionalField(linkSchema);

export const urlSchema = z.string().trim().url().max(700);
export const optionalUrl = optionalField(urlSchema);

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
export const optionalDate = optionalField(dateSchema);

// "2026-10-01 14:30:00" (also accepts the datetime-local "2026-10-01T14:30").
export const dateTimeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/, "Use a valid date and time")
  .transform((v) => {
    const s = v.replace("T", " ");
    return s.length === 16 ? `${s}:00` : s;
  });
export const optionalDateTime = z
  .union([dateTimeSchema, z.literal("")])
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? undefined : v || null));

export const slugSchema = z
  .string()
  .trim()
  .max(150)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");

export const reorderSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(500),
});
