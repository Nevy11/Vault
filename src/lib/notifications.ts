import { supabase } from "../api/supabase";

// Lightweight notifications helper: email, push, SMS.
// Uses environment variables when available; otherwise logs actions.

type EmailOpts = { to: string; subject: string; text?: string; html?: string };

export async function sendEmail(opts: EmailOpts) {
  const host = import.meta.env.VITE_SMTP_HOST || (process.env.SMTP_HOST as string);
  if (!host) {
    console.log("sendEmail (stub):", opts);
    return { ok: true, stub: true };
  }

  // Lazy import to avoid heavy dependency on client builds
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host,
    port: Number(import.meta.env.VITE_SMTP_PORT || process.env.SMTP_PORT || 587),
    secure: !!import.meta.env.VITE_SMTP_SECURE || false,
    auth: {
      user: import.meta.env.VITE_SMTP_USER || (process.env.SMTP_USER as string),
      pass: import.meta.env.VITE_SMTP_PASS || (process.env.SMTP_PASS as string),
    },
  });

  const res = await transporter.sendMail({
    from: import.meta.env.VITE_SMTP_FROM || process.env.SMTP_FROM || "no-reply@vault.local",
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
  return res;
}

export async function sendPush(subscription: any, payload: any) {
  // Server-side only: requires `web-push` and VAPID keys in env
  const vapidPublic = import.meta.env.VITE_VAPID_PUBLIC || (process.env.VAPID_PUBLIC as string);
  if (!vapidPublic) {
    console.log("sendPush (stub):", subscription, payload);
    return { ok: true, stub: true };
  }
  const webpush = await import("web-push");
  webpush.setVapidDetails(
    import.meta.env.VITE_APP_URL || (process.env.APP_URL as string) || "http://localhost",
    vapidPublic,
    import.meta.env.VITE_VAPID_PRIVATE || (process.env.VAPID_PRIVATE as string),
  );
  try {
    const result = await webpush.sendNotification(subscription, JSON.stringify(payload));
    return result;
  } catch (err) {
    console.warn("sendPush error", err);
    return { ok: false, error: err };
  }
}

export async function sendSMS(phone: string, message: string) {
  // Prefer configured SMS provider (Daraja/Twilio). If not configured, log.
  const provider = import.meta.env.VITE_SMS_PROVIDER || (process.env.SMS_PROVIDER as string) || "log";
  if (provider === "log") {
    console.log(`sendSMS stub -> ${phone}: ${message}`);
    return { ok: true, stub: true };
  }

  // Example: Daraja (M-Pesa) or Twilio integration could go here.
  // For now, attempt a generic HTTP POST to configured endpoint.
  const endpoint = import.meta.env.VITE_SMS_ENDPOINT || (process.env.SMS_ENDPOINT as string);
  const apiKey = import.meta.env.VITE_SMS_API_KEY || (process.env.SMS_API_KEY as string);
  if (!endpoint) return { ok: false, error: "no-sms-endpoint" };
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: apiKey ? `Bearer ${apiKey}` : "" },
    body: JSON.stringify({ to: phone, message }),
  });
  return res.ok ? { ok: true } : { ok: false, status: res.status };
}

export async function notifyFriendsOfSplit(billId: string) {
  // Fetch participants from DB and notify them via SMS/push
  const { data: participants } = await supabase.from("bill_participants").select("user_id,phone,push_subscription").eq("bill_id", billId);
  if (!participants) return { ok: false, error: "no-participants" };
  const promises = participants.map(async (p: any) => {
    const msg = `You were added to bill #${billId}. Please settle your share.`;
    if (p.push_subscription) await sendPush(p.push_subscription, { title: "Bill split", body: msg, billId });
    if (p.phone) await sendSMS(p.phone, msg);
  });
  await Promise.all(promises);
  return { ok: true };
}

export default { sendEmail, sendPush, sendSMS, notifyFriendsOfSplit };
