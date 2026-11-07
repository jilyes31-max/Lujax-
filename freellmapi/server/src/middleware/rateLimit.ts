import type { Request, Response, NextFunction, RequestHandler } from 'express';

const WINDOW_MS = 60_000;
const MAX_TRACKED_IPS = 10_000;

interface WindowState {
  count: number;
  resetAt: number;
}

export interface RateLimiterOptions {
  limit?: number;
  envVar?: string;
  defaultRpm: number;
  windowMs?: number;
  maxTrackedKeys?: number;
  keyGenerator?: (req: Request) => string;
}

export function resolveRpm(envVar: string | undefined, defaultRpm: number, override?: number): number {
  if (override !== undefined) return Math.floor(Math.max(0, override));
  if (!envVar) return defaultRpm;
  const raw = process.env[envVar];
  if (raw === undefined || raw.trim() === '') return defaultRpm;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return defaultRpm;
  return Math.floor(n);
}

export function createRateLimiter(opts: RateLimiterOptions): RequestHandler {
  const limit = resolveRpm(opts.envVar, opts.defaultRpm, opts.limit);
  const windowMs = opts.windowMs ?? WINDOW_MS;
  const maxTrackedKeys = opts.maxTrackedKeys ?? MAX_TRACKED_IPS;
  const keyGen = opts.keyGenerator ?? ((req: Request) => req.ip ?? req.socket.remoteAddress ?? 'unknown');
  const windows = new Map<string, WindowState>();

  return function rateLimitHandler(req: Request, res: Response, next: NextFunction): void {
    if (limit === 0) {
      next();
      return;
    }

    const now = Date.now();
    const key = keyGen(req);

    let state = windows.get(key);
    if (!state || now >= state.resetAt) {
      state = { count: 0, resetAt: now + windowMs };
      windows.set(key, state);
    }
    state.count += 1;

    if (windows.size > maxTrackedKeys) {
      const expired: string[] = [];
      for (const [k, v] of windows) {
        if (now >= v.resetAt) expired.push(k);
      }
      expired.forEach(k => windows.delete(k));
    }

    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - state.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(state.resetAt / 1000)));

    if (state.count > limit) {
      const retryAfter = Math.max(1, Math.ceil((state.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        error: {
          message: `Rate limit exceeded: more than ${limit} requests per minute. Retry in ${retryAfter}s.`,
          type: 'rate_limit_error',
        },
      });
      return;
    }

    next();
  };
}

// Per-IP fixed-window rate limiter for the public /v1 proxy (#35, item #6).
//
// The /v1 surface authenticates with the unified API key but has no password
// login like the dashboard does, so without this an attacker who can reach the
// server could brute-force the key or flood upstream providers. This caps how
// many requests a single client IP can make per minute and returns a standard
// OpenAI-shaped 429 once the cap is exceeded.
//
// FreeLLMAPI is a single-user tool, so the default ceiling is generous. Tune it
// with PROXY_RATE_LIMIT_RPM (requests per minute per IP); set it to 0 to turn
// rate limiting off entirely.
export function createProxyRateLimiter(rpmLimit?: number): RequestHandler {
  return createRateLimiter({ limit: rpmLimit, envVar: 'PROXY_RATE_LIMIT_RPM', defaultRpm: 120 });
}

// Per-IP fixed-window rate limiter for the /api/* admin surface.
//
// This is a flood guard, not the brute-force guard: dashboard login already has
// its own per-email lockout (routes/auth.ts), and the one admin endpoint that
// verifies a password — GET /api/keys/export — gets its own much tighter
// limiter mounted in app.ts. The broad cap therefore has to clear normal
// dashboard traffic with room to spare. Opening the dashboard fans out across
// keys, health, models, analytics, settings and profiles, and several of those
// poll, so a single user legitimately spends dozens of requests a minute.
//
// Tune with ADMIN_RATE_LIMIT_RPM (requests per minute per IP); 0 disables it.
export function createAdminRateLimiter(rpm?: number): RequestHandler {
  return createRateLimiter({ limit: rpm, envVar: 'ADMIN_RATE_LIMIT_RPM', defaultRpm: 600 });
}
