// WPBakery / page-builder shortcode content → a stream of segments the
// migration turns into rich text, people, page blocks or department heads.
//
// Handles the shortcodes actually used on akatsico.edu.gh:
//   vc_row, vc_column, vc_row_inner, vc_column_inner, vc_column_text,
//   vc_tta_accordion, vc_tta_section, vc_single_image, vc_text_separator,
//   vc_gmaps, lvca_heading, lvca_spacer, mvc_button, tmm,
//   ucaddon_uc_starter_team_member, fluentform.
// Anything else is dropped, keeping its inner text.

export type Segment =
  | { kind: "html"; html: string }
  | { kind: "heading"; text: string; level: 2 | 3 }
  | { kind: "profile"; name: string; imageId: number | null; bioHtml: string }
  | { kind: "member"; name: string; title: string; imageId: number | null }
  | { kind: "team"; name: string }
  | { kind: "map" }
  | { kind: "form" };

interface Node {
  tag: string;
  attrs: Record<string, string>;
  children: Array<Node | string>;
}

const CONTAINERS = new Set([
  "vc_row",
  "vc_column",
  "vc_row_inner",
  "vc_column_inner",
  "vc_column_text",
  "vc_tta_accordion",
  "vc_tta_tabs",
  "vc_tta_section",
  "ucaddon_uc_starter_team_member",
]);

export function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&#8217;|&rsquo;/g, "’")
    .replace(/&quot;|&#8221;|&#8220;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;/g, "–")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of raw.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g)) {
    attrs[m[1]!] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return attrs;
}

function parse(content: string): Node {
  const root: Node = { tag: "root", attrs: {}, children: [] };
  const stack: Array<Node> = [root];
  const re = /\[(\/)?([a-z_][a-z0-9_]*)([^\]]*)\]/g;
  let last = 0;
  for (const m of content.matchAll(re)) {
    const top = stack[stack.length - 1]!;
    if (m.index > last) top.children.push(content.slice(last, m.index));
    last = m.index + m[0].length;
    const [, closing, tag = ""] = m;
    if (closing) {
      const at = stack.map((n) => n.tag).lastIndexOf(tag);
      if (at > 0) stack.length = at;
      continue;
    }
    const node: Node = { tag, attrs: parseAttrs(m[3] ?? ""), children: [] };
    top.children.push(node);
    if (CONTAINERS.has(tag) && !(m[3] ?? "").trim().endsWith("/")) stack.push(node);
  }
  if (last < content.length) stack[stack.length - 1]!.children.push(content.slice(last));
  return root;
}

const COMING_SOON = /^\s*(conten?t?\s+coming\s+soon[!.]?)\s*$/i;
const BLOCK_START = /^<(p|ul|ol|h[1-6]|table|blockquote|figure|pre|hr)\b/i;

// WordPress's wpautop, simplified: blank lines make paragraphs, single
// newlines become <br>, and short label-like lines become subheadings.
export function autop(text: string): string {
  const cleaned = text
    .replace(/\r\n?/g, "\n")
    .replace(/<\/?(div|span)[^>]*>/gi, (t) => (t.startsWith("</div") || t.startsWith("<div") ? "\n\n" : ""))
    .replace(/\u00a0/g, " ")
    .replace(/(<\/(?:ul|ol|table|blockquote|h[1-6]|p)>)/gi, "$1\n\n")
    .replace(/(<(?:ul|ol|table|blockquote|h[1-6])[\s>])/gi, "\n\n$1");
  return cleaned
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b && !COMING_SOON.test(b.replace(/<[^>]+>/g, "")))
    .map((b) => {
      if (BLOCK_START.test(b)) return b;
      const plain = b.replace(/<[^>]+>/g, "").trim();
      if (!plain) return "";
      if (plain.length <= 48 && !/[.,:;!?)]$/.test(plain) && plain.split(/\s+/).length <= 6 && /^[A-Z]/.test(plain) && !b.includes("\n")) {
        return `<h3>${plain}</h3>`;
      }
      return `<p>${b.replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}

function textOf(node: Node | string): string {
  if (typeof node === "string") return node;
  return node.children.map(textOf).join("\n\n");
}

function vcLink(raw: string) {
  const url = /(?:^|\|)url:([^|]*)/.exec(raw)?.[1];
  return url ? decodeURIComponent(url) : raw;
}

const imageIdOf = (v: string | undefined) => (v && /^\d+$/.test(v) ? Number(v) : null);

// A column holding [vc_single_image] + [lvca_heading subtitle="Name"] is a
// person's photo card; the row's other column is their bio.
function profileOf(row: Node): Segment | null {
  const columns = row.children.filter((c): c is Node => typeof c !== "string" && /^vc_column/.test(c.tag));
  if (columns.length < 1) return null;
  let card: { name: string; imageId: number | null } | null = null;
  let cardCol: Node | null = null;
  for (const col of columns) {
    const nodes = col.children.filter((c): c is Node => typeof c !== "string");
    const img = nodes.find((n) => n.tag === "vc_single_image");
    const sub = nodes.find((n) => n.tag === "lvca_heading" && n.attrs.subtitle);
    if (img && sub) {
      card = { name: sub.attrs.subtitle!.trim(), imageId: imageIdOf(img.attrs.image) };
      cardCol = col;
    }
  }
  if (!card) return null;
  const bio = columns
    .filter((c) => c !== cardCol)
    .map((c) => autop(textOf(c)))
    .join("");
  return { kind: "profile", ...card, bioHtml: bio };
}

function walk(node: Node | string, out: Array<Segment>) {
  const pushHtml = (html: string) => {
    if (!html.trim()) return;
    const prev = out[out.length - 1];
    if (prev?.kind === "html") prev.html += html;
    else out.push({ kind: "html", html });
  };

  if (typeof node === "string") {
    pushHtml(autop(node));
    return;
  }
  const { tag, attrs } = node;
  switch (tag) {
    case "vc_row":
    case "vc_row_inner": {
      const profile = profileOf(node);
      if (profile) {
        out.push(profile);
        return;
      }
      break;
    }
    case "vc_column_text":
      for (const child of node.children) walk(child, out);
      return;
    case "vc_tta_section":
      if (attrs.title) out.push({ kind: "heading", text: attrs.title, level: 3 });
      break;
    case "lvca_heading":
      if (attrs.heading) out.push({ kind: "heading", text: attrs.heading.trim(), level: attrs.style === "style3" ? 2 : 3 });
      else if (attrs.subtitle) pushHtml(`<p><strong>${attrs.subtitle.trim()}</strong></p>`);
      return;
    case "vc_text_separator":
      if (attrs.title) out.push({ kind: "heading", text: attrs.title, level: 3 });
      return;
    case "vc_single_image":
      if (imageIdOf(attrs.image)) pushHtml(`<p><img src="wpimg:${attrs.image}" alt=""></p>`);
      return;
    case "mvc_button": {
      const href = vcLink(attrs.btn_url ?? "");
      if (attrs.btn_text && href && href !== "#") pushHtml(`<p><a href="${href}">${attrs.btn_text}</a></p>`);
      return;
    }
    case "tmm":
      if (attrs.name) out.push({ kind: "team", name: attrs.name });
      return;
    case "ucaddon_uc_starter_team_member":
      if (attrs.name) out.push({ kind: "member", name: attrs.name, title: attrs.designation ?? "", imageId: imageIdOf(attrs.iamge) });
      return;
    case "vc_gmaps":
      out.push({ kind: "map" });
      return;
    case "fluentform":
      out.push({ kind: "form" });
      return;
    case "lvca_spacer":
    case "GRS":
      return;
  }
  for (const child of node.children) walk(child, out);
}

export function toSegments(content: string): Array<Segment> {
  const out: Array<Segment> = [];
  walk(parse(content.replace(/^<p>\s*(\[vc_)/, "$1")), out);
  return out;
}

// Minimal PHP unserialize (strings measured in UTF-8 bytes), for plugin data
// stored in post meta.
export function phpUnserialize(input: string): unknown {
  const buf = Buffer.from(input, "utf8");
  let i = 0;
  const readUntil = (ch: string) => {
    const end = buf.indexOf(ch, i);
    const s = buf.subarray(i, end).toString("utf8");
    i = end + 1;
    return s;
  };
  const value = (): unknown => {
    const type = String.fromCharCode(buf[i]!);
    i += 2;
    switch (type) {
      case "s": {
        const len = Number(readUntil(":"));
        i += 1; // opening quote
        const s = buf.subarray(i, i + len).toString("utf8");
        i += len + 2; // closing quote + ;
        return s;
      }
      case "i":
        return Number(readUntil(";"));
      case "d":
        return Number(readUntil(";"));
      case "b":
        return readUntil(";") === "1";
      case "N":
        return null;
      case "a": {
        const n = Number(readUntil(":"));
        i += 1; // {
        const obj: Record<string, unknown> = {};
        for (let k = 0; k < n; k++) {
          const key = value();
          obj[String(key)] = value();
        }
        i += 1; // }
        return obj;
      }
      default:
        throw new Error(`Unsupported serialized type "${type}" at ${i}`);
    }
  };
  if (input.startsWith("N;")) return null;
  i = 0;
  // `N;` handled above; others start with "x:"
  return value();
}
