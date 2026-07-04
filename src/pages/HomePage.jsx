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

function Shelf({ title, songs, loading, onRetry }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 font-display text-xl font-bold tracking-tight lg:text-2xl">
        {title}
      </h2>
      {loading ? (
        <ShelfSkeleton />
      ) : songs.length > 0 ? (
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
          {songs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      ) : (
        <ErrorState onRetry={onRetry} />
      )}
    </section>
  );
}

// Charts refresh slowly; navigating back to Home within this window
// renders straight from cache with no network round trip
const CHART_TTL = 30 * 60 * 1000;

export default function HomePage() {
  const { user } = useAuth();
  const [english, setEnglish] = useState(
    () => readCache('top-english', CHART_TTL) || []
  );
  const [hindi, setHindi] = useState(
    () => readCache('top-hindi', CHART_TTL) || []
  );
  const [loading, setLoading] = useState(
    () => !readCache('top-english', CHART_TTL) && !readCache('top-hindi', CHART_TTL)
  );
  const [attempt, setAttempt] = useState(0);

  const retry = () => {
    setLoading(true);
    setAttempt((current) => current + 1);
  };

  useEffect(() => {
    // Fresh cache and not an explicit retry — nothing to fetch
    if (
      attempt === 0 &&
      readCache('top-english', CHART_TTL) &&
      readCache('top-hindi', CHART_TTL)
    ) {
      return;
    }
    let cancelled = false;

    Promise.allSettled([
      musicService.getTopEnglish(),
      musicService.getTopHindi(),
    ]).then(([englishResult, hindiResult]) => {
      if (cancelled) return;
      if (englishResult.status === 'fulfilled') {
        const results = englishResult.value.results || [];
        setEnglish(results);
        if (results.length > 0) writeCache('top-english', results);
      }
      if (hindiResult.status === 'fulfilled') {
        const results = hindiResult.value.results || [];
        setHindi(results);
        if (results.length > 0) writeCache('top-hindi', results);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

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

      <Shelf
        title="Today's biggest hits"
        songs={english}
        loading={loading}
        onRetry={retry}
      />
      <Shelf
        title="Top Hindi hits"
        songs={hindi}
        loading={loading}
        onRetry={retry}
      />
    </div>
  );
}
