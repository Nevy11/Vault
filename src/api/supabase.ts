import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  (import.meta.env as unknown as { SUPABASE_URL: string }).SUPABASE_URL;

// Lovable Cloud injects `VITE_SUPABASE_PUBLISHABLE_KEY`; older setups may use
// `VITE_SUPABASE_ANON_KEY`. Accept either so the deployed build doesn't end up
// with a placeholder client that makes every Supabase call hang forever
// (which presents as an endlessly-loading / unresponsive page in production).
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const msg =
    "Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY).";
  if (import.meta.env.PROD) {
    // In production, fail loudly so the root error boundary renders a real
    // page instead of hanging on a placeholder client that never responds.
    throw new Error(msg);
  }
  // In dev, warn but keep going so the sandbox preview still boots.
  console.error(msg);
}

const isServer = typeof window === "undefined";
let ws: any = undefined;

if (isServer) {
  try {
    // Use dynamic import for Node.js environments (SSR/Dev)
    const wsPkg = await import("ws");
    ws = wsPkg.default || wsPkg.WebSocket || wsPkg;
  } catch (e) {
    console.warn("WebSocket polyfill (ws) not found, Realtime may not work on server.");
  }
}

console.log("Initializing Supabase client...");
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
  {
    auth: {
      storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: isServer ? { transport: ws } : undefined,
  },
);
