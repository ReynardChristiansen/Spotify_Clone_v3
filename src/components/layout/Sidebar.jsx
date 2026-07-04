import { Link, NavLink } from 'react-router-dom';
import {
  FiHome,
  FiSearch,
  FiMic,
  FiHeart,
} from 'react-icons/fi';
import Logo from '../ui/Logo';

const MENU_ITEMS = [
  { to: '/', label: 'Home', icon: FiHome },
  { to: '/search', label: 'Search', icon: FiSearch },
  { to: '/artists', label: 'Artists', icon: FiMic },
];

const LIBRARY_ITEMS = [{ to: '/liked', label: 'Liked Songs', icon: FiHeart }];

const NAV_ITEMS = [...MENU_ITEMS, ...LIBRARY_ITEMS];

function SidebarLink({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `group relative flex items-center gap-3.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
          isActive
            ? 'bg-ink-700 text-white'
            : 'text-zinc-400 hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`absolute left-0 h-5 w-1 rounded-r-full bg-accent-400 transition-opacity ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <Icon
            className={`text-lg transition-colors ${
              isActive ? 'text-accent-400' : ''
            }`}
          />
          {label}
        </>
      )}
    </NavLink>
  );
}

/** Desktop sidebar — its own panel next to the main content panel. */
export default function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col rounded-2xl bg-ink-900 p-5 lg:flex">
      <Link to="/" aria-label="Go to home" className="mb-8 block w-fit px-3 pt-1">
        <Logo />
      </Link>

      <p className="mb-2 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        Menu
      </p>
      <nav className="mb-7 flex flex-col gap-0.5">
        {MENU_ITEMS.map((item) => (
          <SidebarLink key={item.to} {...item} />
        ))}
      </nav>

      <p className="mb-2 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        Library
      </p>
      <nav className="flex flex-col gap-0.5">
        {LIBRARY_ITEMS.map((item) => (
          <SidebarLink key={item.to} {...item} />
        ))}
      </nav>

      <div className="mt-auto rounded-xl border border-white/5 bg-ink-800 p-4">
        <p className="font-display text-sm font-semibold">Install Hirmify</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
          Add it from your browser menu and use it like a native app.
        </p>
      </div>
    </aside>
  );
}

/** Mobile bottom navigation. */
export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-white/5 bg-ink-950/90 backdrop-blur-xl lg:hidden">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 pb-2.5 pt-3 text-[10px] font-medium transition-colors ${
              isActive ? 'text-accent-400' : 'text-zinc-500'
            }`
          }
        >
          <Icon className="text-xl" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
