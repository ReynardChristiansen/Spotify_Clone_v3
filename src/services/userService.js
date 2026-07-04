import { USER_API_URL } from '../config/env';
import { request } from './httpClient';

/**
 * Client for the Hirmify user/auth API.
 * Note: this API can report failures inside a 200/201 body as `{ error }`,
 * so each method checks for it explicitly.
 */
export const userService = {
  async login(userName, password) {
    const data = await request(USER_API_URL, '/api/users/login', {
      method: 'POST',
      body: { user_name: userName, user_password: password },
    });
    if (data?.error) throw new Error(data.error);
    if (!data?.token) throw new Error('Login failed');
    return data;
  },

  async register(userName, password) {
    const data = await request(USER_API_URL, '/api/users/register', {
      method: 'POST',
      body: { user_name: userName, user_password: password, user_role: 'User' },
    });
    if (data?.error) throw new Error(data.error);
    return data;
  },

  /** Returns the user document, including the liked `songs` array. */
  async getUser(userId, token) {
    return request(USER_API_URL, `/api/users/${userId}`, { token });
  },

  async likeSong(userId, token, song) {
    return request(USER_API_URL, `/api/users/update/${userId}`, {
      method: 'PATCH',
      token,
      body: song, // { song_id, song_name, song_url, song_image }
    });
  },

  async unlikeSong(userId, token, songId) {
    return request(USER_API_URL, `/api/users/delete/${userId}`, {
      method: 'DELETE',
      token,
      body: { song_id: songId },
    });
  },
};
