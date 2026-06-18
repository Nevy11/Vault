import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import nodemailer from "npm:nodemailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const { record, table, type } = payload;
    
    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASS = Deno.env.get("SMTP_PASS");
    const RECIPIENT_EMAIL = "alphine886@gmail.com";

    if (!SMTP_USER || !SMTP_PASS) {
      throw new Error("SMTP credentials missing.");
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    let subject = "";
    let html = "";

    if (table === "transactions" || (record && record.amount !== undefined)) {
      subject = `🚨 VERIFICATION REQUIRED: Transaction Flagged (${record.id})`;
      html = `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 2px solid #ef4444; border-radius: 12px;">
          <h2 style="color: #ef4444; margin-top: 0;">Suspicious Transaction Detected</h2>
          <p>A transaction has been automatically flagged for manual review.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f8fafc;">
              <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Transaction ID</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">${record.id}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Sender ID</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">${record.sender_id || record.user_id}</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Amount</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 18px; color: #ef4444;">$${record.amount}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Description</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">${record.description || 'N/A'}</td>
            </tr>
          </table>
          
          <p style="font-size: 12px; color: #64748b;">The transaction has been allowed but marked as 'pending_verification'. Please review the user's account.</p>
        </div>
      `;
    } else if (table === "profiles" || (record && record.kyc_status !== undefined)) {
      subject = `🆔 KYC VERIFICATION PENDING: ${record.first_name} ${record.last_name}`;
      html = `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 2px solid #3b82f6; border-radius: 12px;">
          <h2 style="color: #3b82f6; margin-top: 0;">KYC Verification Request</h2>
          <p>A user has submitted documents for KYC verification.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f8fafc;">
              <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">User ID</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">${record.id}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Name</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">${record.first_name} ${record.last_name}</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Email</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">${record.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">KYC Tag</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">${record.kyc_tag}</td>
            </tr>
          </table>
          
          <p style="font-size: 12px; color: #64748b;">Please log in to the admin panel to review the submitted documents.</p>
        </div>
      `;
    } else {
      subject = `🔔 Verification Alert: ${type || 'Action Required'}`;
      html = `<pre>${JSON.stringify(record, null, 2)}</pre>`;
    }

    await transporter.sendMail({
      from: `"Vault OS Verification" <${SMTP_USER}>`,
      to: RECIPIENT_EMAIL,
      subject,
      html,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Notification Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
