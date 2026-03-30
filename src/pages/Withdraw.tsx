import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Smartphone, Loader2, CheckCircle } from "lucide-react";
import PinDialog from "@/components/PinDialog";
import BottomNav from "@/components/BottomNav";

const Withdraw = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [phone, setPhone] = useState(profile?.phone_number ?? "");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"input" | "confirm" | "success">("input");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [txResult, setTxResult] = useState<any>(null);

  const currency = profile?.currency ?? "KES";

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const { data } = await supabase.from("wallets").select("*").single();
      return data;
    },
  });

  const { data: feeConfig } = useQuery({
    queryKey: ["withdraw_fee"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_config")
        .select("value")
        .eq("key", "withdrawal_fee_percent")
        .single();
      return data ? Number(data.value) : 1;
    },
  });

  const feePercent = feeConfig ?? 1;
  const amt = parseFloat(amount) || 0;
  const fee = Math.round(amt * (feePercent / 100) * 100) / 100;
  const total = amt + fee;

  const handleContinue = () => {
    if (amt < 10) {
      toast.error("Minimum withdrawal is 10 " + currency);
      return;
    }
    if (wallet && total > wallet.balance) {
      toast.error("Insufficient balance");
      return;
    }
    if (!phone.trim()) {
      toast.error("Enter a phone number");
      return;
    }
    setStep("confirm");
  };

  const handlePinConfirm = async (pin: string) => {
    setShowPin(false);
    setLoading(true);

    const pinEncoded = btoa(pin);
    if (pinEncoded !== profile?.pin_hash) {
      toast.error("Incorrect PIN");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.functions.invoke("withdraw", {
      body: { phone_number: phone, amount: amt },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Withdrawal failed");
      setLoading(false);
      return;
    }

    setTxResult(data);
    setStep("success");
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-6 pb-24">
      <div className="mx-auto w-full max-w-md">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="text-xl font-bold font-display mb-6">Withdraw</h1>

        {step === "input" && (
          <div className="space-y-4">
            {wallet && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
                  <p className="text-xl font-bold font-display text-primary">
                    {currency} {wallet.balance.toLocaleString("en", { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-1.5">
              <Label>Withdraw to (M-Pesa Phone)</Label>
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254712345678" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Amount ({currency})</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" min="10" />
            </div>

            {amt > 0 && (
              <div className="text-xs text-muted-foreground space-y-1 bg-muted rounded-xl p-3">
                <div className="flex justify-between"><span>Fee ({feePercent}%)</span><span>{currency} {fee.toFixed(2)}</span></div>
                <div className="flex justify-between font-semibold text-foreground"><span>Total debit</span><span>{currency} {total.toFixed(2)}</span></div>
              </div>
            )}

            <Button onClick={handleContinue} className="w-full" size="lg" disabled={!amt}>
              Continue
            </Button>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold font-display text-center mb-4">Confirm Withdrawal</h3>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">To</span><span>{phone}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Amount</span><span>{currency} {amt.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Fee</span><span>{currency} {fee.toFixed(2)}</span></div>
                <div className="border-t pt-2 flex justify-between text-sm font-bold"><span>Total</span><span className="text-primary">{currency} {total.toFixed(2)}</span></div>
              </CardContent>
            </Card>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("input")} className="flex-1">Back</Button>
              <Button onClick={() => setShowPin(true)} className="flex-1" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
              </Button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center text-center space-y-4 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-lg font-bold font-display">Withdrawal Sent!</h2>
            <p className="text-sm text-muted-foreground">{currency} {amt.toFixed(2)} sent to {phone}</p>
            {txResult?.reference && <p className="text-xs font-mono text-muted-foreground">Ref: {txResult.reference}</p>}
            <Button onClick={() => navigate("/")} className="w-full mt-4">Back to Home</Button>
          </div>
        )}
      </div>

      <PinDialog
        open={showPin}
        onClose={() => setShowPin(false)}
        onConfirm={handlePinConfirm}
        loading={loading}
        title="Authorize Withdrawal"
        description={`Enter PIN to withdraw ${currency} ${amt.toFixed(2)}`}
      />
      <BottomNav />
    </div>
  );
};

export default Withdraw;
