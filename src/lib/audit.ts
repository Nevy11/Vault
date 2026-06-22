import { supabase } from "../api/supabase";

export async function logAudit(entry: { user_id?: string; action: string; details?: any }) {
  try {
    await supabase.from("audit_logs").insert([{ user_id: entry.user_id || null, action: entry.action, details: entry.details || {}, created_at: new Date().toISOString() }]);
    return { ok: true };
  } catch (err) {
    console.warn("logAudit failed", err);
    return { ok: false, error: err };
  }
}

export default { logAudit };
