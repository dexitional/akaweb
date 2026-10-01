import sanitizeHtml from "sanitize-html";

// Rich-text content is stored as HTML from the CMS editor. Everything passes
// through this allowlist on save AND on read, so pages render it directly: no
// scripts, styles (beyond text alignment), event handlers, iframes, or
// non-http(s) URLs ever get through.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "mark", "sub", "sup",
    "blockquote", "ul", "ol", "li", "a", "img", "figure", "figcaption", "hr", "code", "pre",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    "*": ["style"],
  },
  allowedStyles: {
    "*": { "text-align": [/^(left|right|center|justify)$/] },
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  exclusiveFilter: (frame) => frame.tag === "img" && !/^https?:\/\//i.test(frame.attribs.src ?? ""),
  transformTags: {
    // External links open safely in a new tab; site links stay in the tab.
    a: (tagName, attribs): sanitizeHtml.Tag => {
      const href = attribs.href ?? "";
      const internal = (href.startsWith("/") && !href.startsWith("//")) || href.startsWith("#");
      if (internal || /^(mailto|tel):/i.test(href)) return { tagName, attribs: { href } };
      return { tagName, attribs: { href, target: "_blank", rel: "noopener noreferrer" } };
    },
  },
};

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, OPTIONS).trim();
}

// "<p></p>" from an emptied editor counts as no content; an image alone does.
export function isRichTextEmpty(html: string): boolean {
  if (/<img\s/i.test(html)) return false;
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() === "";
}

// Stored HTML → safe HTML, or null when there's nothing to show.
export function toRichHtml(content: string | null): string | null {
  if (!content) return null;
  const html = sanitizeRichText(content);
  return isRichTextEmpty(html) ? null : html;
}

export function cleanRichText(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) return value;
  const html = sanitizeRichText(value);
  return isRichTextEmpty(html) ? null : html;
}

export function plainText(html: string | null, max = 200) {
  if (!html) return "";
  const textOnly = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  return textOnly.length > max ? `${textOnly.slice(0, max - 1).trimEnd()}…` : textOnly;
}
