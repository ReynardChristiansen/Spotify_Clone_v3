import { FiSearch, FiX } from 'react-icons/fi';

export default function SearchInput({ value, onChange, placeholder, autoFocus }) {
  return (
    <div className="relative">
      <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-zinc-500" />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/5 bg-ink-800 py-3.5 pl-12 pr-12 text-sm text-white placeholder-zinc-500 outline-none transition-all duration-150 focus:border-accent-400/40 focus:bg-ink-700"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-ink-600 hover:text-white"
        >
          <FiX className="animate-pop" />
        </button>
      )}
    </div>
  );
}
