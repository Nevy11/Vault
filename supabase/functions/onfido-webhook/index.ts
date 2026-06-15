import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    const signature = req.headers.get("x-sha2-signature");
    const body = await req.json();

    console.log("Onfido Webhook Received:", JSON.stringify(body));

    const { action, object } = body.payload;

    if (action === "workflow_run.completed") {
      const applicantId = object.applicant_id;
      const status = object.status; // 'approved', 'declined', etc.

      console.log(`Workflow completed for applicant ${applicantId} with status ${status}`);

      if (status === "approved") {
        // Find user by applicant_id (you might need to store this mapping in a table)
        // For now, this is a placeholder for your logic
        /*
        await supabase
          .from("profiles")
          .update({ kyc_status: "verified" })
          .eq("onfido_applicant_id", applicantId);
        */
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Webhook Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
