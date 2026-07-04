import {
  FiHeart,
  FiPause,
  FiPlay,
  FiSkipBack,
  FiSkipForward,
  FiVolume2,
} from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import { usePlayer } from '../../context/PlayerContext';
import { formatTime } from '../../utils/song';
import ScrollingText from '../ui/ScrollingText';

export default function PlayerBar() {
  const {
    track,
    isPlaying,
    togglePlay,
    playNext,
    playPrevious,
    time,
    seekTo,
    volume,
    setVolume,
    isLiked,
    likeTrack,
    unlikeTrack,
    hasNext,
  } = usePlayer();

  const progress = time.duration ? time.current / time.duration : 0;
  const liked = track ? isLiked(track.id) : false;

  const handleSeek = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    seekTo((event.clientX - rect.left) / rect.width);
  };

  const toggleLike = () => {
    if (!track) return;
    if (liked) {
      unlikeTrack(track.id);
    } else {
      likeTrack(track);
    }
  };

  return (
    <>
      {/* Floating panel on mobile (hidden until something plays); in-flow bottom bar on desktop */}
      <div
        className={`fixed inset-x-2 bottom-[68px] z-30 rounded-2xl border border-white/5 bg-ink-900/95 px-4 py-2.5 shadow-2xl shadow-black/60 backdrop-blur-xl lg:static lg:inset-x-0 lg:block lg:shrink-0 lg:px-6 lg:py-3 lg:shadow-none ${
          track ? 'animate-fade-up' : 'hidden'
        }`}
      >
        <div className="flex items-center gap-4">
          {/* Track info */}
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:w-56 sm:flex-none lg:w-72">
            {track ? (
              <>
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-ink-700">
                  <img
                    src={track.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <ScrollingText text={track.name} className="text-sm font-semibold" />
                  {track.artist && (
                    <p className="truncate text-xs text-zinc-500">{track.artist}</p>
                  )}
                </div>
                <button
                  onClick={toggleLike}
                  aria-label={liked ? 'Unlike' : 'Like'}
                  className="shrink-0 p-1.5 text-zinc-500 transition-transform hover:text-white active:scale-90"
                >
                  {liked ? (
                    <FaHeart className="animate-pop text-accent-400" />
                  ) : (
                    <FiHeart />
                  )}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-lg border border-dashed border-ink-600" />
                <p className="hidden text-xs text-zinc-500 sm:block">
                  Nothing playing
                </p>
              </div>
            )}
          </div>

          {/* Controls + progress */}
          <div className="flex shrink-0 flex-col items-center gap-1.5 sm:min-w-0 sm:flex-1">
            <div className="flex items-center gap-6">
              <button
                onClick={playPrevious}
                disabled={!track}
                aria-label="Previous"
                className="text-zinc-400 transition-all hover:text-white active:scale-90 disabled:opacity-30"
              >
                <FiSkipBack className="text-lg" />
              </button>
              <button
                onClick={togglePlay}
                disabled={!track}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-400 text-ink-950 transition-all hover:bg-accent-300 active:scale-95 disabled:opacity-30"
              >
                {isPlaying ? (
                  <FiPause className="text-lg" />
                ) : (
                  <FiPlay className="ml-0.5 text-lg" />
                )}
              </button>
              <button
                onClick={playNext}
                disabled={!hasNext}
                aria-label="Next"
                className="text-zinc-400 transition-all hover:text-white active:scale-90 disabled:opacity-30"
              >
                <FiSkipForward className="text-lg" />
              </button>
            </div>

            <div className="hidden w-full max-w-lg items-center gap-2.5 text-[11px] text-zinc-500 sm:flex">
              <span className="w-9 text-right tabular-nums">
                {formatTime(time.current)}
              </span>
              <div
                onClick={track ? handleSeek : undefined}
                className="group h-4 flex-1 cursor-pointer py-1.5"
              >
                <div className="h-1 w-full overflow-hidden rounded-full bg-ink-600">
                  <div
                    className="h-full rounded-full bg-zinc-200 transition-colors group-hover:bg-accent-400"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
              <span className="w-9 tabular-nums">{formatTime(time.duration)}</span>
            </div>
          </div>

          {/* Volume */}
          <div className="hidden w-72 items-center justify-end gap-4 lg:flex">
            <div className="flex items-center gap-2.5">
              <FiVolume2 className="text-zinc-500" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                style={{ '--fill': `${volume * 100}%` }}
                className="w-24"
                aria-label="Volume"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
