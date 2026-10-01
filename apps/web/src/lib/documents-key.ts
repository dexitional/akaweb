// How the downloads block's resolved rows are keyed (shared by the server
// resolver and the client renderer).
export function documentsKey(category: string, limit: number) {
  return `${category || "all"}:${limit}`;
}
