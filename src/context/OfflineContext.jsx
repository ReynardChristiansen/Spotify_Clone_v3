import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import * as offline from '../utils/offlineStore';

const OfflineContext = createContext(null);

// A fresh React Set from the store's live ids (new reference => re-render)
const snapshotIds = () => new Set(offline.downloadedIdList());

export function OfflineProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [downloadedIds, setDownloadedIds] = useState(() => new Set());
  const [downloading, setDownloading] = useState(() => new Set());
  const [progress, setProgress] = useState({}); // id -> 0..1 for active downloads
  const [usage, setUsage] = useState(0); // bytes used by downloaded songs

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

  const download = useCallback(async (track) => {
    if (!offline.offlineSupported || !track?.id || !track?.url) return;
    if (offline.isDownloaded(track.id)) return;

    setDownloading((prev) => new Set(prev).add(track.id));
    try {
      await offline.requestPersist();
      await offline.downloadTrack(track, (fraction) =>
        setProgress((prev) => ({ ...prev, [track.id]: fraction }))
      );
      setDownloadedIds(snapshotIds());
      setUsage(offline.totalBytes());
    } catch (error) {
      console.log('download failed', track?.id, error);
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

  // Download a list one at a time (keeps memory + bandwidth sane on phones)
  const downloadAll = useCallback(
    async (tracks) => {
      for (const track of tracks) {
        if (!offline.isDownloaded(track.id)) {
          await download(track);
        }
      }
    },
    [download]
  );

  const remove = useCallback(async (id) => {
    await offline.removeSong(id);
    setDownloadedIds(snapshotIds());
    setUsage(offline.totalBytes());
  }, []);

  const value = {
    supported: offline.offlineSupported,
    ready,
    downloadedIds,
    downloading,
    progress,
    usage,
    isDownloaded: (id) => downloadedIds.has(id),
    download,
    downloadAll,
    remove,
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
