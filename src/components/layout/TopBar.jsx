import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { LogoMark } from '../ui/Logo';

export default function TopBar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const initial = (user?.name || '?').charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-ink-900/85 px-4 py-3.5 backdrop-blur-xl lg:px-8">
      {/* Mobile brand / desktop history nav */}
      <Link to="/" aria-label="Go to home" className="lg:hidden">
        <LogoMark className="h-8 w-8" />
      </Link>
      <div className="hidden items-center gap-1.5 lg:flex">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="rounded-full bg-ink-800 p-2 text-zinc-400 transition-colors hover:bg-ink-700 hover:text-white"
        >
          <FiChevronLeft className="text-lg" />
        </button>
        <button
          onClick={() => navigate(1)}
          aria-label="Go forward"
          className="rounded-full bg-ink-800 p-2 text-zinc-400 transition-colors hover:bg-ink-700 hover:text-white"
        >
          <FiChevronRight className="text-lg" />
        </button>
      </div>

      {/* User chip + menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((open) => !open)}
          className="flex items-center gap-2.5 rounded-full bg-ink-800 py-1.5 pl-1.5 pr-4 transition-colors hover:bg-ink-700"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-400 font-display text-sm font-bold text-ink-950">
            {initial}
          </span>
          <span className="max-w-28 truncate text-sm font-medium">{user?.name}</span>
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 z-20 mt-2 w-44 animate-fade-up rounded-xl border border-white/5 bg-ink-800 p-1.5 shadow-2xl shadow-black/60">
              <button
                onClick={logout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-ink-700 hover:text-white"
              >
                <FiLogOut />
                Log out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
