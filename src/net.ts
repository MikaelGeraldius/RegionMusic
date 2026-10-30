// fetch has no timeout by default; a request that never answers would block
// the location task forever. Abort after `ms` instead.
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  ms = 15_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (controller.signal.aborted) throw new Error(`Timed out after ${ms / 1000} s: ${new URL(url).host}`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
