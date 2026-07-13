import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as offline from '../utils/offlineStore';
import { musicService } from '../services/musicService';
import { pickStreamUrl } from '../utils/song';

const OfflineContext = createContext(null);

// A fresh React Set from the store's live ids (new reference => re-render)
const snapshotIds = () => new Set(offline.downloadedIdList());

// A song liked before the proxy rewrite can have a stale song_url stored —
// an old http:// link (blocked as mixed content on the https app) or a host
// that no longer sends CORS headers. Playback still works (media elements
// ignore CORS / auto-upgrade), but a cross-origin fetch for download fails
// with "Failed to fetch". Re-resolve a current https + CORS url from the proxy
// so those downloads can be healed and retried.
async function resolveFreshUrl(id) {
  try {
    const songs = await musicService.getSongById(id);
    return pickStreamUrl(songs?.[0]) || null;
  } catch {
    return null;
  }
}

// A working url to retry a failed download with, or null if we can't improve on
// what we were given. The http->https upgrade is the common case (old likes)
// and needs no network; only fall back to the proxy for a genuinely dead link.
async function healedUrl(track) {
  const url = track.url || '';
  if (/^http:\/\//i.test(url)) return url.replace(/^http:\/\//i, 'https://');
  const fresh = await resolveFreshUrl(track.id);
  return fresh && fresh !== url ? fresh : null;
}

// Turn a raw download failure into a short, user-facing message.
function describeDownloadError(err) {
  const name = err?.name || '';
  const message = String(err?.message || '');
  if (name === 'QuotaExceededError' || /quota/i.test(message)) {
    return 'Storage is full — remove some downloads or free up space.';
  }
  if (name === 'TimeoutError' || /timed out|timeout/i.test(message)) {
    return 'Download timed out — check your connection and try again.';
  }
  if (name === 'TypeError' || /network|failed to fetch/i.test(message)) {
    return 'Download failed — check your connection and try again.';
  }
  return 'Some songs could not be downloaded. Please try again.';
}

export function OfflineProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [downloadedIds, setDownloadedIds] = useState(() => new Set());
  const [downloading, setDownloading] = useState(() => new Set());
  const [progress, setProgress] = useState({}); // id -> 0..1 for active downloads
  const [usage, setUsage] = useState(0); // bytes used by downloaded songs
  const [error, setError] = useState(null); // last user-facing download error
  // Aborts the in-flight "download all" batch
  const abortRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    offline.whenReady().then(() => {
      if (cancelled) return;
      setDownloadedIds(snapshotIds());
      setUsage(offline.totalBytes());
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Returns true on success, false on a handled failure. `silent` (used by the
  // batch) suppresses the per-song error banner so one summary can be shown at
  // the end instead of each failure flashing and being wiped by the next song.
  const download = useCallback(async (track, signal, { silent = false } = {}) => {
    if (!offline.offlineSupported || !track?.id || !track?.url) return false;
    if (offline.isDownloaded(track.id)) return true;

    if (!silent) setError(null);
    setDownloading((prev) => new Set(prev).add(track.id));
    const onProgress = (fraction) =>
      setProgress((prev) => ({ ...prev, [track.id]: fraction }));
    try {
      await offline.requestPersist();
      try {
        await offline.downloadTrack(track, onProgress, signal);
      } catch (err) {
        if (err?.name === 'AbortError') throw err; // cancelled — let the batch stop
        // The stored url may be stale/insecure (a pre-rewrite like). Heal it
        // (http->https, or a fresh url from the proxy) and try once more.
        const healed = await healedUrl(track);
        if (!healed) throw err;
        await offline.downloadTrack({ ...track, url: healed }, onProgress, signal);
      }
      setDownloadedIds(snapshotIds());
      setUsage(offline.totalBytes());
      return true;
    } catch (err) {
      if (err?.name === 'AbortError') throw err; // cancelled — let the batch stop
      if (!silent) setError(describeDownloadError(err));
      console.log('download failed', track?.id, err);
      return false;
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
      setProgress((prev) => {
        const next = { ...prev };
        delete next[track.id];
        return next;
      });
    }
  }, []);

  // Download a list one at a time (keeps memory + bandwidth sane on phones).
  // A shared AbortController lets the user cancel the whole batch mid-way.
  const downloadAll = useCallback(
    async (tracks) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setError(null);
      let failed = 0;
      try {
        for (const track of tracks) {
          if (controller.signal.aborted) break;
          if (offline.isDownloaded(track.id)) continue;
          try {
            // silent: collect failures and report one summary at the end,
            // instead of each song's error being wiped by the next one.
            const ok = await download(track, controller.signal, { silent: true });
            if (!ok) failed += 1;
          } catch (err) {
            if (err?.name === 'AbortError') break; // cancelled
          }
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
      // Don't nag if the user cancelled — only report genuine failures.
      if (failed > 0 && !controller.signal.aborted) {
        setError(
          failed === 1
            ? "1 song couldn't be downloaded. Tap its download icon to retry."
            : `${failed} songs couldn't be downloaded. Tap their download icons to retry.`
        );
      }
    },
    [download]
  );

  const cancelDownloads = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const remove = useCallback(async (id) => {
    await offline.removeSong(id);
    setDownloadedIds(snapshotIds());
    setUsage(offline.totalBytes());
  }, []);

  const clearAll = useCallback(async () => {
    await offline.clearAll();
    setDownloadedIds(snapshotIds());
    setUsage(offline.totalBytes());
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = {
    supported: offline.offlineSupported,
    ready,
    downloadedIds,
    downloading,
    progress,
    usage,
    error,
    isDownloaded: (id) => downloadedIds.has(id),
    download,
    downloadAll,
    cancelDownloads,
    remove,
    clearAll,
    clearError,
    formatBytes: offline.formatBytes,
  };

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOffline() {
  return useContext(OfflineContext);
}
