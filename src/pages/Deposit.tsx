import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Smartphone, CreditCard, Loader2, CheckCircle } from "lucide-react";
import BottomNav from "@/components/BottomNav";

type Method = "mpesa" | "card";

const Deposit = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [method, setMethod] = useState<Method>("mpesa");
  const [phone, setPhone] = useState(profile?.phone_number ?? "");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"input" | "processing" | "success">("input");

  const currency = profile?.currency ?? "KES";

  const handleDeposit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 10) {
      toast.error("Minimum deposit is 10 " + currency);
      return;
    }

    setLoading(true);

    if (method === "mpesa") {
      // Trigger STK Push
      const { data, error } = await supabase.functions.invoke("intasend-stk-push", {
        body: { phone_number: phone, amount: amt },
      });

      if (error || data?.error) {
        toast.error(data?.error || error?.message || "STK Push failed");
        setLoading(false);
        return;
      }

      setStep("processing");
      toast.success("STK Push sent! Check your phone.");
      // Poll or wait for webhook
      setTimeout(() => {
        setStep("success");
        setLoading(false);
      }, 10000);
    } else {
      // Card payment via IntaSend
      const { data, error } = await supabase.functions.invoke("intasend-card-payment", {
        body: { amount: amt, currency },
      });

      if (error || data?.error) {
        toast.error(data?.error || "Card payment initiation failed");
        setLoading(false);
        return;
      }

      // Redirect to IntaSend checkout
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-6 pb-24">
      <div className="mx-auto w-full max-w-md">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="text-xl font-bold font-display mb-6">Load Wallet</h1>

        {step === "input" && (
          <div className="space-y-4">
            {/* Method Selection */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMethod("mpesa")}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                  method === "mpesa" ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <Smartphone className={`h-6 w-6 ${method === "mpesa" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium">M-Pesa</span>
              </button>
              <button
                onClick={() => setMethod("card")}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                  method === "card" ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <CreditCard className={`h-6 w-6 ${method === "card" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium">Card</span>
              </button>
            </div>

            {method === "mpesa" && (
              <div className="space-y-1.5">
                <Label>M-Pesa Phone Number</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254712345678" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Amount ({currency})</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" min="10" />
            </div>

            <Button onClick={handleDeposit} className="w-full" size="lg" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {method === "mpesa" ? "Send STK Push" : "Pay with Card"}
            </Button>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center text-center space-y-4 py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h2 className="text-lg font-bold font-display">Processing Payment</h2>
            <p className="text-sm text-muted-foreground">Check your phone for the M-Pesa prompt and enter your PIN.</p>
            <p className="text-xs text-muted-foreground">This page will update automatically.</p>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center text-center space-y-4 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-lg font-bold font-display">Deposit Successful!</h2>
            <p className="text-sm text-muted-foreground">
              {currency} {parseFloat(amount).toLocaleString("en", { minimumFractionDigits: 2 })} has been added to your wallet.
            </p>
            <Button onClick={() => navigate("/")} className="w-full mt-4">Back to Home</Button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Deposit;
