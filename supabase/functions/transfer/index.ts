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

    // Verify JWT
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
    }

    const { recipient_wallet_number, amount, description } = await req.json();

    // Validate input
    if (!recipient_wallet_number || !amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400, headers: corsHeaders });
    }

    // Get sender wallet
    const { data: senderWallet, error: swErr } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (swErr || !senderWallet) {
      return new Response(JSON.stringify({ error: "Sender wallet not found" }), { status: 400, headers: corsHeaders });
    }

    // Get receiver wallet
    const { data: receiverWallet, error: rwErr } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("wallet_number", recipient_wallet_number)
      .eq("status", "active")
      .single();

    if (rwErr || !receiverWallet) {
      return new Response(JSON.stringify({ error: "Recipient wallet not found" }), { status: 400, headers: corsHeaders });
    }

    // Prevent self-transfer
    if (senderWallet.id === receiverWallet.id) {
      return new Response(JSON.stringify({ error: "Cannot transfer to yourself" }), { status: 400, headers: corsHeaders });
    }

    // Get fee config
    const { data: feeConfig } = await supabaseAdmin
      .from("admin_config")
      .select("value")
      .eq("key", "transfer_fee_percent")
      .single();

    const feePercent = feeConfig ? Number(feeConfig.value) : 1;
    const fee = Math.round(amount * (feePercent / 100) * 100) / 100;
    const totalDebit = amount + fee;

    // Check balance
    if (senderWallet.balance < totalDebit) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), { status: 400, headers: corsHeaders });
    }

    // Generate reference
    const { data: reference } = await supabaseAdmin.rpc("generate_transaction_reference", { prefix: "TRF" });

    // === ATOMIC TRANSACTION ===
    // 1. Create transaction record
    const { data: tx, error: txErr } = await supabaseAdmin.from("transactions").insert({
      reference,
      type: "transfer",
      amount,
      fee,
      currency: senderWallet.currency,
      sender_wallet_id: senderWallet.id,
      receiver_wallet_id: receiverWallet.id,
      description: description || "Wallet Transfer",
      status: "success",
    }).select().single();

    if (txErr) {
      return new Response(JSON.stringify({ error: "Transaction creation failed" }), { status: 500, headers: corsHeaders });
    }

    // 2. Debit sender (amount + fee)
    const senderNewBalance = senderWallet.balance - totalDebit;
    await supabaseAdmin.from("wallets").update({ balance: senderNewBalance }).eq("id", senderWallet.id);

    await supabaseAdmin.from("ledger").insert({
      user_id: user.id,
      wallet_id: senderWallet.id,
      entry_type: "debit",
      amount: totalDebit,
      balance_before: senderWallet.balance,
      balance_after: senderNewBalance,
      currency: senderWallet.currency,
      reference,
      transaction_id: tx.id,
      description: `Transfer to ${recipient_wallet_number}`,
    });

    // 3. Credit receiver
    const receiverNewBalance = receiverWallet.balance + amount;
    await supabaseAdmin.from("wallets").update({ balance: receiverNewBalance }).eq("id", receiverWallet.id);

    await supabaseAdmin.from("ledger").insert({
      user_id: receiverWallet.user_id,
      wallet_id: receiverWallet.id,
      entry_type: "credit",
      amount,
      balance_before: receiverWallet.balance,
      balance_after: receiverNewBalance,
      currency: receiverWallet.currency,
      reference,
      transaction_id: tx.id,
      description: `Transfer from wallet`,
    });

    // 4. Record fee as admin revenue (credit to fee ledger)
    if (fee > 0) {
      await supabaseAdmin.from("transactions").insert({
        reference: reference + "-FEE",
        type: "fee",
        amount: fee,
        fee: 0,
        currency: senderWallet.currency,
        sender_wallet_id: senderWallet.id,
        description: "Transfer fee",
        status: "success",
      });
    }

    // 5. Notifications
    // Get sender name
    const { data: senderProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    await supabaseAdmin.from("notifications").insert({
      user_id: receiverWallet.user_id,
      type: "in_app",
      title: "Money Received",
      message: `${senderProfile?.full_name ?? "Someone"} sent you ${senderWallet.currency} ${amount.toLocaleString()}`,
      metadata: { reference, amount, from: senderProfile?.full_name },
    });

    return new Response(JSON.stringify({ success: true, reference, amount, fee, total: totalDebit }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
  }
});
