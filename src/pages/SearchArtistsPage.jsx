import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { musicService } from '../services/musicService';
import { useDebounce } from '../hooks/useDebounce';
import SearchInput from '../components/ui/SearchInput';
import ArtistAvatar from '../components/ui/ArtistAvatar';
import { pickImage } from '../utils/song';
import { readCache, writeCache } from '../utils/sessionCache';

function ArtistCard({ artist, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-3 rounded-xl bg-ink-800/60 p-5 transition-all duration-200 hover:-translate-y-1 hover:bg-ink-700"
    >
      <div className="w-full overflow-hidden rounded-full">
        <ArtistAvatar
          src={pickImage(artist, 2)}
          className="aspect-square w-full transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="w-full text-center">
        <p className="truncate text-sm font-semibold">{artist.name}</p>
        <p className="mt-0.5 text-xs capitalize text-zinc-500">
          {artist.role || 'Artist'}
        </p>
      </div>
    </button>
  );
}

// Session cache so the query and results survive navigating away
// (cleared on logout)
const SAVED_KEY = 'search:artists';

export default function SearchArtistsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState(
    () => readCache(SAVED_KEY, Infinity)?.query || ''
  );
  const [artists, setArtists] = useState(
    () => readCache(SAVED_KEY, Infinity)?.artists || []
  );
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query.trim());
  // Monotonic request counter: only the newest request may write state, so a
  // slow (or abort-during-parse) stale response can't clobber newer results.
  const requestSeq = useRef(0);

  useEffect(() => {
    writeCache(SAVED_KEY, { query, artists });
  }, [query, artists]);

  useEffect(() => {
    if (!debouncedQuery) {
      setArtists([]);
      // Also reset loading: clearing the query mid-request used to leave the
      // skeletons up forever (the aborted request never turns loading off)
      setLoading(false);
      return;
    }
    const seq = ++requestSeq.current;
    const controller = new AbortController();
    setLoading(true);

    musicService
      .searchArtists(debouncedQuery, { limit: 100, signal: controller.signal })
      .then((data) => {
        if (seq !== requestSeq.current) return;
        setArtists(data.results || []);
        setLoading(false);
      })
      .catch((error) => {
        if (error.name === 'AbortError' || seq !== requestSeq.current) return;
        setArtists([]);
        setLoading(false);
      });

    // Kill the in-flight request as soon as the query moves on
    return () => controller.abort();
  }, [debouncedQuery]);

  return (
    <div className="mx-auto max-w-4xl pt-2">
      <h1 className="mb-6 font-display text-3xl font-bold tracking-tight lg:text-4xl">
        Artists
      </h1>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Find your favorite artist…"
        autoFocus
      />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {loading && artists.length === 0
          ? Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-3 rounded-xl p-5"
              >
                <div className="skeleton aspect-square w-full rounded-full" />
                <div className="skeleton h-3.5 w-2/3 rounded" />
              </div>
            ))
          : artists.map((artist) => (
              <ArtistCard
                key={artist.id}
                artist={artist}
                onClick={() => navigate(`/artists/${artist.id}`)}
              />
            ))}
      </div>

      {!loading && debouncedQuery && artists.length === 0 && (
        <p className="mt-14 text-center text-sm text-zinc-500">
          No artists found for “{debouncedQuery}”.
        </p>
      )}
      {!loading && !debouncedQuery && (
        <p className="mt-14 text-center text-sm text-zinc-500">
          Search any artist to explore their most popular songs.
        </p>
      )}
    </div>
  );
}
