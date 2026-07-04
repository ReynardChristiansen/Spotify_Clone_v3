export function LogoMark({ className = 'w-9 h-9' }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <rect width="512" height="512" rx="128" fill="#c3f53c" />
      <g fill="#09090b">
        <rect x="120" y="216" width="40" height="80" rx="20" />
        <rect x="184" y="168" width="40" height="176" rx="20" />
        <rect x="248" y="120" width="40" height="272" rx="20" />
        <rect x="312" y="168" width="40" height="176" rx="20" />
        <rect x="376" y="216" width="40" height="80" rx="20" />
      </g>
    </svg>
  );
}

export default function Logo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-8 w-8" />
      <span className="font-display text-xl font-bold tracking-tight">Hirmify</span>
    </div>
  );
}
