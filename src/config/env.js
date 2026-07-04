// API base URLs. Override via .env / .env.local (or Vercel env vars):
//   VITE_MUSIC_API_URL=https://proxy-server-song-v2.vercel.app
//   VITE_USER_API_URL=https://hirmify-api.vercel.app

// A base URL without a scheme (e.g. "proxy.vercel.app") would be treated by
// fetch as a relative path — force https:// when it's missing.
function withScheme(url) {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export const MUSIC_API_URL = withScheme(
  import.meta.env.VITE_MUSIC_API_URL ||
    (import.meta.env.DEV
      ? 'http://localhost:3000'
      : 'https://proxy-server-song-v2.vercel.app')
);

export const USER_API_URL = withScheme(
  import.meta.env.VITE_USER_API_URL || 'https://hirmify-api.vercel.app'
);
