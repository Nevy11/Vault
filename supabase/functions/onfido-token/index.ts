import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const onfidoToken = Deno.env.get("ONFIDO_API_TOKEN");
  if (!onfidoToken) {
    return new Response(
      JSON.stringify({ error: "ONFIDO_API_TOKEN is not set" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { user_id, applicant_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let currentApplicantId = applicant_id;

    // 1. If we don't have an applicant_id, create one
    if (!currentApplicantId) {
      // Fetch user profile to get email/name if available
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user_id)
        .single();

      const nameParts = (profile?.full_name || "Vault User").split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "User";

      const applicantRes = await fetch("https://api.eu.onfido.com/v3.4/applicants", {
        method: "POST",
        headers: {
          Authorization: `Token token=${onfidoToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
        }),
      });

      const applicantData = await applicantRes.json();
      if (!applicantRes.ok) throw new Error(applicantData.error?.message || "Failed to create applicant");
      
      currentApplicantId = applicantData.id;

      // Store applicant_id in metadata or a dedicated column if you have one
      // For now we'll just return it to the frontend
    }

    // 2. Generate SDK Token
    // Note: referrer should match your site's origin
    const origin = req.headers.get("origin") || "*";
    const tokenRes = await fetch("https://api.eu.onfido.com/v3.4/sdk_token", {
      method: "POST",
      headers: {
        Authorization: `Token token=${onfidoToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        applicant_id: currentApplicantId,
        referrer: origin,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData.error?.message || "Failed to generate SDK token");

    return new Response(
      JSON.stringify({
        sdk_token: tokenData.token,
        applicant_id: currentApplicantId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Onfido Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
