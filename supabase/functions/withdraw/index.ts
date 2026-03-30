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

    if (!phone_number || !amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400, headers: corsHeaders });
    }

    // Get wallet
    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!wallet) {
      return new Response(JSON.stringify({ error: "Wallet not found" }), { status: 400, headers: corsHeaders });
    }

    // Get fee
    const { data: feeConfig } = await supabaseAdmin
      .from("admin_config")
      .select("value")
      .eq("key", "withdrawal_fee_percent")
      .single();

    const feePercent = feeConfig ? Number(feeConfig.value) : 1;
    const fee = Math.round(amount * (feePercent / 100) * 100) / 100;
    const totalDebit = amount + fee;

    if (wallet.balance < totalDebit) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), { status: 400, headers: corsHeaders });
    }

    const { data: reference } = await supabaseAdmin.rpc("generate_transaction_reference", { prefix: "WDR" });

    // Create transaction
    const { data: tx } = await supabaseAdmin.from("transactions").insert({
      reference,
      type: "withdrawal",
      amount,
      fee,
      currency: wallet.currency,
      sender_wallet_id: wallet.id,
      phone_number,
      description: `Withdrawal to ${phone_number}`,
      status: "pending",
    }).select().single();

    // Debit wallet
    const newBalance = wallet.balance - totalDebit;
    await supabaseAdmin.from("wallets").update({ balance: newBalance }).eq("id", wallet.id);

    await supabaseAdmin.from("ledger").insert({
      user_id: user.id,
      wallet_id: wallet.id,
      entry_type: "debit",
      amount: totalDebit,
      balance_before: wallet.balance,
      balance_after: newBalance,
      currency: wallet.currency,
      reference,
      transaction_id: tx?.id,
      description: `Withdrawal to ${phone_number}`,
    });

    // TODO: Call IntaSend B2C API here to send money to phone
    // For now, mark as success
    await supabaseAdmin.from("transactions").update({ status: "success" }).eq("id", tx?.id);

    // Fee record
    if (fee > 0) {
      await supabaseAdmin.from("transactions").insert({
        reference: reference + "-FEE",
        type: "fee",
        amount: fee,
        fee: 0,
        currency: wallet.currency,
        sender_wallet_id: wallet.id,
        description: "Withdrawal fee",
        status: "success",
      });
    }

    return new Response(JSON.stringify({ success: true, reference, amount, fee }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
  }
});
