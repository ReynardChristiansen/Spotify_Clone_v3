import { useEffect, useMemo, useState } from 'react';
import { FiDownload, FiLoader, FiPause, FiPlay, FiWifiOff } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { useOnline } from '../hooks/useOnline';
import SongRow from '../components/ui/SongRow';
import { ListSkeleton } from '../components/ui/Skeletons';
import { likedSongToTrack } from '../utils/song';

export default function LikedSongsPage() {
  const { user } = useAuth();
  const {
    likedSongs,
    likedLoading,
    refreshLikedSongs,
    playTrack,
    unlikeTrack,
    isPlaying,
    togglePlay,
    track,
    playSource,
  } = usePlayer();
  const { supported, downloadedIds, downloading, download, downloadAll, remove } =
    useOffline();
  const online = useOnline();

  const [removingIds, setRemovingIds] = useState(() => new Set());

  // Is the *liked* playlist what's loaded right now? Only then should the hero
  // button pause/resume it — otherwise it starts the playlist (and never
  // pauses some unrelated song that happens to be playing).
  const likedActive = Boolean(track) && playSource === 'liked';

  useEffect(() => {
    refreshLikedSongs();
  }, [refreshLikedSongs]);

  const tracks = useMemo(() => likedSongs.map(likedSongToTrack), [likedSongs]);
  const downloadedInLiked = tracks.filter((t) => downloadedIds.has(t.id)).length;
  const busy = downloading.size > 0;
  const allDownloaded = tracks.length > 0 && downloadedInLiked === tracks.length;
  // Only skeleton the *first* load (no data yet) — a background refresh with a
  // list already on screen should never flash a skeleton.
  const showSkeleton = likedLoading && likedSongs.length === 0;

  // Let the exit animation play before the row is actually removed
  const handleDelete = (songId) => {
    setRemovingIds((prev) => new Set(prev).add(songId));
    setTimeout(() => {
      unlikeTrack(songId);
      remove(songId); // drop any offline copy along with the like
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
    }, 320);
  };

  // Offline, shuffle can only start a song that's actually downloaded —
  // otherwise it would hand the player a dead network URL.
  const canStartPlayback = likedActive || online || downloadedInLiked > 0;

  const playRandom = () => {
    const pool = online
      ? likedSongs
      : likedSongs.filter((song) => downloadedIds.has(song.song_id));
    if (pool.length === 0) return;
    const random = pool[Math.floor(Math.random() * pool.length)];
    playTrack(likedSongToTrack(random), 'liked');
  };

  return (
    <div className="pt-2">
      {/* Hero */}
      <div className="relative -mx-4 mb-8 overflow-hidden px-4 pb-8 pt-6 lg:-mx-8 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-b from-accent-400/15 via-ink-900/60 to-ink-900" />

        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-end">
          <div className="flex h-44 w-44 items-center justify-center rounded-2xl bg-accent-400 shadow-2xl shadow-black/50">
            <FaHeart className="text-6xl text-ink-950" />
          </div>
          <div className="pb-1 text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300">
              Playlist
            </p>
            <h1 className="mt-1.5 font-display text-4xl font-bold tracking-tight lg:text-6xl">
              Liked Songs
            </h1>
            {showSkeleton ? (
              <p className="mt-2.5 flex items-center justify-center gap-2 text-sm text-zinc-400 sm:justify-start">
                {user?.name}
                <span className="skeleton inline-block h-3.5 w-14 rounded" />
              </p>
            ) : (
              <p className="mt-2.5 text-sm text-zinc-400">
                {user?.name} · {likedSongs.length}{' '}
                {likedSongs.length === 1 ? 'song' : 'songs'}
              </p>
            )}
          </div>
        </div>

        {showSkeleton ? (
          <div className="relative z-10 mt-7">
            <div className="skeleton h-12 w-32 rounded-full" />
          </div>
        ) : likedSongs.length > 0 ? (
          <div className="relative z-10 mt-7 flex items-center gap-3">
            <button
              onClick={likedActive ? togglePlay : playRandom}
              disabled={!canStartPlayback}
              title={
                canStartPlayback
                  ? undefined
                  : 'Download a song to play it offline'
              }
              className="flex items-center gap-2 rounded-full bg-accent-400 px-7 py-3 text-sm font-bold text-ink-950 transition-all hover:bg-accent-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent-400"
            >
              {likedActive && isPlaying ? (
                <FiPause />
              ) : (
                <FiPlay className="ml-0.5" />
              )}
              {likedActive && isPlaying ? 'Pause' : 'Play'}
            </button>

            {/* Download control — a quiet secondary button next to Play, and it
                disappears entirely once everything is already downloaded */}
            {supported && !allDownloaded && (
              <button
                onClick={() => downloadAll(tracks)}
                disabled={busy || !online}
                title="Download all for offline"
                className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-800/80 px-5 py-3 text-sm font-semibold text-zinc-200 transition-all hover:bg-ink-700 hover:text-white active:scale-95 disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <FiLoader className="animate-spin" />
                    {downloadedInLiked}/{tracks.length}
                  </>
                ) : (
                  <>
                    <FiDownload />
                    Download all
                  </>
                )}
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Offline banner */}
      {!online && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-white/5 bg-ink-800/60 px-4 py-3 text-sm text-zinc-300">
          <FiWifiOff className="shrink-0 text-accent-400" />
          You&apos;re offline — only downloaded songs will play.
        </div>
      )}

      {showSkeleton ? (
        <ListSkeleton />
      ) : likedSongs.length > 0 ? (
        likedSongs.map((song, index) => {
          const isDown = downloadedIds.has(song.song_id);
          return (
            <SongRow
              key={song.song_id}
              index={index}
              track={likedSongToTrack(song)}
              source="liked"
              onDelete={handleDelete}
              exiting={removingIds.has(song.song_id)}
              downloaded={isDown}
              downloading={downloading.has(song.song_id)}
              onDownload={supported ? download : undefined}
              onRemoveDownload={remove}
              disabled={!online && !isDown}
            />
          );
        })
      ) : (
        <div className="mt-20 text-center">
          <p className="font-display font-semibold text-zinc-300">
            No liked songs yet
          </p>
          <p className="mt-1.5 text-sm text-zinc-500">
            Tap the heart on any song to save it here.
          </p>
        </div>
      )}
    </div>
  );
}
