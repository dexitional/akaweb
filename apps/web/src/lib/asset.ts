// Deploys at the domain root (Vite `base: '/'`) — a helper rather than
// hardcoded strings so a path-prefixed deploy stays a one-line change.
export function asset(path: string) {
  // import.meta.env is undefined outside Vite (e.g. tsx scripts).
  const base = (import.meta.env as Partial<ImportMetaEnv> | undefined)?.BASE_URL ?? "/";
  return `${base}${path.replace(/^\//, "")}`;
}

// CMS image fields hold absolute R2 URLs; anything else is a public/ path.
export function imageSrc(url: string) {
  return /^https?:\/\//.test(url) ? url : asset(url);
}
