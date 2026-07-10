/**
 * Tiny fetch wrapper: JSON in/out, bearer auth, normalized errors.
 * All API access goes through the service modules, never straight fetch.
 */
export async function request(
  baseUrl,
  path,
  { method = 'GET', token, body, signal, keepalive } = {}
) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
    // keepalive lets a request fired during pagehide/tab-close survive the
    // page being torn down (bodies here are tiny, well under its 64KB cap)
    keepalive,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.error?.message ||
      (typeof data?.error === 'string' ? data.error : null) ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}
