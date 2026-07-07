import { useEffect, useState } from 'react';
import { musicService } from '../services/musicService';
import { useAuth } from '../context/AuthContext';
import { readCache, writeCache } from '../utils/sessionCache';
import SongCard from '../components/ui/SongCard';
import { ShelfSkeleton } from '../components/ui/Skeletons';
import ErrorState from '../components/ui/ErrorState';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Charts refresh slowly; navigating back to Home within this window
// renders straight from cache with no network round trip
const CHART_TTL = 30 * 60 * 1000;

// Each shelf loads, caches, and retries on its own. One chart still loading
// (or failing) never drags the other into a skeleton or an error state, and
// retrying one leaves the other untouched.
function useChart(cacheKey, fetcher) {
  const [songs, setSongs] = useState(() => readCache(cacheKey, CHART_TTL) || []);
  const [status, setStatus] = useState(() =>
    readCache(cacheKey, CHART_TTL) ? 'ok' : 'loading'
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Fresh cache and not an explicit retry — nothing to fetch
    if (attempt === 0 && readCache(cacheKey, CHART_TTL)) return;
    let cancelled = false;
    setStatus('loading');

    fetcher()
      .then((data) => {
        if (cancelled) return;
        const results = data.results || [];
        setSongs(results);
        if (results.length > 0) {
          writeCache(cacheKey, results);
          setStatus('ok');
        } else {
          setStatus('error');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, cacheKey, fetcher]);

  const retry = () => setAttempt((current) => current + 1);
  return { songs, status, retry };
}

function Shelf({ title, chart }) {
  const { songs, status, retry } = chart;
  return (
    <section className="mb-10">
      <h2 className="mb-4 font-display text-xl font-bold tracking-tight lg:text-2xl">
        {title}
      </h2>
      {status === 'loading' ? (
        <ShelfSkeleton />
      ) : songs.length > 0 ? (
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
          {songs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      ) : (
        <ErrorState onRetry={retry} />
      )}
    </section>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const english = useChart('top-english', musicService.getTopEnglish);
  const hindi = useChart('top-hindi', musicService.getTopHindi);

  return (
    <div className="pt-2">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight lg:text-4xl">
          {greeting()}
          {user?.name ? `, ${user.name}` : ''}
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Here&apos;s what the world is listening to right now.
        </p>
      </div>

      <Shelf title="Today's biggest hits" chart={english} />
      <Shelf title="Top Hindi hits" chart={hindi} />
    </div>
  );
}
