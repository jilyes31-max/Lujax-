import { SupabaseUser } from '../lib/supabase-auth.js';

declare global {
  namespace Express {
    interface Request {
      supabaseUser?: SupabaseUser;
    }
  }
}
