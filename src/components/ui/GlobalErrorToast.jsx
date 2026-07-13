import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiAlertTriangle, FiX } from 'react-icons/fi';
import { useOffline } from '../../context/OfflineContext';

// How long the toast stays up before auto-hiding. Long enough to read, short
// enough that a stale error doesn't linger once the user has moved on.
const AUTO_DISMISS_MS = 6000;

/**
 * App-wide error popup. Any download failure surfaced by OfflineContext
 * (timeout, network drop, storage full, ...) pops a dismissable red toast at
 * the top of the screen, on whatever page the user happens to be on — so the
 * error is never buried on a page they've navigated away from.
 *
 * Auto-hides after AUTO_DISMISS_MS; the ✕ closes it immediately. Rendered
 * through a portal to <body> so a page's transform/animation can't pin or clip
 * it (same reason as UndoSnackbar).
 */
export default function GlobalErrorToast() {
  const { error, clearError } = useOffline() || {};

  useEffect(() => {
    if (!error) return undefined;
    const id = setTimeout(() => clearError?.(), AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [error, clearError]);

  if (!error) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div
        role="alert"
        className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl border border-red-500/30 bg-ink-800/95 px-4 py-3 text-sm text-red-100 shadow-2xl shadow-black/60 ring-1 ring-red-500/20 backdrop-blur animate-fade-up"
      >
        <FiAlertTriangle className="shrink-0 text-red-400" />
        <span className="flex-1">{error}</span>
        <button
          onClick={clearError}
          aria-label="Dismiss"
          className="shrink-0 rounded-md p-1 text-red-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          <FiX />
        </button>
      </div>
    </div>,
    document.body
  );
}
