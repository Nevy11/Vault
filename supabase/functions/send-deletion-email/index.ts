import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const recoveryToken = crypto.randomUUID()
    const scheduledAt = new Date()
    const deletionDate = new Date()
    deletionDate.setDate(deletionDate.getDate() + 4) // 4 working days grace period

    // 1. Update request status or create one if it doesn't exist
    // Check if a request already exists for this user
    const { data: existingRequest } = await supabaseClient
      .from('account_deletion_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending_confirmation')
      .maybeSingle()

    if (existingRequest) {
      const { error: updateRequestError } = await supabaseClient
        .from('account_deletion_requests')
        .update({
          status: 'scheduled',
          recovery_token: recoveryToken,
          scheduled_at: scheduledAt.toISOString(),
          deletion_date: deletionDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRequest.id)

      if (updateRequestError) throw updateRequestError
    } else {
      // Create a new one directly (for the auto-confirm flow)
      const { error: insertError } = await supabaseClient
        .from('account_deletion_requests')
        .insert({
          user_id: userId,
          status: 'scheduled',
          recovery_token: recoveryToken,
          scheduled_at: scheduledAt.toISOString(),
          deletion_date: deletionDate.toISOString()
        })

      if (insertError) throw insertError
    }

    // 2. Mark profile as scheduled for deletion
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({ scheduled_deletion_date: deletionDate.toISOString() })
      .eq('id', userId)

    if (profileError) throw profileError

    return new Response(JSON.stringify({ success: true, message: "Account deletion scheduled" }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
