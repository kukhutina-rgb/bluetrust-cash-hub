import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const payload = await req.json();

    // IntaSend webhook payload contains invoice_id and state
    const invoiceId = payload?.invoice_id;
    const state = payload?.state; // COMPLETE, FAILED, PENDING
    const apiRef = payload?.api_ref;

    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "Missing invoice_id" }), { status: 400, headers: corsHeaders });
    }

    // Find the pending transaction with this invoice ID
    const { data: tx } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("status", "pending")
      .single();

    // More precise: find by metadata
    const { data: transactions } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("status", "pending")
      .eq("type", "deposit");

    const matchedTx = transactions?.find((t: any) => {
      const meta = t.metadata as any;
      return meta?.intasend_invoice_id === invoiceId || meta?.api_ref === apiRef;
    });

    if (!matchedTx) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), { status: 404, headers: corsHeaders });
    }

    if (state === "COMPLETE") {
      // Credit the wallet
      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("*")
        .eq("id", matchedTx.receiver_wallet_id)
        .single();

      if (wallet) {
        const newBalance = wallet.balance + matchedTx.amount;

        await supabaseAdmin.from("wallets")
          .update({ balance: newBalance })
          .eq("id", wallet.id);

        await supabaseAdmin.from("ledger").insert({
          user_id: wallet.user_id,
          wallet_id: wallet.id,
          entry_type: "credit",
          amount: matchedTx.amount,
          balance_before: wallet.balance,
          balance_after: newBalance,
          currency: wallet.currency,
          reference: matchedTx.reference,
          transaction_id: matchedTx.id,
          description: "M-Pesa Deposit",
        });

        // Update transaction status
        await supabaseAdmin.from("transactions")
          .update({ status: "success" })
          .eq("id", matchedTx.id);

        // Notify user
        await supabaseAdmin.from("notifications").insert({
          user_id: wallet.user_id,
          type: "in_app",
          title: "Deposit Received",
          message: `${wallet.currency} ${matchedTx.amount.toLocaleString()} has been credited to your wallet.`,
          metadata: { reference: matchedTx.reference, amount: matchedTx.amount },
        });
      }
    } else if (state === "FAILED") {
      await supabaseAdmin.from("transactions")
        .update({ status: "failed" })
        .eq("id", matchedTx.id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
  }
});
