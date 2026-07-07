import { FiPlay, FiPause } from 'react-icons/fi';
import { usePlayer } from '../../context/PlayerContext';
import { pickImage, toTrack } from '../../utils/song';

/** Square card for horizontal shelves (home page). */
export default function SongCard({ song }) {
  const { playTrack, track, isPlaying, togglePlay } = usePlayer();
  const isCurrent = track?.id === song.id;

  const handleClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(toTrack(song));
    }
  };

  return (
    <button
      onClick={handleClick}
      className="group w-44 shrink-0 rounded-xl bg-ink-800/60 p-3 text-left transition-all duration-200 hover:-translate-y-1 hover:bg-ink-700"
    >
      <div className="relative overflow-hidden rounded-lg bg-ink-700">
        <img
          src={pickImage(song, 2)}
          alt=""
          loading="lazy"
          className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span
          className={`absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent-400 text-ink-950 shadow-lg shadow-black/40 transition-all duration-200 ${
            isCurrent
              ? 'opacity-100'
              : 'translate-y-1.5 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
          }`}
        >
          {isCurrent && isPlaying ? (
            <FiPause />
          ) : (
            <FiPlay className="ml-0.5" />
          )}
        </span>
      </div>
      <p
        className={`mt-2.5 truncate text-sm font-semibold ${
          isCurrent ? 'text-accent-400' : ''
        }`}
      >
        {song.name}
      </p>
      <p className="mt-0.5 truncate text-xs text-zinc-500">
        {song.artists?.primary?.[0]?.name || song.label}
      </p>
    </button>
  );
}
