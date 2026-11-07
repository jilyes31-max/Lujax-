import { createHash } from 'crypto';

export interface SupabaseUser {
  id: string;
  email?: string;
}

export type VerifyResult =
  | { ok: true; user: SupabaseUser }
  | { ok: false; reason: 'not_configured' | 'invalid' | 'upstream_error' };

export interface SupabaseVerifierOptions {
  supabaseUrl?: string;
  anonKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  cacheTtlMs?: number;
  maxCacheEntries?: number;
}

interface CacheEntry {
  result: VerifyResult;
  expiresAt: number;
}

export function createSupabaseVerifier(opts?: SupabaseVerifierOptions) {
  const supabaseUrl = opts?.supabaseUrl ?? process.env.SUPABASE_URL;
  const anonKey = opts?.anonKey ?? process.env.SUPABASE_ANON_KEY;
  const fetchFn = opts?.fetchImpl ?? fetch;
  const timeoutMs = opts?.timeoutMs ?? 5_000;
  const cacheTtlMs = opts?.cacheTtlMs ?? 60_000;
  const maxCacheEntries = opts?.maxCacheEntries ?? 1_000;

  const cache = new Map<string, CacheEntry>();

  return async (token: string): Promise<VerifyResult> => {
    if (!supabaseUrl || !anonKey) {
      return { ok: false, reason: 'not_configured' };
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const now = Date.now();

    const cached = cache.get(tokenHash);
    if (cached && now < cached.expiresAt) {
      return cached.result;
    }
    cache.delete(tokenHash);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const resp = await fetchFn(`${supabaseUrl}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!resp.ok) {
        return { ok: false, reason: 'invalid' };
      }

      const data = (await resp.json()) as { id?: string; email?: string };
      const user: SupabaseUser = { id: data.id ?? '', email: data.email };

      let expiry = now + cacheTtlMs;
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString()) as { exp?: number };
          if (payload.exp) {
            const tokenExpiry = payload.exp * 1000;
            if (tokenExpiry < expiry) expiry = tokenExpiry;
          }
        }
      } catch {
        // ignore decode errors
      }

      const result: VerifyResult = { ok: true, user };
      cache.set(tokenHash, { result, expiresAt: expiry });

      if (cache.size > maxCacheEntries) {
        const oldest = Array.from(cache.entries()).sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
        if (oldest) cache.delete(oldest[0]);
      }

      return result;
    } catch (err) {
      return { ok: false, reason: 'upstream_error' };
    }
  };
}
