import { FiRefreshCw, FiWifiOff } from 'react-icons/fi';

/** Friendly inline error/empty state with an optional retry action. */
export default function ErrorState({
  title = "Couldn't load songs",
  message = 'Check your connection and try again.',
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/5 bg-ink-800/40 px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-700 text-xl text-zinc-400">
        <FiWifiOff />
      </span>
      <div>
        <p className="font-display text-sm font-semibold text-zinc-200">{title}</p>
        <p className="mt-1 text-xs text-zinc-500">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 flex items-center gap-2 rounded-full bg-ink-700 px-5 py-2 text-xs font-semibold text-zinc-200 transition-all hover:bg-ink-600 active:scale-95"
        >
          <FiRefreshCw />
          Try again
        </button>
      )}
    </div>
  );
}
