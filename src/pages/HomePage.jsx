import { useEffect, useState } from 'react';
import { musicService } from '../services/musicService';
import { useAuth } from '../context/AuthContext';
import SongCard from '../components/ui/SongCard';
import { ShelfSkeleton } from '../components/ui/Skeletons';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function Shelf({ title, songs, loading }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 font-display text-xl font-bold tracking-tight lg:text-2xl">
        {title}
      </h2>
      {loading ? (
        <ShelfSkeleton />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {songs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [english, setEnglish] = useState([]);
  const [hindi, setHindi] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      musicService.getTopEnglish(),
      musicService.getTopHindi(),
    ]).then(([englishResult, hindiResult]) => {
      if (cancelled) return;
      if (englishResult.status === 'fulfilled') {
        setEnglish(englishResult.value.results || []);
      }
      if (hindiResult.status === 'fulfilled') {
        setHindi(hindiResult.value.results || []);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

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

      <Shelf title="Today's biggest hits" songs={english} loading={loading} />
      <Shelf title="Top Hindi hits" songs={hindi} loading={loading} />
    </div>
  );
}
