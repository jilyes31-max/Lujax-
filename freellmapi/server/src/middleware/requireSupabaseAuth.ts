import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { extractBearerToken } from '../lib/bearer.js';
import { createSupabaseVerifier, type SupabaseVerifierOptions } from '../lib/supabase-auth.js';

let defaultVerifier: ReturnType<typeof createSupabaseVerifier> | undefined;

function getDefaultVerifier() {
  if (!defaultVerifier) {
    defaultVerifier = createSupabaseVerifier();
  }
  return defaultVerifier;
}

export function createRequireSupabaseAuth(verify?: ReturnType<typeof createSupabaseVerifier>): RequestHandler {
  const verifyFn = verify ?? getDefaultVerifier();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      res.status(401).json({ error: { message: 'Supabase authentication required', type: 'unauthorized' } });
      return;
    }

    const result = await verifyFn(token);

    if (!result.ok) {
      if (result.reason === 'not_configured') {
        res.status(500).json({ error: { message: 'Supabase not configured', type: 'server_error' } });
      } else if (result.reason === 'invalid') {
        res.status(401).json({ error: { message: 'Invalid or expired token', type: 'unauthorized' } });
      } else {
        res.status(502).json({ error: { message: 'Could not verify token', type: 'gateway_error' } });
      }
      return;
    }

    (req as any).supabaseUser = result.user;
    next();
  };
}

export const requireSupabaseAuth: RequestHandler = async (req, res, next) => {
  const handler = createRequireSupabaseAuth();
  await handler(req, res, next);
};
