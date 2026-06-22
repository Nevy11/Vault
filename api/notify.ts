import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendSMS, sendPush } from "../src/lib/notifications";
import { logAudit } from "../src/lib/audit";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { type, payload } = req.body || {};
  try {
    if (type === "nudge") {
      const { phone, message } = payload;
      await logAudit({ action: "nudge_sent", details: { phone, message } });
      const sms = await sendSMS(phone, message);
      return res.status(200).json({ ok: true, sms });
    }
    if (type === "push") {
      const { subscription, message } = payload;
      await logAudit({ action: "push_sent", details: { message } });
      const push = await sendPush(subscription, message);
      return res.status(200).json({ ok: true, push });
    }
    return res.status(400).json({ error: "unknown type" });
  } catch (err) {
    await logAudit({ action: "notify_error", details: { error: String(err) } });
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
