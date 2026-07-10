import { forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';

/**
 * Gmail-style undo snackbar: a dark pill in the bottom-left corner, sitting
 * just above the player bar (desktop) or the mini player / bottom nav
 * (mobile). Purely presentational — the owner keeps it up until the user
 * does something else (scroll, a tap elsewhere) and closes it then; the ref
 * lets the owner exempt taps on the pill itself from "elsewhere". The ✕
 * simply dismisses it (the delete stands, same as Gmail).
 *
 * Rendered through a portal to <body>: the route wrapper keeps a transform
 * from its fade-up animation, which would otherwise turn it into the
 * containing block for this fixed element and pin the pill to the content
 * instead of the viewport.
 */
const UndoSnackbar = forwardRef(function UndoSnackbar(
  { message, onUndo, onDismiss, lifted = false },
  ref
) {
  return createPortal(
    <div
      ref={ref}
      role="status"
      className={`fixed left-4 z-40 flex max-w-[calc(100vw-2rem)] animate-fade-up items-center rounded-lg bg-ink-700 py-1.5 pl-4 pr-1.5 text-sm text-zinc-100 shadow-2xl shadow-black/60 ring-1 ring-white/10 lg:bottom-28 lg:left-6 ${
        lifted ? 'bottom-[150px]' : 'bottom-[84px]'
      }`}
    >
      <span className="min-w-0 truncate pr-2">{message}</span>
      <button
        onClick={onUndo}
        className="shrink-0 rounded-md px-3 py-2 text-sm font-semibold text-accent-400 transition-colors hover:bg-white/5 hover:text-accent-300"
      >
        Undo
      </button>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-md p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
      >
        <FiX />
      </button>
    </div>,
    document.body
  );
});

export default UndoSnackbar;
