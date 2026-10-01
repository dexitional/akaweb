const HONORIFIC_RE =
  /^(dr\.?\s*\(mrs\.?\)|dr\.?\s*\(mr\.?\)|prof\.?|dr\.?|mr\.?|mrs\.?|ms\.?|miss)\s+/i;

function splitName(fullName: string): { given: string; family: string } {
  const rest = fullName.replace(HONORIFIC_RE, "").trim();
  const words = rest.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return { given: "", family: rest };
  return { given: words.slice(0, -1).join(" "), family: words.at(-1) ?? "" };
}

function escapeVCardText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export interface VCardInput {
  name: string;
  title?: string;
  organization?: string;
  email?: string;
  phone?: string;
  url?: string;
}

/** Builds a vCard 3.0 (RFC 2426) text payload — widely supported by Contacts apps. */
export function buildVCard({ name, title, organization, email, phone, url }: VCardInput): string {
  const { given, family } = splitName(name);

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVCardText(family)};${escapeVCardText(given)};;;`,
    `FN:${escapeVCardText(name)}`,
  ];
  if (title) lines.push(`TITLE:${escapeVCardText(title)}`);
  if (organization) lines.push(`ORG:${escapeVCardText(organization)}`);
  if (phone) lines.push(`TEL;TYPE=WORK,VOICE:${escapeVCardText(phone)}`);
  if (email) lines.push(`EMAIL;TYPE=WORK:${escapeVCardText(email)}`);
  if (url) lines.push(`URL:${escapeVCardText(url)}`);
  lines.push("END:VCARD");

  return lines.join("\r\n");
}

/** Slug-safe filename for the downloaded .vcf, e.g. "dr-ebenezer-oduro-antiri.vcf". */
export function vCardFileName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return `${slug || "contact"}.vcf`;
}
