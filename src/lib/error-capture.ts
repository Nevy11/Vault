import { supabase } from "@/api/supabase";

// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

export async function logErrorToSupabase(error: any, context?: any) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error("Vault Error:", message, context);

  // In a real production app, we would send this to Sentry or a custom table
  // For now, we'll log it to the browser console and could potentially 
  // call a 'log_error' RPC if one existed.
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.rpc('log_security_event', {
        p_user_id: user.id,
        p_action: 'SYSTEM_ERROR',
        p_status: 'error',
        p_metadata: { message, stack, ...context }
      });
    }
  } catch (e) {
    // Fail silently to avoid infinite error loops
  }
}

function record(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
  logErrorToSupabase(error);
}

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
