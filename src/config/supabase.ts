import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

export const supabase =
  env.SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY)
    ? createClient(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      )
    : null;
