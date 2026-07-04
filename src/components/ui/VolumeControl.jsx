import { useRef, useState } from 'react';
import { FiVolume, FiVolume1, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { usePlayer } from '../../context/PlayerContext';

function volumeIcon(volume) {
  if (volume === 0) return FiVolumeX;
  if (volume < 0.33) return FiVolume;
  if (volume < 0.66) return FiVolume1;
  return FiVolume2;
}

/**
 * Custom slider (instead of a native range input) so the fill, thumb and
 * icon can all animate together. Mirrors the seek bar's visual language:
 * thin track, white fill that turns lime on hover.
 */
export default function VolumeControl() {
  const { volume, setVolume } = usePlayer();
  const [dragging, setDragging] = useState(false);
  const barRef = useRef(null);
  // Volume to restore when unmuting
  const lastVolume = useRef(1);

  const muted = volume === 0;
  const Icon = volumeIcon(volume);

  const setFromPointer = (event) => {
    const rect = barRef.current.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    setVolume(Math.min(1, Math.max(0, ratio)));
  };

  const toggleMute = () => {
    if (muted) {
      setVolume(lastVolume.current || 1);
    } else {
      lastVolume.current = volume;
      setVolume(0);
    }
  };

  return (
    <div className="group flex items-center gap-2.5">
      <button
        onClick={toggleMute}
        aria-label={muted ? 'Unmute' : 'Mute'}
        title={muted ? 'Unmute' : 'Mute'}
        className={`p-1 transition-colors active:scale-90 ${
          muted ? 'text-zinc-600' : 'text-zinc-500 hover:text-white'
        }`}
      >
        {/* Keyed so the icon replays the pop animation when it swaps */}
        <Icon key={Icon.name} className="animate-pop text-lg" />
      </button>

      <div
        ref={barRef}
        role="slider"
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(volume * 100)}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
          setFromPointer(event);
        }}
        onPointerMove={(event) => dragging && setFromPointer(event)}
        onPointerUp={() => setDragging(false)}
        onWheel={(event) =>
          setVolume(
            Math.min(1, Math.max(0, volume - Math.sign(event.deltaY) * 0.05))
          )
        }
        className="w-24 cursor-pointer touch-none py-2"
      >
        <div className="h-1 rounded-full bg-ink-600">
          <div
            className={`relative h-full rounded-full ${
              dragging
                ? 'bg-accent-400'
                : 'bg-zinc-200 transition-[width,background-color] duration-150 group-hover:bg-accent-400'
            }`}
            style={{ width: `${volume * 100}%` }}
          >
            <span
              className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-md shadow-black/40 transition-[opacity,transform] duration-150 ${
                dragging
                  ? 'scale-110 opacity-100'
                  : 'scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100'
              }`}
              style={{ right: '-6px' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
