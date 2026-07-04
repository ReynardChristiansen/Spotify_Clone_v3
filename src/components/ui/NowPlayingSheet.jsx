import { useEffect, useRef, useState } from 'react';
import {
  FiChevronDown,
  FiHeart,
  FiPause,
  FiPlay,
  FiSkipBack,
  FiSkipForward,
} from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import { usePlayer } from '../../context/PlayerContext';
import { formatTime } from '../../utils/song';
import ScrollingText from './ScrollingText';

/**
 * Mobile full-screen "Now Playing" view, opened by tapping the mini player.
 * Slides up over everything; closes via the chevron, a swipe down on the
 * artwork, or the slide-down animation finishing after either of those.
 */
export default function NowPlayingSheet({ onClose }) {
  const {
    track,
    isPlaying,
    togglePlay,
    playNext,
    playPrevious,
    time,
    seekTo,
    isLiked,
    likeTrack,
    unlikeTrack,
    hasNext,
  } = usePlayer();

  const [closing, setClosing] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const seekBarRef = useRef(null);
  const touchStartY = useRef(null);
  const closingRef = useRef(false);

  // Animate out, then unmount. Timer instead of animationend — Safari drops
  // that event often enough that relying on it can leave the sheet stuck
  const startClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    setTimeout(onClose, 280);
  };

  // Register the sheet in browser history so the phone's back button/gesture
  // closes it (back to the page underneath) instead of leaving the page
  useEffect(() => {
    if (!window.history.state?.nowPlaying) {
      window.history.pushState({ nowPlaying: true }, '');
    }
    window.addEventListener('popstate', startClose);
    return () => window.removeEventListener('popstate', startClose);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!track) return null;

  const liked = isLiked(track.id);
  const progress = time.duration ? time.current / time.duration : 0;

  // Consume our history entry; the resulting popstate runs the close animation
  const close = () => {
    if (window.history.state?.nowPlaying) {
      window.history.back();
    } else {
      startClose();
    }
  };

  const seekFromPointer = (event) => {
    const rect = seekBarRef.current.getBoundingClientRect();
    seekTo(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)));
  };

  const toggleLike = () => {
    if (liked) {
      unlikeTrack(track.id);
    } else {
      likeTrack(track);
    }
  };

  return (
    // The fixed root never gets a transform — animating a fixed element
    // breaks Safari's hit-testing (taps land where the element used to be),
    // so the slide animation lives on the inner wrapper instead
    <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
      <div
        className={`relative flex h-full flex-col overflow-hidden bg-ink-950 ${
          closing ? 'animate-slide-down' : 'animate-slide-up'
        }`}
      >
        {/* Blurred artwork backdrop. pointer-events-none matters on iOS: Safari
          promotes the blurred/scaled layer and it can swallow taps meant for
          the content above it */}
        <img
          src={track.image}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-25 blur-3xl"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-ink-950/40 to-ink-950" />

        {/* pt respects the notch/status bar when installed as a PWA */}
        <div
          className="relative z-10 flex h-full flex-col px-6 pb-10 pt-4"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close now playing"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 backdrop-blur transition-transform active:scale-90"
          >
            <FiChevronDown className="text-xl" />
          </button>

          {/* Artwork — swipe down here also closes */}
          <div
            className="flex min-h-0 flex-1 items-center justify-center py-6"
            onTouchStart={(event) => {
              touchStartY.current = event.touches[0].clientY;
            }}
            onTouchMove={(event) => {
              if (
                touchStartY.current !== null &&
                event.touches[0].clientY - touchStartY.current > 70
              ) {
                touchStartY.current = null;
                close();
              }
            }}
          >
            <img
              src={track.image}
              alt=""
              className="aspect-square w-full max-w-xs rounded-2xl object-cover shadow-2xl shadow-black/60"
            />
          </div>

          {/* Title + like */}
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <ScrollingText
                text={track.name}
                className="font-display text-xl font-bold"
              />
              {track.artist && (
                <p className="mt-1 truncate text-sm text-zinc-400">
                  {track.artist}
                </p>
              )}
            </div>
            <button
              onClick={toggleLike}
              aria-label={liked ? 'Unlike' : 'Like'}
              className="shrink-0 p-2 text-xl text-zinc-400 transition-transform active:scale-90"
            >
              {liked ? (
                <FaHeart className="animate-pop text-accent-400" />
              ) : (
                <FiHeart />
              )}
            </button>
          </div>

          {/* Seek bar */}
          <div
            ref={seekBarRef}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setSeeking(true);
              seekFromPointer(event);
            }}
            onPointerMove={(event) => seeking && seekFromPointer(event)}
            onPointerUp={() => setSeeking(false)}
            className="mt-5 cursor-pointer touch-none py-2"
          >
            <div className="h-1 rounded-full bg-white/15">
              <div
                className="relative h-full rounded-full bg-white"
                style={{ width: `${progress * 100}%` }}
              >
                <span
                  className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-md shadow-black/40 transition-transform ${
                    seeking ? 'scale-110' : ''
                  }`}
                  style={{ right: '-6px' }}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-between text-[11px] tabular-nums text-zinc-500">
            <span>{formatTime(time.current)}</span>
            <span>{formatTime(time.duration)}</span>
          </div>

          {/* Controls */}
          <div className="mt-4 flex items-center justify-center gap-10">
            <button
              onClick={playPrevious}
              aria-label="Previous"
              className="text-zinc-300 transition-transform active:scale-90"
            >
              <FiSkipBack className="text-3xl" />
            </button>
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-400 text-ink-950 transition-transform active:scale-95"
            >
              {isPlaying ? (
                <FiPause className="text-2xl" />
              ) : (
                <FiPlay className="ml-1 text-2xl" />
              )}
            </button>
            <button
              onClick={playNext}
              disabled={!hasNext}
              aria-label="Next"
              className="text-zinc-300 transition-transform active:scale-90 disabled:opacity-30"
            >
              <FiSkipForward className="text-3xl" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
