import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Send, User, CheckCircle, Loader2 } from "lucide-react";
import PinDialog from "@/components/PinDialog";
import BottomNav from "@/components/BottomNav";

const SendMoney = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [step, setStep] = useState<"input" | "confirm" | "success">("input");
  const [walletNumber, setWalletNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [recipient, setRecipient] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [txResult, setTxResult] = useState<any>(null);
  const [fee, setFee] = useState(0);

  const lookupRecipient = async () => {
    if (!walletNumber.trim()) {
      toast.error("Enter a wallet number");
      return;
    }
    setLookupLoading(true);
    const { data: wallet, error } = await supabase
      .from("wallets")
      .select("id, wallet_number, currency, user_id")
      .eq("wallet_number", walletNumber.trim())
      .eq("status", "active")
      .single();

    if (error || !wallet) {
      toast.error("Wallet not found");
      setRecipient(null);
      setLookupLoading(false);
      return;
    }

    // Get recipient profile
    const { data: rProfile } = await supabase
      .from("profiles")
      .select("full_name, phone_number, currency")
      .eq("user_id", wallet.user_id)
      .single();

    if (!rProfile) {
      toast.error("Recipient not found");
      setLookupLoading(false);
      return;
    }

    setRecipient({ ...wallet, ...rProfile });

    // Get fee config
    const { data: feeConfig } = await supabase
      .from("admin_config")
      .select("value")
      .eq("key", "transfer_fee_percent")
      .single();

    const feePercent = feeConfig ? Number(feeConfig.value) : 1;
    setFee(feePercent);
    setLookupLoading(false);
  };

  const handleContinue = () => {
    if (!recipient) {
      toast.error("Look up recipient first");
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setStep("confirm");
  };

  const calcFee = () => {
    const amt = parseFloat(amount) || 0;
    return Math.round(amt * (fee / 100) * 100) / 100;
  };

  const handlePinConfirm = async (pin: string) => {
    setShowPin(false);
    setSending(true);

    // Verify PIN
    const pinEncoded = btoa(pin);
    if (pinEncoded !== profile?.pin_hash) {
      toast.error("Incorrect PIN");
      setSending(false);
      return;
    }

    // Call transfer edge function
    const { data, error } = await supabase.functions.invoke("transfer", {
      body: {
        recipient_wallet_number: walletNumber.trim(),
        amount: parseFloat(amount),
        description: description || "Wallet Transfer",
      },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Transfer failed");
      setSending(false);
      return;
    }

    setTxResult(data);
    setStep("success");
    setSending(false);
  };

  const currency = profile?.currency ?? "KES";
  const totalAmount = (parseFloat(amount) || 0) + calcFee();

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-6 pb-24">
      <div className="mx-auto w-full max-w-md">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="text-xl font-bold font-display mb-6">Send Money</h1>

        {step === "input" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Recipient Wallet Number</Label>
              <div className="flex gap-2">
                <Input
                  value={walletNumber}
                  onChange={(e) => setWalletNumber(e.target.value)}
                  placeholder="e.g. BLU0012345678"
                />
                <Button onClick={lookupRecipient} variant="outline" disabled={lookupLoading} className="shrink-0">
                  {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                </Button>
              </div>
            </div>

            {recipient && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{recipient.full_name}</p>
                    <p className="text-xs text-muted-foreground">{recipient.phone_number}</p>
                    <p className="text-xs text-muted-foreground">Currency: {recipient.currency}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-1.5">
              <Label>Amount ({currency})</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="1"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Rent payment"
              />
            </div>

            <Button onClick={handleContinue} className="w-full" size="lg" disabled={!recipient || !amount}>
              <Send className="h-4 w-4 mr-2" /> Continue
            </Button>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold font-display text-center mb-4">Confirm Transfer</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Recipient</span>
                  <span className="font-medium">{recipient?.full_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Wallet</span>
                  <span className="font-mono text-xs">{walletNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{currency} {parseFloat(amount).toLocaleString("en", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fee ({fee}%)</span>
                  <span>{currency} {calcFee().toLocaleString("en", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-sm font-bold">
                  <span>Total</span>
                  <span className="text-primary">{currency} {totalAmount.toLocaleString("en", { minimumFractionDigits: 2 })}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("input")} className="flex-1">Back</Button>
              <Button onClick={() => setShowPin(true)} className="flex-1" disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Pay"}
              </Button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center text-center space-y-4 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-lg font-bold font-display">Transfer Successful!</h2>
            <p className="text-sm text-muted-foreground">
              {currency} {parseFloat(amount).toLocaleString("en", { minimumFractionDigits: 2 })} sent to {recipient?.full_name}
            </p>
            {txResult?.reference && (
              <p className="text-xs text-muted-foreground font-mono">Ref: {txResult.reference}</p>
            )}
            <Button onClick={() => navigate("/")} className="w-full mt-4">Back to Home</Button>
          </div>
        )}
      </div>

      <PinDialog
        open={showPin}
        onClose={() => setShowPin(false)}
        onConfirm={handlePinConfirm}
        loading={sending}
        title="Authorize Transfer"
        description={`Enter PIN to send ${currency} ${parseFloat(amount || "0").toLocaleString("en", { minimumFractionDigits: 2 })}`}
      />
      <BottomNav />
    </div>
  );
};

export default SendMoney;
