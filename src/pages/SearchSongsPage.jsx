import { useEffect, useRef, useState } from 'react';
import { musicService } from '../services/musicService';
import { useDebounce } from '../hooks/useDebounce';
import SearchInput from '../components/ui/SearchInput';
import SongRow from '../components/ui/SongRow';
import { ListSkeleton } from '../components/ui/Skeletons';
import { pickImage, toTrack } from '../utils/song';

const LANGUAGE_CHIPS = [
  { value: 'all', label: 'All' },
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'Hindi' },
];

// Module-level cache: survives navigation (page unmount) within the session,
// so coming back to Search restores the query and results instantly.
const saved = { query: '', songs: [] };

export default function SearchSongsPage() {
  const [query, setQuery] = useState(() => saved.query);
  // Persisted so the chip survives navigating away and back
  const [lang, setLang] = useState(
    () => localStorage.getItem('searchLang') || 'english'
  );

  const [songs, setSongs] = useState(() => saved.songs);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    saved.query = query;
    saved.songs = songs;
  }, [query, songs]);
  const debouncedQuery = useDebounce(query.trim());
  // Monotonic request counter: only the newest request may write state,
  // so a slow stale response can never flash old-language results.
  const requestSeq = useRef(0);

  const changeLang = (value) => {
    if (value === lang) return;
    setLang(value);
    localStorage.setItem('searchLang', value);
    // Clear the old-language list in the same render as the chip switch —
    // the effect only runs after paint, which used to leave a stale frame
    if (query.trim()) {
      setSongs([]);
      setLoading(true);
    }
  };

  useEffect(() => {
    if (!debouncedQuery) {
      setSongs([]);
      setLoading(false);
      return;
    }
    const seq = ++requestSeq.current;
    const controller = new AbortController();
    setLoading(true);

    musicService
      .searchSongs(debouncedQuery, { limit: 100, lang, signal: controller.signal })
      .then((data) => {
        if (seq === requestSeq.current) setSongs(data.results || []);
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        if (seq === requestSeq.current) setSongs([]);
      })
      .finally(() => {
        if (seq === requestSeq.current) setLoading(false);
      });

    // Kill the in-flight request as soon as the query/lang moves on
    return () => controller.abort();
  }, [debouncedQuery, lang]);

  return (
    <div className="mx-auto max-w-3xl pt-2">
      <h1 className="mb-6 font-display text-3xl font-bold tracking-tight lg:text-4xl">
        Search
      </h1>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="What do you want to hear?"
        autoFocus
      />

      <div className="mt-4 flex gap-2">
        {LANGUAGE_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => changeLang(chip.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              lang === chip.value
                ? 'bg-accent-400 text-ink-950'
                : 'bg-ink-800 text-zinc-400 hover:bg-ink-700 hover:text-white'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading && songs.length === 0 ? (
          <ListSkeleton />
        ) : songs.length > 0 ? (
          <div>
            {songs.map((song, index) => (
              <SongRow
                key={song.id}
                index={index}
                track={toTrack(song)}
                thumb={pickImage(song, 1)}
                meta={{ year: song.year, duration: song.duration }}
              />
            ))}
          </div>
        ) : debouncedQuery ? (
          <p className="mt-14 text-center text-sm text-zinc-500">
            No results for “{debouncedQuery}”.
          </p>
        ) : (
          <p className="mt-14 text-center text-sm text-zinc-500">
            Search for any song, in any language.
          </p>
        )}
      </div>
    </div>
  );
}
