import type { VercelRequest, VercelResponse } from "@vercel/node";
import fetch from "node-fetch";
import { logAudit } from "../src/lib/audit";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId required" });

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    await logAudit({ user_id: userId, action: "revoke_sessions_attempt", details: { by: "api" } });
    if (!SUPABASE_URL || !SERVICE_KEY) {
      await logAudit({ user_id: userId, action: "revoke_sessions_skipped", details: { reason: "no_service_key" } });
      return res.status(200).json({ ok: true, note: "service role key not configured; recorded revocation intent" });
    }

    // Supabase admin endpoint may vary; attempt common revoke path. If this fails,
    // the function still records the audit entry and returns a helpful message.
    const adminEndpoint = `${SUPABASE_URL.replace(/\/$/, "")}/admin/v1/users/${userId}/revoke`;
    const r = await fetch(adminEndpoint, { method: "POST", headers: { Authorization: `Bearer ${SERVICE_KEY}` } });
    if (!r.ok) {
      const text = await r.text();
      await logAudit({ user_id: userId, action: "revoke_sessions_failed", details: { status: r.status, body: text } });
      return res.status(502).json({ ok: false, status: r.status, body: text });
    }
    await logAudit({ user_id: userId, action: "revoke_sessions_success", details: {} });
    return res.status(200).json({ ok: true });
  } catch (err) {
    await logAudit({ user_id: userId, action: "revoke_sessions_error", details: { error: String(err) } });
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
