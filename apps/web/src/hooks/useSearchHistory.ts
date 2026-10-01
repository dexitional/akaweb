import { useCallback, useSyncExternalStore } from "react";

// Per-browser directory search history: recent terms and named saved searches.
// localStorage-backed and shared live across components on the page.
const RECENT_KEY = "directory:recent-searches";
const SAVED_KEY = "directory:saved-searches";
const RECENT_LIMIT = 6;
const SAVED_LIMIT = 12;

export interface SavedSearch {
  name: string;
  query: string;
}

function createStore<T>(key: string, isItem: (value: unknown) => value is T) {
  const listeners = new Set<() => void>();
  const empty: T[] = [];
  let cache: T[] | null = null;

  function read(): T[] {
    if (cache) return cache;
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
      cache = Array.isArray(parsed) ? parsed.filter(isItem) : [];
    } catch {
      cache = [];
    }
    return cache;
  }

  function write(next: T[]) {
    cache = next;
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage unavailable: keep them for this visit only.
    }
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { read, write, subscribe, empty };
}

const recentStore = createStore<string>(RECENT_KEY, (v): v is string => typeof v === "string");
const savedStore = createStore<SavedSearch>(
  SAVED_KEY,
  (v): v is SavedSearch =>
    typeof v === "object" &&
    v !== null &&
    typeof (v as SavedSearch).name === "string" &&
    typeof (v as SavedSearch).query === "string",
);

export function rememberSearch(term: string) {
  const clean = term.trim();
  if (!clean) return;
  recentStore.write(
    [clean, ...recentStore.read().filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(
      0,
      RECENT_LIMIT,
    ),
  );
}

export function useSearchHistory() {
  const recent = useSyncExternalStore(
    recentStore.subscribe,
    recentStore.read,
    () => recentStore.empty,
  );
  const saved = useSyncExternalStore(savedStore.subscribe, savedStore.read, () => savedStore.empty);

  const clearRecent = useCallback(() => recentStore.write([]), []);
  const saveSearch = useCallback((name: string, query: string) => {
    const cleanQuery = query.trim();
    const cleanName = name.trim() || cleanQuery;
    if (!cleanQuery) return;
    const rest = savedStore.read().filter((s) => s.name.toLowerCase() !== cleanName.toLowerCase());
    savedStore.write([{ name: cleanName, query: cleanQuery }, ...rest].slice(0, SAVED_LIMIT));
  }, []);
  const removeSaved = useCallback(
    (name: string) => savedStore.write(savedStore.read().filter((s) => s.name !== name)),
    [],
  );

  return { recent, saved, clearRecent, saveSearch, removeSaved };
}
