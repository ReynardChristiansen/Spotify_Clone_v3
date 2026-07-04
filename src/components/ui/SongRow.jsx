import { FiHeart, FiPlay, FiTrash2 } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import { usePlayer } from '../../context/PlayerContext';
import { formatTime } from '../../utils/song';

function PlayingIndicator({ paused }) {
  return (
    <span className={`eq ${paused ? 'paused' : ''}`}>
      <i />
      <i />
      <i />
    </span>
  );
}

/**
 * List row used on search / artist / liked pages.
 * `track` is the player-shaped object: { id, name, artist, image, url }.
 * `thumb` is an optional small artwork URL — track.image stays full-size for
 * the player, but a 44px row shouldn't download 500px covers.
 * `source` tags where playback starts from ('liked' on the liked page) so the
 * player knows which pool to autoplay from next.
 */
export default function SongRow({
  track,
  thumb,
  index,
  meta,
  onDelete,
  exiting,
  source,
}) {
  const {
    playTrack,
    track: current,
    isPlaying,
    isLiked,
    likeTrack,
    unlikeTrack,
  } = usePlayer();
  const isCurrent = current?.id === track.id;
  const liked = isLiked(track.id);

  const toggleLike = (event) => {
    event.stopPropagation();
    if (liked) {
      unlikeTrack(track.id);
    } else {
      likeTrack(track);
    }
  };

  return (
    <div
      onClick={() => playTrack(track, source)}
      className={`group mb-1.5 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors duration-150 hover:bg-ink-700/70 ${
        isCurrent ? 'bg-ink-700/70' : ''
      } ${exiting ? 'row-exit' : ''}`}
    >
      {/* Index / playing indicator */}
      {Number.isFinite(index) && (
        <span className="flex w-6 shrink-0 items-center justify-center text-xs tabular-nums text-zinc-500">
          {isCurrent ? (
            <PlayingIndicator paused={!isPlaying} />
          ) : (
            <>
              <span className="group-hover:hidden">{index + 1}</span>
              <FiPlay className="hidden text-white group-hover:block" />
            </>
          )}
        </span>
      )}

      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-ink-700">
        <img
          src={thumb || track.image}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-medium ${
            isCurrent ? 'text-accent-400' : ''
          }`}
        >
          {track.name}
        </p>
        {track.artist && (
          <p className="truncate text-xs text-zinc-500">{track.artist}</p>
        )}
      </div>

      {meta?.year && (
        <span className="hidden w-12 text-right text-xs tabular-nums text-zinc-500 md:block">
          {meta.year}
        </span>
      )}
      {Number.isFinite(meta?.duration) && (
        <span className="hidden w-12 text-right text-xs tabular-nums text-zinc-500 sm:block">
          {formatTime(meta.duration)}
        </span>
      )}

      {/* Rows with a delete action (liked page) skip the heart — it would do the same thing */}
      {!onDelete && (
        <button
          onClick={toggleLike}
          aria-label={liked ? 'Unlike' : 'Like'}
          className={`p-2 transition-all active:scale-90 ${
            liked
              ? 'text-accent-400'
              : 'text-zinc-500 hover:text-white lg:opacity-0 lg:group-hover:opacity-100'
          }`}
        >
          {liked ? <FaHeart className="animate-pop" /> : <FiHeart />}
        </button>
      )}

      {onDelete && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDelete(track.id);
          }}
          aria-label="Remove from liked songs"
          className="p-2 text-zinc-500 transition-colors hover:text-red-400"
        >
          <FiTrash2 />
        </button>
      )}
    </div>
  );
}
