import { openDB } from 'idb';

/**
 * Offline storage for downloaded songs.
 *
 * The JioSaavn media CDN (aac.saavncdn.com) serves `Access-Control-Allow-Origin: *`
 * with full Range support, so we can fetch the raw .mp4 bytes cross-origin and
 * keep them as a Blob in IndexedDB. Playing back is then fully local (an
 * object URL fed to <audio>), which survives airplane mode and seeks perfectly.
 *
 * We keep two lightweight in-memory mirrors — the set of downloaded ids and a
 * map of their sizes — so the common lookups ("is this downloaded?", "how much
 * space?") never have to touch (and deserialize the multi-MB blobs from) IDB.
 */

const DB_NAME = 'hirmify-offline';
const DB_VERSION = 1;
const SONGS = 'songs'; // key: song_id -> { song_id, song_name, song_image, blob, size, savedAt }
const META = 'meta'; // key/value: 'sizes' -> { [id]: bytes }, 'liked:<userId>' -> array

export const offlineSupported =
  typeof indexedDB !== 'undefined' && typeof Blob !== 'undefined';

const downloadedIds = new Set();
const sizesById = new Map();

let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(SONGS)) {
          database.createObjectStore(SONGS, { keyPath: 'song_id' });
        }
        if (!database.objectStoreNames.contains(META)) {
          database.createObjectStore(META);
        }
      },
    });
  }
  return dbPromise;
}

let readyPromise = null;
/** Load the id/size mirrors once. Every read waits on this first. */
export function whenReady() {
  if (!offlineSupported) return Promise.resolve();
  if (!readyPromise) {
    readyPromise = (async () => {
      try {
        const database = await db();
        const [keys, sizes] = await Promise.all([
          database.getAllKeys(SONGS),
          database.get(META, 'sizes'),
        ]);
        keys.forEach((key) => downloadedIds.add(key));
        if (sizes) {
          for (const [id, bytes] of Object.entries(sizes)) {
            if (downloadedIds.has(id)) sizesById.set(id, bytes);
          }
        }
      } catch {
        // IDB unavailable (private mode, etc.) — offline features stay off
      }
    })();
  }
  return readyPromise;
}

export function isDownloaded(id) {
  return downloadedIds.has(id);
}

export function downloadedCount() {
  return downloadedIds.size;
}

/** Snapshot of the current downloaded ids as a plain array. */
export function downloadedIdList() {
  return Array.from(downloadedIds);
}

/** Total bytes of downloaded songs — from the in-memory mirror, no blob reads. */
export function totalBytes() {
  let total = 0;
  for (const bytes of sizesById.values()) total += bytes;
  return total;
}

/** The downloaded blob for a song, or null if it isn't saved. */
export async function blobFor(id) {
  if (!offlineSupported) return null;
  await whenReady();
  if (!downloadedIds.has(id)) return null;
  try {
    const record = await (await db()).get(SONGS, id);
    return record?.blob || null;
  } catch {
    return null;
  }
}

async function persistSizes() {
  try {
    await (await db()).put(META, Object.fromEntries(sizesById), 'sizes');
  } catch {
    // best-effort; the SONGS keys remain the source of truth for what exists
  }
}

// A download is considered stalled if no bytes arrive for this long. Mobile
// networks routinely freeze a large fetch mid-stream (cell/wifi handoff, weak
// signal, the OS suspending a backgrounded tab) — the TCP socket stays open so
// fetch/read never resolve *or* reject, and without this the row would spin
// forever with no error. The timer resets on every chunk, so a slow-but-moving
// download is never killed; only a genuine stall aborts.
const STALL_TIMEOUT_MS = 10000;

/**
 * Download a track's audio and store it. `track` is the player shape
 * ({ id, name, image, url }). onProgress receives a 0..1 fraction. An optional
 * AbortSignal lets a batch cancel a download in flight — fetch/read reject with
 * an AbortError and nothing is written to IDB (no partial blob left behind).
 *
 * A stall watchdog aborts the fetch if it goes silent for STALL_TIMEOUT_MS and
 * throws a TimeoutError, so a frozen mobile download surfaces as a real error
 * (spinner clears, banner shown) instead of hanging indefinitely.
 */
export async function downloadTrack(track, onProgress, signal) {
  if (!offlineSupported) throw new Error('Offline storage not available');
  if (!track?.url) throw new Error('Song has no stream URL');

  // One internal controller drives both the stall timeout and the caller's
  // cancel signal, so the single fetch can be aborted by either.
  const controller = new AbortController();
  let timedOut = false;
  let stallTimer = null;
  const armStallTimer = () => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, STALL_TIMEOUT_MS);
  };
  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onExternalAbort);
  }

  try {
    armStallTimer(); // also covers a connect that never responds
    const response = await fetch(track.url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Download failed (${response.status})`);

    const total = Number(response.headers.get('Content-Length')) || 0;
    const type = response.headers.get('Content-Type') || 'audio/mp4';

    let blob;
    let size;
    const reader = response.body?.getReader?.();
    if (reader) {
      const chunks = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        armStallTimer(); // bytes flowing — push the stall deadline out
        chunks.push(value);
        received += value.length;
        if (total) onProgress?.(received / total);
      }
      blob = new Blob(chunks, { type });
      size = received;
    } else {
      blob = await response.blob();
      size = blob.size;
    }

    const record = {
      song_id: track.id,
      song_name: track.name,
      song_image: track.image,
      blob,
      size,
      savedAt: Date.now(),
    };
    await (await db()).put(SONGS, record);
    downloadedIds.add(track.id);
    sizesById.set(track.id, size);
    await persistSizes();
    return size;
  } catch (err) {
    // A stall aborts via `controller`, so it arrives here as an AbortError —
    // re-tag it as a timeout so callers don't mistake it for a user cancel.
    if (timedOut) {
      const timeout = new Error('Download timed out');
      timeout.name = 'TimeoutError';
      throw timeout;
    }
    throw err;
  } finally {
    if (stallTimer) clearTimeout(stallTimer);
    if (signal) signal.removeEventListener('abort', onExternalAbort);
  }
}

export async function removeSong(id) {
  if (!offlineSupported) return;
  try {
    await (await db()).delete(SONGS, id);
  } catch {
    // ignore
  }
  downloadedIds.delete(id);
  sizesById.delete(id);
  await persistSizes();
}

/** Wipe every downloaded song (blobs + size mirror). Liked snapshots are kept. */
export async function clearAll() {
  if (!offlineSupported) return;
  // Empty the mirrors before the async IDB work: a download kicked off by the
  // same interaction that commits this wipe must see these songs as gone (its
  // later put lands after the clear, so the fresh copy survives).
  downloadedIds.clear();
  sizesById.clear();
  try {
    const database = await db();
    await database.clear(SONGS);
    await database.delete(META, 'sizes');
  } catch {
    // ignore
  }
}

// ---- liked-list snapshot (so the Liked page renders offline) --------------

export async function saveLikedSnapshot(userId, list) {
  if (!offlineSupported || !userId) return;
  try {
    await (await db()).put(META, list, `liked:${userId}`);
  } catch {
    // ignore
  }
}

export async function loadLikedSnapshot(userId) {
  if (!offlineSupported || !userId) return null;
  try {
    return (await (await db()).get(META, `liked:${userId}`)) || null;
  } catch {
    return null;
  }
}

/** Drop a user's cached liked list — used on logout so it doesn't linger. */
export async function clearLikedSnapshot(userId) {
  if (!offlineSupported || !userId) return;
  try {
    await (await db()).delete(META, `liked:${userId}`);
  } catch {
    // ignore
  }
}

// ---- storage quota --------------------------------------------------------

export async function storageEstimate() {
  if (navigator.storage?.estimate) {
    try {
      const { usage, quota } = await navigator.storage.estimate();
      return { usage: usage || 0, quota: quota || 0 };
    } catch {
      // fall through
    }
  }
  return { usage: 0, quota: 0 };
}

/** Ask the browser to keep our storage from being evicted under pressure. */
export async function requestPersist() {
  if (navigator.storage?.persist) {
    try {
      return await navigator.storage.persist();
    } catch {
      // ignore
    }
  }
  return false;
}

export function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}
