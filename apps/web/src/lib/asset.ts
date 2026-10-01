// Deploys at the domain root (Vite `base: '/'`) — a helper rather than
// hardcoded strings so a path-prefixed deploy stays a one-line change.
export function asset(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

// CMS image fields hold absolute R2 URLs; anything else is a public/ path.
export function imageSrc(url: string) {
  return /^https?:\/\//.test(url) ? url : asset(url);
}
