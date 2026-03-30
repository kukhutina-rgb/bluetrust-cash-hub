import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
    }

    const { phone_number, amount } = await req.json();

    if (!phone_number || !amount || amount < 10) {
      return new Response(JSON.stringify({ error: "Invalid input. Minimum amount is 10" }), { status: 400, headers: corsHeaders });
    }

    const INTASEND_API_KEY = Deno.env.get("INTASEND_API_KEY");
    const INTASEND_SECRET = Deno.env.get("INTASEND_SECRET_KEY");

    if (!INTASEND_API_KEY || !INTASEND_SECRET) {
      // Return a helpful message if IntaSend is not configured
      return new Response(JSON.stringify({ 
        error: "Payment gateway not configured. Please add IntaSend API keys." 
      }), { status: 503, headers: corsHeaders });
    }

    // IntaSend STK Push API
    const intasendUrl = "https://payment.intasend.com/api/v1/payment/mpesa-stk-push/";
    
    const stkResponse = await fetch(intasendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${INTASEND_SECRET}`,
        "X-IntaSend-Public-API-Key": INTASEND_API_KEY,
      },
      body: JSON.stringify({
        phone_number,
        amount,
        narrative: "AbanRemit Deposit",
        api_ref: `DEP-${user.id}-${Date.now()}`,
      }),
    });

    const stkData = await stkResponse.json();

    if (!stkResponse.ok) {
      return new Response(JSON.stringify({ error: stkData?.message || "STK Push failed" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Create pending deposit transaction
    const { data: reference } = await supabaseAdmin.rpc("generate_transaction_reference", { prefix: "DEP" });

    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("id, currency")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    await supabaseAdmin.from("transactions").insert({
      reference,
      type: "deposit",
      amount,
      fee: 0,
      currency: wallet?.currency ?? "KES",
      receiver_wallet_id: wallet?.id,
      phone_number,
      description: "M-Pesa Deposit",
      status: "pending",
      metadata: {
        intasend_invoice_id: stkData.invoice?.invoice_id,
        api_ref: stkData.invoice?.api_ref,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      reference,
      invoice_id: stkData.invoice?.invoice_id,
      message: "STK Push sent. Check your phone.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
  }
});
