import * as SecureStore from 'expo-secure-store';

import { SPOTIFY_CLIENT_ID, SPOTIFY_DISCOVERY } from '../config';

type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
};

const TOKENS_KEY = 'spotify.tokens';
// The background task reads tokens while the phone is locked; the default
// WHEN_UNLOCKED accessibility would make those reads fail on iOS.
const STORE_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

export async function saveTokens(accessToken: string, refreshToken: string, expiresInSec: number) {
  const tokens: StoredTokens = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresInSec * 1000,
  };
  await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens), STORE_OPTS);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(TOKENS_KEY, STORE_OPTS);
}

export async function isLoggedIn(): Promise<boolean> {
  return (await SecureStore.getItemAsync(TOKENS_KEY, STORE_OPTS)) !== null;
}

// Plain fetch instead of expo-auth-session so it also works in the background task.
async function refresh(tokens: StoredTokens): Promise<StoredTokens> {
  const res = await fetch(SPOTIFY_DISCOVERY.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      client_id: SPOTIFY_CLIENT_ID,
    }).toString(),
  });
  if (!res.ok) throw new Error(`Spotify token refresh failed: ${res.status}`);
  const body = await res.json();
  // Spotify may omit a new refresh token; keep the old one then.
  const refreshToken: string = body.refresh_token ?? tokens.refreshToken;
  await saveTokens(body.access_token, refreshToken, body.expires_in);
  return {
    accessToken: body.access_token,
    refreshToken,
    expiresAt: Date.now() + body.expires_in * 1000,
  };
}

export async function getAccessToken(): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(TOKENS_KEY, STORE_OPTS);
  if (!raw) return null;
  let tokens: StoredTokens = JSON.parse(raw);
  if (Date.now() > tokens.expiresAt - 60_000) tokens = await refresh(tokens);
  return tokens.accessToken;
}
