import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export const isConfigured = !!(env.supabaseUrl && env.supabaseAnonKey);
export const supabase = createClient(env.supabaseUrl || "https://demo.supabase.co", env.supabaseAnonKey || "demo-anon-key", {
  auth: { persistSession: true, detectSessionInUrl: true },
});
