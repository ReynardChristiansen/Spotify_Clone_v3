/** Best available stream URL: prefers 320kbps, falls back down the list. */
export function pickStreamUrl(song) {
  const urls = song?.downloadUrl || [];
  for (let i = urls.length - 1; i >= 0; i--) {
    if (urls[i]?.url) return urls[i].url;
  }
  return '';
}

/** Image at the requested quality index (0=50px, 1=150px, 2=500px). */
export function pickImage(song, index = 2) {
  const images = song?.image || [];
  return images[index]?.url || images[images.length - 1]?.url || '';
}

/** API song -> the minimal track object the player works with. */
export function toTrack(song) {
  return {
    id: song.id,
    name: song.name,
    artist: song.artists?.primary?.[0]?.name || '',
    image: pickImage(song, 2),
    url: pickStreamUrl(song),
  };
}

/** Liked-song document (user API shape) -> player track object. */
export function likedSongToTrack(liked) {
  return {
    id: liked.song_id,
    name: liked.song_name,
    artist: '',
    image: liked.song_image,
    url: liked.song_url,
  };
}

export function formatTime(totalSeconds) {
  if (!Number.isFinite(totalSeconds)) return '0:00';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatCount(value) {
  if (!Number.isFinite(Number(value))) return '0';
  return new Intl.NumberFormat('en', { notation: 'compact' }).format(Number(value));
}
