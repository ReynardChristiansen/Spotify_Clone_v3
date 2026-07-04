import { useState } from 'react';
import { FiMic } from 'react-icons/fi';

/**
 * Artist image with a reliable fallback. JioSaavn's default artist image
 * (artist-default-*.png) is frequently blocked by the browser (ORB), so
 * artists without a real photo get our own themed mic placeholder instead.
 */
export default function ArtistAvatar({ src, alt = '', className = '' }) {
  const [failed, setFailed] = useState(false);
  const hasRealPhoto = src && !src.includes('artist-default');

  if (!hasRealPhoto || failed) {
    return (
      <div className={`flex items-center justify-center bg-ink-700 ${className}`}>
        <FiMic className="h-1/3 w-1/3 text-zinc-600" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
