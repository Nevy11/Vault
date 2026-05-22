import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  (import.meta.env as any).SUPABASE_URL;

// Lovable Cloud injects `VITE_SUPABASE_PUBLISHABLE_KEY`; older setups may use
// `VITE_SUPABASE_ANON_KEY`. Accept either so the deployed build doesn't end up
// with a placeholder client that makes every Supabase call hang forever
// (which presents as an endlessly-loading / unresponsive page in production).
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly instead of silently constructing a client pointed at a
  // placeholder host — that's what causes the "page is unresponsive" symptom
  // after deploy. The root error boundary will render a branded fallback.
  throw new Error(
    "Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) in your deployment environment.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
