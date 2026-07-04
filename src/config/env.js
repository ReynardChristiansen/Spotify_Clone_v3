// API base URLs. Override via .env / .env.local:
//   VITE_MUSIC_API_URL=http://localhost:3000
//   VITE_USER_API_URL=https://hirmify-api.vercel.app
export const MUSIC_API_URL =
  import.meta.env.VITE_MUSIC_API_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:3000'
    : 'https://server-song-public.vercel.app');

export const USER_API_URL =
  import.meta.env.VITE_USER_API_URL || 'https://hirmify-api.vercel.app';
