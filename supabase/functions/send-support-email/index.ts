import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import nodemailer from "npm:nodemailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASS = Deno.env.get("SMTP_PASS");
    const SMTP_HOST = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
    const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || 465);
    const SUPPORT_EMAIL = Deno.env.get("SUPPORT_EMAIL") || "alphine886@gmail.com";
    const RECIPIENT_EMAIL = "alphine886@gmail.com";

    console.log(`Email request received for: ${RECIPIENT_EMAIL}`);

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const { firstName, lastName, email, message } = payload;

    if (!firstName || !lastName || !email || !message) {
      return new Response(JSON.stringify({ error: "All fields are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!SMTP_USER || !SMTP_PASS) {
      throw new Error("SMTP credentials (SMTP_USER/SMTP_PASS) are missing from Supabase secrets.");
    }

    console.log(`Creating transport for ${SMTP_HOST}:${SMTP_PORT}...`);

    // Using nodemailer for better stability in Deno/Edge environment
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    console.log("Sending mail...");

    const info = await transporter.sendMail({
      from: `"${firstName} ${lastName}" <${SUPPORT_EMAIL}>`,
      to: RECIPIENT_EMAIL,
      replyTo: email,
      subject: `Vault Support: New message from ${firstName} ${lastName}`,
      text: `New contact form message from Vault OS\n\nFirst name: ${firstName}\nLast name: ${lastName}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1a202c;">
          <h2 style="color: #2d3748; margin-top: 0;">New Support Inquiry</h2>
          <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 5px 0;"><strong>From:</strong> ${firstName} ${lastName}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #3182ce;">${email}</a></p>
          </div>
          <div style="white-space: pre-wrap; line-height: 1.6; color: #4a5568;">
            ${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
          </div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
          <p style="font-size: 12px; color: #a0aec0; text-align: center;">This message was sent via the Vault OS Contact Form.</p>
        </div>
      `,
    });

    console.log("Message sent: %s", info.messageId);

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-support-email error:", error.message);

    // Return a structured error that doesn't trigger CORS issues
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An unexpected error occurred",
      }),
      {
        status: 200, // Still 200 so the client can read the JSON error
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
