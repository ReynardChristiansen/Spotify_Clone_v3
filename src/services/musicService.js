import { MUSIC_API_URL } from '../config/env';
import { request } from './httpClient';

/**
 * Client for the Proxy_Server_Song backend (JioSaavn proxy).
 * Every response is `{ success, data }`; we unwrap and return `data`.
 */
export const musicService = {
  getTopEnglish: async () =>
    (await request(MUSIC_API_URL, '/api/getTopEnglish')).data,

  getTopHindi: async () =>
    (await request(MUSIC_API_URL, '/api/getTopHindi')).data,

  searchSongs: async (query, { page = 1, limit = 20, lang = 'all' } = {}) =>
    (
      await request(
        MUSIC_API_URL,
        `/api/getSongByParam/${encodeURIComponent(query)}?page=${page}&limit=${limit}&lang=${encodeURIComponent(lang)}`
      )
    ).data,

  /** Returns an array of songs (the API supports multiple ids). */
  getSongById: async (id) =>
    (await request(MUSIC_API_URL, `/api/getSongById/${encodeURIComponent(id)}`)).data,

  searchArtists: async (query, { page = 1, limit = 20 } = {}) =>
    (
      await request(
        MUSIC_API_URL,
        `/api/getArtistByParam/${encodeURIComponent(query)}?page=${page}&limit=${limit}`
      )
    ).data,

  getArtistById: async (id, { songs = 20 } = {}) =>
    (
      await request(
        MUSIC_API_URL,
        `/api/getArtistById/${encodeURIComponent(id)}?songs=${songs}`
      )
    ).data,

  getLyrics: async (songId) =>
    (await request(MUSIC_API_URL, `/api/lyrics/${encodeURIComponent(songId)}`)).data,
};
