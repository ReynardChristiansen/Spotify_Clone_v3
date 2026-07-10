import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiAlertTriangle,
  FiDownload,
  FiLoader,
  FiPause,
  FiPlay,
  FiTrash2,
  FiWifiOff,
  FiX,
} from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { useOnline } from '../hooks/useOnline';
import SongRow from '../components/ui/SongRow';
import UndoSnackbar from '../components/ui/UndoSnackbar';
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
  const {
    supported,
    downloadedIds,
    downloading,
    download,
    downloadAll,
    cancelDownloads,
    remove,
    clearAll,
    error,
    clearError,
  } = useOffline();
  const online = useOnline();

  const [removingIds, setRemovingIds] = useState(() => new Set());
  const snackbarRef = useRef(null);

  // Gmail-style undoable delete: the tapped song leaves the list immediately,
  // but the server unlike + download removal only run when the undo window
  // closes. Until then undo is free — no API call has happened yet.
  const [pendingDelete, setPendingDelete] = useState(null); // liked-song doc
  const pendingDeleteRef = useRef(null);
  // Ref mirror so the commit callback stays stable (unlikeTrack's identity
  // changes with likedSongs, and an unstable commit would reset the undo
  // window's listeners and 8s timer on every like/unlike elsewhere).
  const actionsRef = useRef({ unlikeTrack, remove });
  useEffect(() => {
    actionsRef.current = { unlikeTrack, remove };
  }, [unlikeTrack, remove]);

  const commitPendingDelete = useCallback(() => {
    const song = pendingDeleteRef.current;
    if (!song) return;
    pendingDeleteRef.current = null;
    setPendingDelete(null);
    actionsRef.current.unlikeTrack(song.song_id);
    actionsRef.current.remove(song.song_id); // drop any offline copy too
  }, []);

  const undoPendingDelete = useCallback(() => {
    if (!pendingDeleteRef.current) return;
    pendingDeleteRef.current = null;
    setPendingDelete(null); // nothing was deleted — the row just comes back
  }, []);

  // Is the *liked* playlist what's loaded right now? Only then should the hero
  // button pause/resume it — otherwise it starts the playlist (and never
  // pauses some unrelated song that happens to be playing).
  const likedActive = Boolean(track) && playSource === 'liked';

  useEffect(() => {
    refreshLikedSongs();
  }, [refreshLikedSongs]);

  // What the page renders: the liked list minus a delete that's still inside
  // its undo window (it's gone from the UI, but not from the server yet)
  const visibleSongs = useMemo(
    () =>
      pendingDelete
        ? likedSongs.filter((song) => song.song_id !== pendingDelete.song_id)
        : likedSongs,
    [likedSongs, pendingDelete]
  );

  const tracks = useMemo(() => visibleSongs.map(likedSongToTrack), [visibleSongs]);
  const downloadedInLiked = tracks.filter((t) => downloadedIds.has(t.id)).length;
  const busy = downloading.size > 0;
  const allDownloaded = tracks.length > 0 && downloadedInLiked === tracks.length;
  // Only skeleton the *first* load (no data yet) — a background refresh with a
  // list already on screen should never flash a skeleton.
  const showSkeleton = likedLoading && likedSongs.length === 0;

  // Fresh view of the liked list for the delete timeout below — its closure
  // is 320ms stale, and the song could have been unliked elsewhere (player
  // bar heart) in that gap. Opening an undo window for an already-deleted
  // song would show an Undo that can't actually restore anything.
  const likedSongsRef = useRef(likedSongs);
  useEffect(() => {
    likedSongsRef.current = likedSongs;
  }, [likedSongs]);

  // Exit animation first, then the song moves into the undo window instead of
  // being deleted outright — a stray tap on the trash icon costs nothing.
  const handleDelete = (songId) => {
    const song = likedSongs.find((item) => item.song_id === songId);
    if (!song || removingIds.has(songId)) return;
    setRemovingIds((prev) => new Set(prev).add(songId));
    setTimeout(() => {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
      // Gone from the list already (unliked through another surface while
      // the row was animating out)? Then there's nothing left to defer.
      if (!likedSongsRef.current.some((item) => item.song_id === songId)) {
        return;
      }
      // Gmail-style: starting a new undo window settles any previous one
      commitPendingDelete();
      pendingDeleteRef.current = song;
      setPendingDelete(song);
    }, 320);
  };

  // Offline, shuffle can only start a song that's actually downloaded —
  // otherwise it would hand the player a dead network URL.
  const canStartPlayback = likedActive || online || downloadedInLiked > 0;

  const playRandom = () => {
    const pool = online
      ? visibleSongs
      : visibleSongs.filter((song) => downloadedIds.has(song.song_id));
    if (pool.length === 0) return;
    const random = pool[Math.floor(Math.random() * pool.length)];
    playTrack(likedSongToTrack(random), 'liked');
  };

  // Gmail-style undo window: while the snackbar is up the unlike hasn't
  // happened yet, and it stays up until the user does something else — a tap
  // outside the snackbar or a scroll anywhere (capture phase, so the inner
  // <main> scroller counts too). No auto-timeout, exactly like Gmail: doing
  // nothing keeps the undo available.
  useEffect(() => {
    if (!pendingDelete) return undefined;
    const commit = () => commitPendingDelete();
    const onPointerDown = (event) => {
      if (snackbarRef.current?.contains(event.target)) return;
      commit();
    };
    // Removing the row shrinks the list, and if the scroller sat at the
    // bottom the browser clamps scrollTop — a scroll event WE caused. A short
    // grace period keeps that reflow from instantly closing the window.
    const openedAt = performance.now();
    const onScroll = () => {
      if (performance.now() - openedAt < 400) return;
      commit();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('pagehide', commit);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('pagehide', commit);
    };
  }, [pendingDelete, commitPendingDelete]);

  // Navigating away also closes the window (no-op if it's already settled)
  useEffect(() => () => commitPendingDelete(), [commitPendingDelete]);

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
                {user?.name} · {visibleSongs.length}{' '}
                {visibleSongs.length === 1 ? 'song' : 'songs'}
              </p>
            )}
          </div>
        </div>

        {showSkeleton ? (
          <div className="relative z-10 mt-7">
            <div className="skeleton h-12 w-32 rounded-full" />
          </div>
        ) : visibleSongs.length > 0 ? (
          // flex-wrap: three buttons don't fit small phones side by side, and
          // the hero is overflow-hidden — without wrapping the last one gets
          // clipped clean off the screen
          <div className="relative z-10 mt-7 flex flex-wrap items-center gap-3">
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

            {/* Download control — quiet secondary buttons next to Play.
                While a batch runs it becomes a Cancel button; once everything
                is downloaded only "Remove downloads" remains. */}
            {supported && busy && (
              <button
                onClick={cancelDownloads}
                title="Cancel downloading"
                className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-800/80 px-5 py-3 text-sm font-semibold text-zinc-200 transition-all hover:bg-ink-700 hover:text-white active:scale-95"
              >
                <FiLoader className="animate-spin" />
                Cancel · {downloadedInLiked}/{tracks.length}
              </button>
            )}

            {supported && !busy && !allDownloaded && (
              <button
                onClick={() => downloadAll(tracks)}
                disabled={!online}
                title="Download all for offline"
                className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-800/80 px-5 py-3 text-sm font-semibold text-zinc-200 transition-all hover:bg-ink-700 hover:text-white active:scale-95 disabled:opacity-50"
              >
                <FiDownload />
                Download all
              </button>
            )}

            {supported && !busy && downloadedInLiked > 0 && (
              <button
                onClick={clearAll}
                title="Remove all downloaded songs"
                className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-zinc-400 transition-all hover:text-white active:scale-95"
              >
                <FiTrash2 />
                Remove downloads
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

      {/* Download error */}
      {error && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <FiAlertTriangle className="shrink-0 text-red-400" />
          <span className="flex-1">{error}</span>
          <button
            onClick={clearError}
            aria-label="Dismiss"
            className="shrink-0 text-red-300 transition-colors hover:text-white"
          >
            <FiX />
          </button>
        </div>
      )}

      {showSkeleton ? (
        <ListSkeleton />
      ) : visibleSongs.length > 0 ? (
        visibleSongs.map((song, index) => {
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

      {pendingDelete && (
        <UndoSnackbar
          ref={snackbarRef}
          lifted={Boolean(track)}
          message={`"${pendingDelete.song_name}" removed`}
          onUndo={undoPendingDelete}
          onDismiss={commitPendingDelete}
        />
      )}
    </div>
  );
}
