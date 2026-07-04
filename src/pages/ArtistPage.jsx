import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FiPlay } from 'react-icons/fi';
import { MdVerified } from 'react-icons/md';
import { musicService } from '../services/musicService';
import { usePlayer } from '../context/PlayerContext';
import SongRow from '../components/ui/SongRow';
import ArtistAvatar from '../components/ui/ArtistAvatar';
import { ListSkeleton } from '../components/ui/Skeletons';
import { formatCount, pickImage, pickStreamUrl, toTrack } from '../utils/song';
import { readCache, writeCache } from '../utils/sessionCache';

const ARTIST_TTL = 30 * 60 * 1000;

export default function ArtistPage() {
  const { id } = useParams();
  const { playTrack } = usePlayer();
  const [artist, setArtist] = useState(
    () => readCache(`artist:${id}`, ARTIST_TTL) || null
  );
  const [loading, setLoading] = useState(
    () => !readCache(`artist:${id}`, ARTIST_TTL)
  );

  useEffect(() => {
    const cached = readCache(`artist:${id}`, ARTIST_TTL);
    if (cached) {
      setArtist(cached);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setArtist(null);

    musicService
      .getArtistById(id)
      .then((data) => {
        if (cancelled) return;
        setArtist(data);
        if (data) writeCache(`artist:${id}`, data);
      })
      .catch(() => {
        if (!cancelled) setArtist(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const playableSongs = (artist?.topSongs || []).filter(pickStreamUrl);
  const heroImage = artist ? pickImage(artist, 2) : '';

  if (loading) {
    return (
      <div className="pt-2">
        <div className="flex items-end gap-6 pb-10 pt-4">
          <div className="skeleton h-44 w-44 rounded-2xl" />
          <div className="flex-1">
            <div className="skeleton h-9 w-1/2 rounded" />
            <div className="skeleton mt-3 h-4 w-1/4 rounded" />
          </div>
        </div>
        <ListSkeleton />
      </div>
    );
  }

  if (!artist) {
    return (
      <p className="mt-20 text-center text-sm text-zinc-500">
        Artist not found.
      </p>
    );
  }

  return (
    <div className="pt-2">
      {/* Hero — blurred artwork backdrop */}
      <div className="relative -mx-4 mb-8 overflow-hidden px-4 pb-8 pt-6 lg:-mx-8 lg:px-8">
        {heroImage && !heroImage.includes('artist-default') && (
          <>
            <img
              src={heroImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-3xl"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink-900/40 to-ink-900" />
          </>
        )}

        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-end">
          <ArtistAvatar
            src={heroImage}
            className="h-44 w-44 rounded-2xl shadow-2xl shadow-black/50"
          />
          <div className="pb-1 text-center sm:text-left">
            {artist.isVerified && (
              <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-300 sm:justify-start">
                <MdVerified className="text-accent-400" />
                Verified artist
              </p>
            )}
            <h1 className="mt-1.5 font-display text-4xl font-bold tracking-tight lg:text-6xl">
              {artist.name}
            </h1>
            <p className="mt-2.5 text-sm text-zinc-400">
              {formatCount(artist.followerCount)} followers
            </p>
          </div>
        </div>

        {playableSongs.length > 0 && (
          <button
            onClick={() => playTrack(toTrack(playableSongs[0]))}
            className="relative mt-7 flex items-center gap-2 rounded-full bg-accent-400 px-7 py-3 text-sm font-bold text-ink-950 transition-all hover:bg-accent-300 active:scale-95"
          >
            <FiPlay className="ml-0.5" /> Play
          </button>
        )}
      </div>

      {/* Top songs */}
      <h2 className="mb-4 font-display text-xl font-bold tracking-tight">
        Popular
      </h2>
      {playableSongs.length > 0 ? (
        playableSongs.map((song, index) => (
          <SongRow
            key={song.id}
            index={index}
            track={toTrack(song)}
            meta={{ year: song.year, duration: song.duration }}
          />
        ))
      ) : (
        <p className="text-sm text-zinc-500">No playable songs for this artist.</p>
      )}
    </div>
  );
}
