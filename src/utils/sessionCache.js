/**
 * Tiny in-memory TTL cache. Survives page unmounts (module-level) but not a
 * full reload — for that layer the service worker's runtime caching applies.
 */
const store = new Map();

export function readCache(key, maxAgeMs) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > maxAgeMs) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function writeCache(key, value) {
  store.set(key, { value, at: Date.now() });
}

/** Wipe everything — called on logout so nothing leaks to the next account. */
export function clearCache() {
  store.clear();
}
