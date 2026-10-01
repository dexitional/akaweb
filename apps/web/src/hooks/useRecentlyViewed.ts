import { useCallback, useSyncExternalStore } from "react";

// Profiles this browser opened most recently (the directory home's "Recently
// viewed" sidebar). localStorage only — the directory has no accounts.
const STORAGE_KEY = "directory:recently-viewed";
const LIMIT = 6;

export interface RecentProfile {
  slug: string;
  name: string;
  title: string;
  photoUrl?: string;
}

const listeners = new Set<() => void>();
const EMPTY: Array<RecentProfile> = [];
let cache: Array<RecentProfile> | null = null;

function read(): Array<RecentProfile> {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    cache = Array.isArray(parsed)
      ? parsed.filter(
          (v): v is RecentProfile =>
            typeof v === "object" && v !== null && typeof (v as RecentProfile).slug === "string",
        )
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: Array<RecentProfile>) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: keep them for this visit only.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function rememberProfileView(profile: RecentProfile) {
  write([profile, ...read().filter((p) => p.slug !== profile.slug)].slice(0, LIMIT));
}

export function useRecentlyViewed() {
  const recent = useSyncExternalStore(subscribe, read, () => EMPTY);
  const clear = useCallback(() => write([]), []);
  return { recent, clear };
}
