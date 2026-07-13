import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as offline from '../utils/offlineStore';

const OfflineContext = createContext(null);

// A fresh React Set from the store's live ids (new reference => re-render)
const snapshotIds = () => new Set(offline.downloadedIdList());

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

  const download = useCallback(async (track, signal) => {
    if (!offline.offlineSupported || !track?.id || !track?.url) return;
    if (offline.isDownloaded(track.id)) return;

    setError(null);
    setDownloading((prev) => new Set(prev).add(track.id));
    try {
      await offline.requestPersist();
      await offline.downloadTrack(
        track,
        (fraction) => setProgress((prev) => ({ ...prev, [track.id]: fraction })),
        signal
      );
      setDownloadedIds(snapshotIds());
      setUsage(offline.totalBytes());
    } catch (err) {
      if (err?.name === 'AbortError') throw err; // cancelled — let the batch stop
      setError(describeDownloadError(err));
      console.log('download failed', track?.id, err);
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
      try {
        for (const track of tracks) {
          if (controller.signal.aborted) break;
          if (offline.isDownloaded(track.id)) continue;
          try {
            await download(track, controller.signal);
          } catch (err) {
            if (err?.name === 'AbortError') break; // cancelled
          }
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
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
