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

const PlayerContext = createContext(null);

function readVolumeCookie() {
  const saved = Number(Cookies.get('volume'));
  return Number.isFinite(saved) && saved >= 0 && saved <= 1 ? saved : 0.5;
}

export function PlayerProvider({ children }) {
  const { user } = useAuth();
  const audioRef = useRef(null);
  const nextTrackRef = useRef(null);

  const [track, setTrack] = useState(null); // { id, name, artist, image, url }
  const [history, setHistory] = useState([]);
  const [nextTrack, setNextTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const [volume, setVolume] = useState(readVolumeCookie);
  const [likedSongs, setLikedSongs] = useState([]);

  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);

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
    setTrack(null);
    setNextTrack(null);
    setHistory([]);
    setIsPlaying(false);
    setTime({ current: 0, duration: 0 });
  }, [user]);

  // ---- liked songs --------------------------------------------------------
  const refreshLikedSongs = useCallback(async () => {
    if (!user) {
      setLikedSongs([]);
      return;
    }
    try {
      const data = await userService.getUser(user.id, user.token);
      setLikedSongs(data.songs || []);
    } catch {
      // keep the previous list on transient failures
    }
  }, [user]);

  useEffect(() => {
    refreshLikedSongs();
  }, [refreshLikedSongs]);

  const isLiked = useCallback(
    (songId) => likedSongs.some((song) => song.song_id === songId),
    [likedSongs]
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

  const unlikeTrack = useCallback(
    async (songId) => {
      if (!user) return;
      const snapshot = likedSongs;
      setLikedSongs((prev) => prev.filter((item) => item.song_id !== songId));
      try {
        await userService.unlikeSong(user.id, user.token, songId);
      } catch {
        setLikedSongs(snapshot);
      }
    },
    [user, likedSongs]
  );

  // ---- playback -----------------------------------------------------------
  const playTrack = useCallback(async (candidate) => {
    if (!candidate?.url || !audioRef.current) return;
    const audio = audioRef.current;

    setTrack(candidate);
    setHistory((prev) =>
      prev[prev.length - 1]?.id === candidate.id ? prev : [...prev, candidate]
    );

    if (audio.src !== candidate.url) audio.src = candidate.url;
    try {
      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.log(error);
    }
  }, []);

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
    if (nextTrackRef.current) playTrack(nextTrackRef.current);
  }, [playTrack]);

  const playPrevious = useCallback(() => {
    if (history.length === 0) return;
    const index = history.findIndex((item) => item.id === track?.id);
    const previous =
      history[(index - 1 + history.length) % history.length];
    if (previous) playTrack(previous);
  }, [history, track, playTrack]);

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
        playTrack(nextTrackRef.current);
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [playTrack]);

  // ---- autoplay queue: prepare the next track when the current one changes
  useEffect(() => {
    if (!track?.id) return;
    let cancelled = false;

    const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];

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

    async function fromLikedSongs(currentId) {
      if (!user) return null;
      const data = await userService.getUser(user.id, user.token);
      const pool = (data.songs || []).filter(
        (song) => song.song_id !== currentId
      );
      return pool.length > 0 ? likedSongToTrack(pickRandom(pool)) : null;
    }

    async function prepareNext() {
      let candidate = null;
      try {
        candidate = await fromArtistTopSongs(track.id);
      } catch {
        candidate = null;
      }
      if (!candidate) {
        try {
          candidate = await fromLikedSongs(track.id);
        } catch {
          candidate = null;
        }
      }
      if (!cancelled) setNextTrack(candidate);
    }

    prepareNext();
    return () => {
      cancelled = true;
    };
  }, [track?.id, user]);

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
    navigator.mediaSession.setActionHandler('play', togglePlay);
    navigator.mediaSession.setActionHandler('pause', togglePlay);
    navigator.mediaSession.setActionHandler('previoustrack', playPrevious);
    navigator.mediaSession.setActionHandler('nexttrack', playNext);
  }, [track, togglePlay, playPrevious, playNext]);

  const value = {
    track,
    isPlaying,
    time,
    volume,
    setVolume,
    likedSongs,
    isLiked,
    likeTrack,
    unlikeTrack,
    refreshLikedSongs,
    playTrack,
    togglePlay,
    playNext,
    playPrevious,
    seekTo,
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
