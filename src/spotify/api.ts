import { fetchWithTimeout } from '../net';
import { getAccessToken } from './auth';

const API = 'https://api.spotify.com/v1';

export class SpotifyError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call(path: string, init: RequestInit = {}): Promise<any> {
  const token = await getAccessToken();
  if (!token) throw new SpotifyError(401, 'Not logged in to Spotify');
  const res = await fetchWithTimeout(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (res.status === 204) return null;
  const text = await res.text();
  if (!res.ok) {
    let reason = text;
    try {
      reason = JSON.parse(text).error?.reason ?? JSON.parse(text).error?.message ?? text;
    } catch {}
    throw new SpotifyError(res.status, `${res.status} ${reason}`);
  }
  return text ? JSON.parse(text) : null;
}

type Device = { id: string; name: string; type: string; is_active: boolean };

// Prefer whatever is playing now, then this phone. Null means Spotify needs to be opened.
export async function pickDevice(): Promise<Device | null> {
  const { devices } = (await call('/me/player/devices')) as { devices: Device[] };
  return (
    devices.find((d) => d.is_active) ??
    devices.find((d) => d.type.toLowerCase() === 'smartphone') ??
    null
  );
}

export async function playlistLength(playlistId: string): Promise<number | null> {
  try {
    const body = await call(`/playlists/${playlistId}?fields=tracks.total`);
    return body?.tracks?.total ?? null;
  } catch {
    return null; // starting at track 0 is fine if this isn't allowed
  }
}

export async function playPlaylist(playlistId: string, deviceId: string, startIndex: number) {
  await call(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'PUT',
    body: JSON.stringify({
      context_uri: `spotify:playlist:${playlistId}`,
      offset: { position: startIndex },
    }),
  });
}

// Accepts a share link, a spotify:playlist: URI, or a bare id.
export function parsePlaylistId(input: string): string | null {
  const s = input.trim();
  const m = s.match(/playlist[/:]([A-Za-z0-9]{22})/) ?? s.match(/^([A-Za-z0-9]{22})$/);
  return m ? m[1] : null;
}
