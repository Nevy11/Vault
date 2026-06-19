import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action, code, purpose } = body;

    if (action === "send") {
      // 1. Rate Limit Check: Max 3 OTPs per 5 minutes
      const { data: allowed, error: rlError } = await supabaseClient.rpc("check_rate_limit", {
        p_key: `otp_send:${user.id}`,
        p_max_attempts: 3,
        p_window_seconds: 300
      });
      
      if (rlError) throw rlError;
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Too many OTP requests. Please wait 5 minutes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Generate 6-digit code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      // 3. Store in DB (hashed - using simple b64 for this implementation)
      const codeHash = btoa(otpCode); 
      
      const { error: insertError } = await supabaseClient.from("otp_codes").insert({
        user_id: user.id,
        code_hash: codeHash,
        purpose: purpose || "verification",
        expires_at: expiresAt.toISOString()
      });
      if (insertError) throw insertError;

      // 4. Send Email
      const SMTP_USER = Deno.env.get("SMTP_USER");
      const SMTP_PASS = Deno.env.get("SMTP_PASS");
      const SMTP_HOST = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
      const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || 465);
      const SUPPORT_EMAIL = Deno.env.get("SUPPORT_EMAIL") || "support@vault-os.app";

      if (!SMTP_USER || !SMTP_PASS) {
        throw new Error("SMTP credentials are not configured.");
      }

      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });

      await transporter.sendMail({
        from: `"Vault Security" <${SUPPORT_EMAIL}>`,
        to: user.email,
        subject: `Verification Code: ${otpCode}`,
        text: `Your Vault verification code is ${otpCode}. It expires in 10 minutes.`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; color: #1a202c;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #3182ce; margin: 0; font-size: 24px;">Vault Security</h1>
            </div>
            <p style="font-size: 16px; line-height: 1.5;">Hello,</p>
            <p style="font-size: 16px; line-height: 1.5;">A sensitive action was initiated on your account. Please use the following verification code to authorize it:</p>
            <div style="background: #f7fafc; padding: 20px; border-radius: 12px; text-align: center; margin: 30px 0;">
              <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #2d3748;">${otpCode}</div>
            </div>
            <p style="font-size: 14px; color: #718096; line-height: 1.5; text-align: center;">
              This code will expire in <strong>10 minutes</strong>.<br />
              If you did not request this, please ignore this email and consider changing your password.
            </p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
            <p style="font-size: 12px; color: #a0aec0; text-align: center;">&copy; 2026 Vault OS. All rights reserved.</p>
          </div>
        `
      });

      return new Response(JSON.stringify({ success: true, message: "OTP sent" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "verify") {
      if (!code) throw new Error("Verification code is required");

      const codeHash = btoa(code);
      
      const { data: otpEntry, error: otpError } = await supabaseClient
        .from("otp_codes")
        .select("*")
        .eq("user_id", user.id)
        .eq("code_hash", codeHash)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (otpError || !otpEntry) {
        // Rate limit failed attempts: Max 5 attempts per 10 minutes
        await supabaseClient.rpc("check_rate_limit", {
            p_key: `otp_verify:${user.id}`,
            p_max_attempts: 5,
            p_window_seconds: 600
        });
        
        return new Response(JSON.stringify({ error: "Invalid or expired verification code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Success! Delete the used code
      await supabaseClient.from("otp_codes").delete().eq("id", otpEntry.id);

      // Log Audit Event
      await supabaseClient.rpc("log_audit_event", {
          p_action: "step_up_verified",
          p_status: "success",
          p_metadata: { purpose: otpEntry.purpose }
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action provided.");
  } catch (error: any) {
    console.error("Step-up auth error:", error);
    return new Response(JSON.stringify({ error: error.message || "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
