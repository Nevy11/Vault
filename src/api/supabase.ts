import { createClient } from "@supabase/supabase-js";

// Provide a WebSocket implementation on the server (Node <22) so
// @supabase/realtime-js can initialize correctly during SSR/dev.
if (typeof window === "undefined") {
  try {
    // @ts-expect-error -- ws is an optional peer dependency for SSR/Realtime support
    const wsPkg = await import("ws");
    const wsImpl =
      (wsPkg as { WebSocket?: unknown; default?: { WebSocket?: unknown } }).WebSocket ||
      (wsPkg as { default?: { WebSocket?: unknown } }).default?.WebSocket ||
      wsPkg;
    (globalThis as unknown as { WebSocket: unknown }).WebSocket = wsImpl;
  } catch (e) {
    // If `ws` isn't installed, we intentionally let createClient fail later
    // with the existing suggestion to install `ws`.
    // Keep silent here to avoid noisy logs.
  }
}

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
  },
);
