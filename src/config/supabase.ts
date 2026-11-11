import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

const serverAuthOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

export const supabase =
  env.SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY)
    ? createClient(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY!,
        serverAuthOptions
      )
    : null;

/**
 * Creates an isolated public (anon-key) Supabase client for user auth flows
 * (`signUp`, `signInWithPassword`, `resend`, etc.) so user session state never
 * mutates the shared service-role singleton used for DB writes.
 */
export const createAuthClient = () => {
  const key = env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.SUPABASE_URL || !key) return null;
  return createClient(env.SUPABASE_URL, key, serverAuthOptions);
};
