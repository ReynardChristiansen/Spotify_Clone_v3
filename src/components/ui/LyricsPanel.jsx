import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { musicService } from '../../services/musicService';
import { usePlayer } from '../../context/PlayerContext';

/** Full-screen lyrics overlay for the current track. */
export default function LyricsPanel({ onClose }) {
  const { track } = usePlayer();
  const [lyrics, setLyrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!track?.id) return;
    let cancelled = false;
    setLoading(true);
    setLyrics(null);

    musicService
      .getLyrics(track.id)
      .then((data) => {
        if (!cancelled) setLyrics(data?.lyrics || null);
      })
      .catch(() => {
        if (!cancelled) setLyrics(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [track?.id]);

  return (
    <div className="fixed inset-0 z-40 animate-fade-in bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-6 pb-32 pt-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {track?.image && (
              <img
                src={track.image}
                alt=""
                className="h-14 w-14 rounded-lg object-cover shadow-lg"
              />
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-400">
                Lyrics
              </p>
              <h3 className="truncate font-display text-xl font-bold">
                {track?.name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close lyrics"
            className="shrink-0 rounded-full bg-ink-800 p-3 text-zinc-400 transition-colors hover:bg-ink-700 hover:text-white"
          >
            <FiX />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }, (_, index) => (
                <div
                  key={index}
                  className="skeleton h-5 rounded"
                  style={{ width: `${55 + ((index * 13) % 35)}%` }}
                />
              ))}
            </div>
          ) : lyrics ? (
            <div className="animate-fade-up space-y-1.5 pb-10 text-xl font-medium leading-relaxed text-zinc-200">
              {/* Lyrics arrive as text separated by <br> tags — render as plain lines */}
              {lyrics.split(/<br\s*\/?>/i).map((line, index) => (
                <p key={index}>{line || ' '}</p>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500">No lyrics available for this song.</p>
          )}
        </div>
      </div>
    </div>
  );
}
