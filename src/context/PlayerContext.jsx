import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import Cookies from 'js-cookie';
import { useAuth } from './AuthContext';
import { musicService } from '../services/musicService';
import { userService } from '../services/userService';
import { likedSongToTrack, pickStreamUrl, toTrack } from '../utils/song';
import {
  blobFor,
  isDownloaded,
  loadLikedSnapshot,
  saveLikedSnapshot,
} from '../utils/offlineStore';

const PlayerContext = createContext(null);

function readVolumeCookie() {
  const saved = Number(Cookies.get('volume'));
  return Number.isFinite(saved) && saved >= 0 && saved <= 1 ? saved : 0.5;
}

export function PlayerProvider({ children }) {
  const { user } = useAuth();
  const audioRef = useRef(null);
  const nextTrackRef = useRef(null);
  // Where playback was started from: 'liked' (Liked Songs page) or 'browse'
  // (home / search / artist). Decides how the next track is picked, and
  // survives pause/play since those never change the track.
  const playSourceRef = useRef('browse');
  // Tracks what's loaded into the <audio> element and any object URL we minted
  // for a downloaded blob (so we can revoke it when the song changes).
  const currentSrcRef = useRef({ id: null, objectUrl: null });
  // Monotonic guard: the offline-blob lookup is async, so a newer play must be
  // able to cancel an older one that's still resolving.
  const playReqRef = useRef(0);

  const [track, setTrack] = useState(null); // { id, name, artist, image, url }
  const [history, setHistory] = useState([]);
  const [nextTrack, setNextTrack] = useState(null);
  // Exposed so pages (Liked Songs) can tell whether *their* playlist is the
  // one currently loaded, not just whether some audio happens to be playing.
  const [playSource, setPlaySource] = useState('browse');
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const [volume, setVolume] = useState(readVolumeCookie);
  const [likedSongs, setLikedSongs] = useState([]);
  // Start true when already logged in: a fetch will fire on mount, and we'd
  // rather show a skeleton than flash the empty state before it resolves.
  const [likedLoading, setLikedLoading] = useState(() => Boolean(user));
  // A liked song that's inside its Gmail-style "undo delete" window on the
  // Liked page. It's still in `likedSongs` (undo must be a free restore), but
  // isLiked and the autoplay pool treat it as gone so the player never
  // disagrees with the list about whether it's still liked.
  const [pendingUnlikeId, setPendingUnlikeId] = useState(null);
  const pendingUnlikeIdRef = useRef(null);
  const markPendingUnlike = useCallback((id) => {
    pendingUnlikeIdRef.current = id;
    setPendingUnlikeId(id);
  }, []);

  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);

  // Mirrors for the queue effect: it should read the latest list/history
  // without re-running (and re-fetching) on every like or play
  const likedSongsRef = useRef(likedSongs);
  useEffect(() => {
    likedSongsRef.current = likedSongs;
  }, [likedSongs]);
  const historyRef = useRef(history);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);
  // Our position within `history` — the source of truth for prev/next
  // stepping, so replaying a song never confuses which track came before it.
  const historyIndexRef = useRef(-1);

  // ---- volume -------------------------------------------------------------
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    Cookies.set('volume', String(volume), { expires: 30, sameSite: 'Lax' });
  }, [volume]);

  // ---- stop playback on logout --------------------------------------------
  useEffect(() => {
    if (user) return;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    if (currentSrcRef.current.objectUrl) {
      URL.revokeObjectURL(currentSrcRef.current.objectUrl);
    }
    currentSrcRef.current = { id: null, objectUrl: null };
    setTrack(null);
    setNextTrack(null);
    setHistory([]);
    historyRef.current = [];
    historyIndexRef.current = -1;
    playSourceRef.current = 'browse';
    setPlaySource('browse');
    setIsPlaying(false);
    setTime({ current: 0, duration: 0 });
    // Clear the lock-screen / OS media controls too — otherwise they keep
    // showing the last song with now-dead transport buttons after logout.
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      for (const action of [
        'play',
        'pause',
        'previoustrack',
        'nexttrack',
        'seekto',
      ]) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // action unsupported in this browser — nothing to clear
        }
      }
    }
  }, [user]);

  // ---- liked songs --------------------------------------------------------
  const refreshLikedSongs = useCallback(async () => {
    if (!user) {
      setLikedSongs([]);
      setLikedLoading(false);
      return;
    }
    setLikedLoading(true);
    try {
      const data = await userService.getUser(user.id, user.token);
      const songs = data.songs || [];
      setLikedSongs(songs);
      // Snapshot the list so the Liked page (and downloaded songs) still work
      // with no network on the next cold start
      saveLikedSnapshot(user.id, songs);
    } catch {
      // Offline / transient failure: fall back to the last saved snapshot
      const snapshot = await loadLikedSnapshot(user.id);
      if (snapshot?.length) setLikedSongs(snapshot);
      // otherwise keep whatever we already have
    } finally {
      setLikedLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshLikedSongs();
  }, [refreshLikedSongs]);

  const isLiked = useCallback(
    (songId) =>
      songId !== pendingUnlikeId &&
      likedSongs.some((song) => song.song_id === songId),
    [likedSongs, pendingUnlikeId]
  );

  // Both mutations are optimistic: the UI flips instantly and only reverts
  // if the API call fails — no waiting on the network for a heart to fill.
  const likeTrack = useCallback(
    async (candidate) => {
      if (!user || !candidate) return;
      const song = {
        song_id: candidate.id,
        song_name: candidate.name,
        song_url: candidate.url,
        song_image: candidate.image,
      };
      setLikedSongs((prev) =>
        prev.some((item) => item.song_id === song.song_id) ? prev : [...prev, song]
      );
      try {
        await userService.likeSong(user.id, user.token, song);
      } catch {
        setLikedSongs((prev) =>
          prev.filter((item) => item.song_id !== song.song_id)
        );
      }
    },
    [user]
  );

  // Returns whether the server actually accepted the unlike, so callers that
  // do follow-up work (e.g. deleting the offline copy) can wait for success
  // and not act on a change that was optimistically reverted.
  const unlikeTrack = useCallback(
    async (songId) => {
      if (!user) return false;
      const snapshot = likedSongs;
      setLikedSongs((prev) => prev.filter((item) => item.song_id !== songId));
      try {
        await userService.unlikeSong(user.id, user.token, songId);
        return true;
      } catch {
        setLikedSongs(snapshot);
        return false;
      }
    },
    [user, likedSongs]
  );

  // ---- playback -----------------------------------------------------------
  // Loads a candidate into the audio element and plays it. Deliberately does
  // NOT touch history — callers decide how the navigation is recorded.
  const startAudio = useCallback(async (candidate, source) => {
    if (!candidate?.url || !audioRef.current) return;
    const audio = audioRef.current;

    playSourceRef.current = source;
    setPlaySource(source);
    setTrack(candidate);

    // Only (re)load the element when the song actually changes — a plain
    // pause/resume of the same track must not reset progress or refetch.
    if (currentSrcRef.current.id !== candidate.id) {
      const req = ++playReqRef.current;
      // Prefer a locally downloaded copy (plays fully offline); fall back to
      // the network URL. blobFor resolves to null instantly for non-downloaded
      // songs, so this adds nothing noticeable to the common path.
      let src = candidate.url;
      let objectUrl = null;
      try {
        const blob = await blobFor(candidate.id);
        if (req !== playReqRef.current) return; // a newer play superseded this
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          src = objectUrl;
        }
      } catch {
        // ignore — fall back to the network URL
      }
      if (currentSrcRef.current.objectUrl) {
        URL.revokeObjectURL(currentSrcRef.current.objectUrl);
      }
      currentSrcRef.current = { id: candidate.id, objectUrl };
      audio.src = src;
      // Clear the previous song's progress/duration so the seek bar doesn't
      // show stale values until the new metadata loads
      setTime({ current: 0, duration: 0 });
    }
    try {
      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.log(error);
    }
  }, []);

  // Forward navigation (user picks a song, autoplay, "next"): append to the
  // history stack and point at the new entry. Any "forward" entries left over
  // from an earlier "previous" are dropped, browser-history style.
  const playTrack = useCallback(
    (candidate, source = 'browse') => {
      if (!candidate?.url) return;
      const base = historyRef.current.slice(0, historyIndexRef.current + 1);
      const nextHist =
        base[base.length - 1]?.id === candidate.id
          ? base
          : [...base, candidate];
      historyIndexRef.current = nextHist.length - 1;
      historyRef.current = nextHist;
      setHistory(nextHist);
      startAudio(candidate, source);
    },
    [startAudio]
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [track]);

  const playNext = useCallback(() => {
    // Keep the current source so autoplay stays in liked/browse mode
    if (nextTrackRef.current) {
      playTrack(nextTrackRef.current, playSourceRef.current);
    }
  }, [playTrack]);

  // Step back through the history stack by index (not by id) so replaying a
  // song can never jump to the wrong copy of it.
  const playPrevious = useCallback(() => {
    const index = historyIndexRef.current;
    if (index > 0) {
      historyIndexRef.current = index - 1;
      startAudio(historyRef.current[index - 1], playSourceRef.current);
    } else if (audioRef.current) {
      // At the start of the session's history — restart the current song
      // instead of wrapping around to the most recently played one
      audioRef.current.currentTime = 0;
    }
  }, [startAudio]);

  const seekTo = useCallback((fraction) => {
    const audio = audioRef.current;
    if (audio?.duration) {
      audio.currentTime = Math.max(0, Math.min(1, fraction)) * audio.duration;
    }
  }, []);

  // ---- audio element events ----------------------------------------------
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () =>
      setTime({ current: audio.currentTime, duration: audio.duration || 0 });
    const onEnded = () => {
      if (nextTrackRef.current) {
        playTrack(nextTrackRef.current, playSourceRef.current);
      } else {
        setIsPlaying(false);
      }
    };
    // A source that fails to load (offline with no local copy, or a stale /
    // expired stream URL) must not leave the UI frozen showing "playing".
    // We stop rather than auto-skip: with the offline queue already limited to
    // downloaded songs this is rare, and blindly advancing risks racing through
    // a whole broken list. `audio.error` is null for the empty-src reset we do
    // on logout, so that path is ignored.
    const onError = () => {
      if (!audio.error) return;
      setIsPlaying(false);
    };
    // Tie isPlaying to the element's real state, not only our own calls: the
    // OS or another app can pause us (incoming call, audio-focus loss) and the
    // UI must reflect that instead of showing a stuck "playing". Swapping src
    // for a new track fires `emptied`, not `pause`, so these don't misfire on
    // normal track changes.
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [playTrack]);

  // ---- autoplay queue: prepare the next track when the current one changes.
  // Started from Liked Songs -> keep shuffling within liked songs (no network,
  // the list is already in memory). Started anywhere else -> random pick from
  // the current artist's top songs, with liked songs as the offline fallback.
  useEffect(() => {
    if (!track?.id) return;
    let cancelled = false;

    // Drop the previous candidate right away — it's usually the track that
    // just started, so keeping it would let a quick "next" replay the same
    // song while the real candidate is still being prepared
    setNextTrack(null);

    const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];

    // Avoid the current song and the last few played so small lists don't
    // ping-pong; relax to just-not-current when that empties the pool
    function fromLikedSongs(currentId) {
      // Exclude a song that's mid-undo-delete: the UI already treats it as
      // removed, so autoplay must not resurrect it as the next track.
      const liked = likedSongsRef.current.filter(
        (song) => song.song_id !== pendingUnlikeIdRef.current
      );
      // Offline, only songs with a local copy can actually play. Queuing a
      // network-only track would hand <audio> a dead URL and autoplay would
      // silently stall, so restrict the pool to what's downloaded.
      const offlineNow = typeof navigator !== 'undefined' && !navigator.onLine;
      const available = offlineNow
        ? liked.filter((song) => isDownloaded(song.song_id))
        : liked;

      const recentIds = new Set(
        historyRef.current.slice(-4).map((item) => item.id)
      );
      recentIds.add(currentId);

      let pool = available.filter((song) => !recentIds.has(song.song_id));
      if (pool.length === 0) {
        pool = available.filter((song) => song.song_id !== currentId);
      }
      return pool.length > 0 ? likedSongToTrack(pickRandom(pool)) : null;
    }

    async function fromArtistTopSongs(currentId) {
      const songs = await musicService.getSongById(currentId);
      const artistId = songs?.[0]?.artists?.primary?.[0]?.id;
      if (!artistId) return null;

      const artist = await musicService.getArtistById(artistId);
      const pool = (artist.topSongs || []).filter(
        (song) => song.id !== currentId && pickStreamUrl(song)
      );
      return pool.length > 0 ? toTrack(pickRandom(pool)) : null;
    }

    async function prepareNext() {
      const likedMode = playSourceRef.current === 'liked';
      let candidate = null;

      if (likedMode) candidate = fromLikedSongs(track.id);
      if (!candidate) {
        try {
          candidate = await fromArtistTopSongs(track.id);
        } catch {
          candidate = null;
        }
      }
      if (!candidate && !likedMode) candidate = fromLikedSongs(track.id);

      if (!cancelled) setNextTrack(candidate);
    }

    prepareNext();
    return () => {
      cancelled = true;
    };
  }, [track?.id]);

  // ---- Media Session (lock screen / hardware keys, big win as a PWA) ------
  useEffect(() => {
    if (!('mediaSession' in navigator) || !track) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name,
      artist: track.artist || 'Hirmify',
      artwork: track.image
        ? [{ src: track.image, sizes: '500x500', type: 'image/jpeg' }]
        : [],
    });
    // Explicit play/pause (not one toggle for both) so the OS button state
    // and actual playback can never drift out of sync
    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause();
      setIsPlaying(false);
    });
    navigator.mediaSession.setActionHandler('previoustrack', playPrevious);
    navigator.mediaSession.setActionHandler('nexttrack', playNext);
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      const audio = audioRef.current;
      if (audio && details.seekTime != null) audio.currentTime = details.seekTime;
    });
  }, [track, playPrevious, playNext]);

  // Reflect play/pause on the lock screen without rebuilding the metadata
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Keep the lock-screen scrubber in sync so seeking from there lands right
  useEffect(() => {
    if (
      !('mediaSession' in navigator) ||
      typeof navigator.mediaSession.setPositionState !== 'function' ||
      !track ||
      !time.duration
    ) {
      return;
    }
    try {
      navigator.mediaSession.setPositionState({
        duration: time.duration,
        position: Math.min(time.current, time.duration),
        playbackRate: 1,
      });
    } catch {
      // Invalid values mid metadata-load — ignore, the next tick corrects it
    }
    // `time` is a fresh object each timeupdate, so this re-syncs every tick
  }, [track, time]);

  const value = {
    track,
    isPlaying,
    time,
    volume,
    setVolume,
    likedSongs,
    likedLoading,
    isLiked,
    likeTrack,
    unlikeTrack,
    markPendingUnlike,
    refreshLikedSongs,
    playTrack,
    togglePlay,
    playNext,
    playPrevious,
    seekTo,
    playSource,
    hasNext: Boolean(nextTrack),
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="auto" />
    </PlayerContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlayer() {
  return useContext(PlayerContext);
}
