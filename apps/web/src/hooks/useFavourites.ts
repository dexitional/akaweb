import { useCallback, useSyncExternalStore } from "react";

// Per-browser favourite staff profiles (by slug). Kept in localStorage — the
// directory has no accounts — and shared live across every star on the page.
const STORAGE_KEY = "directory:favourites";
const listeners = new Set<() => void>();
const EMPTY: readonly string[] = [];
let cache: readonly string[] | null = null;

function read(): readonly string[] {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    cache = []; // storage blocked or corrupt — start empty
  }
  return cache;
}

function write(next: readonly string[]) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: keep the in-memory list for this visit.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cache = null; // another tab changed it
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useFavourites() {
  const favourites = useSyncExternalStore(subscribe, read, () => EMPTY);
  const toggle = useCallback((slug: string) => {
    const current = read();
    write(current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]);
  }, []);
  const remove = useCallback((slug: string) => write(read().filter((s) => s !== slug)), []);
  const clearAll = useCallback(() => write([]), []);
  return {
    favourites,
    isFavourite: (slug: string) => favourites.includes(slug),
    toggle,
    remove,
    clearAll,
  };
}
