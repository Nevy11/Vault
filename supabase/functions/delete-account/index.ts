import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization")!;

    // Check if it's a service role call
    const isServiceRole = authHeader === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;

    let targetUserId: string;

    if (isServiceRole) {
      const { userId } = await req.json();
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId is required for service role calls" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      targetUserId = userId;
    } else {
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: userError,
      } = await supabaseClient.auth.getUser(token);

      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetUserId = user.id;
    }

    // Log Audit Event BEFORE deletion so it is attributed to the user
    await supabaseClient.rpc("log_audit_event", {
      p_action: "account_deleted",
      p_status: "success",
      p_user_id: targetUserId
    });

    // Delete the user from auth.users (cascades to other tables)
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(targetUserId);

    if (deleteError) {
      throw deleteError;
    }

    // If there was a deletion request, mark it as completed
    await supabaseClient
      .from("account_deletion_requests")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("user_id", targetUserId)
      .eq("status", "scheduled");

    return new Response(JSON.stringify({ message: "Account deleted successfully" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
