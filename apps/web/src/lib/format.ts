// Date/size formatting shared by the site and the CMS.
//
// MySQL returns DATE/DATETIME columns as naive strings ("2026-10-01" or
// "2026-10-01 14:30:00"). Ghana runs on GMT all year, so they're read and
// formatted as UTC — the server render and the browser always agree.

function parse(value: string): Date {
  const [date, time = "00:00:00"] = value.trim().split(/[ T]/);
  return new Date(`${date}T${time.length === 5 ? `${time}:00` : time}Z`);
}

const fmt = (value: string, options: Intl.DateTimeFormatOptions) =>
  parse(value).toLocaleString("en-GB", { timeZone: "UTC", ...options });

// "1 Oct 2026"
export function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return fmt(value, { day: "numeric", month: "short", year: "numeric" });
}

// "Thursday, 1 October 2026"
export function formatLongDate(value: string) {
  return fmt(value, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// "2:30 pm"
export function formatTime(value: string) {
  return fmt(value, { hour: "numeric", minute: "2-digit", hour12: true });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  return `${formatDate(value)}, ${formatTime(value)}`;
}

export function hasTime(value: string) {
  return !/ 00:00:00$/.test(value) && /[ T]\d{2}:\d{2}/.test(value);
}

// { day: "01", month: "Oct" } — for calendar-style date tiles.
export function dateParts(value: string) {
  const d = parse(value);
  return {
    day: String(d.getUTCDate()).padStart(2, "0"),
    month: d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" }),
    year: d.getUTCFullYear(),
  };
}

// "1 Oct 2026", "1 – 3 Oct 2026", "28 Oct – 2 Nov 2026"
export function formatEventRange(start: string, end: string | null) {
  if (!end || end.slice(0, 10) === start.slice(0, 10)) {
    return hasTime(start) ? `${formatDate(start)} · ${formatTime(start)}` : formatDate(start);
  }
  const a = parse(start);
  const b = parse(end);
  const sameYear = a.getUTCFullYear() === b.getUTCFullYear();
  const sameMonth = sameYear && a.getUTCMonth() === b.getUTCMonth();
  const left = fmt(
    start,
    sameMonth
      ? { day: "numeric" }
      : sameYear
        ? { day: "numeric", month: "short" }
        : { day: "numeric", month: "short", year: "numeric" },
  );
  return `${left} – ${formatDate(end)}`;
}

// DB value → <input type="datetime-local"> value and back.
export function toInputDateTime(value: string | null | undefined) {
  if (!value) return "";
  return value.replace(" ", "T").slice(0, 16);
}

export function fromInputDateTime(value: string) {
  if (!value) return "";
  return `${value.replace("T", " ").slice(0, 16)}:00`;
}

export function nowInputDateTime() {
  return new Date().toISOString().slice(0, 16);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function timeAgo(value: string) {
  const seconds = Math.round((Date.now() - parse(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(value);
}

// Rough reading time for an HTML body.
export function readingMinutes(html: string | null) {
  if (!html) return 1;
  const words = html
    .replace(/<[^>]*>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function initials(name: string) {
  return name
    .replace(/^(Prof|Dr|Mr|Mrs|Ms|Rev|Very Rev|Hon)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}
