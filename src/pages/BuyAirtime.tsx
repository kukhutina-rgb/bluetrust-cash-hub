import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Phone, Loader2, CheckCircle } from "lucide-react";
import PinDialog from "@/components/PinDialog";
import BottomNav from "@/components/BottomNav";

const networks = [
  { id: "safaricom", name: "Safaricom", color: "bg-success" },
  { id: "airtel", name: "Airtel", color: "bg-destructive" },
  { id: "telkom", name: "Telkom", color: "bg-primary" },
];

const quickAmounts = [50, 100, 200, 500, 1000];

const BuyAirtime = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [network, setNetwork] = useState("safaricom");
  const [phone, setPhone] = useState(profile?.phone_number ?? "");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"input" | "confirm" | "success">("input");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [txResult, setTxResult] = useState<any>(null);

  const currency = profile?.currency ?? "KES";
  const amt = parseFloat(amount) || 0;
  // Airtime fee is typically a small amount
  const fee = Math.max(1, Math.round(amt * 0.01 * 100) / 100);

  const handleContinue = () => {
    if (amt < 5) {
      toast.error("Minimum airtime is 5 " + currency);
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

    const { data, error } = await supabase.functions.invoke("buy-airtime", {
      body: { phone_number: phone, amount: amt, network },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Airtime purchase failed");
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

        <h1 className="text-xl font-bold font-display mb-6">Buy Airtime</h1>

        {step === "input" && (
          <div className="space-y-4">
            {/* Network Selection */}
            <div className="space-y-1.5">
              <Label>Network</Label>
              <div className="grid grid-cols-3 gap-2">
                {networks.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setNetwork(n.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all ${
                      network === n.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className={`h-3 w-3 rounded-full ${n.color}`} />
                    <span className="text-xs font-medium">{n.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254712345678" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Amount ({currency})</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" min="5" />
              <div className="flex flex-wrap gap-2 mt-2">
                {quickAmounts.map((qa) => (
                  <button
                    key={qa}
                    onClick={() => setAmount(String(qa))}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      amount === String(qa) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"
                    }`}
                  >
                    {qa}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleContinue} className="w-full" size="lg" disabled={!amt || !phone}>
              Continue
            </Button>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold font-display text-center mb-4">Confirm Airtime</h3>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Network</span><span className="capitalize">{network}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Phone</span><span>{phone}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Airtime</span><span>{currency} {amt.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Fee</span><span>{currency} {fee.toFixed(2)}</span></div>
                <div className="border-t pt-2 flex justify-between text-sm font-bold"><span>Total</span><span className="text-primary">{currency} {(amt + fee).toFixed(2)}</span></div>
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
            <h2 className="text-lg font-bold font-display">Airtime Sent!</h2>
            <p className="text-sm text-muted-foreground">{currency} {amt.toFixed(2)} airtime sent to {phone}</p>
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
        title="Authorize Airtime"
        description={`Enter PIN to buy ${currency} ${amt.toFixed(2)} airtime`}
      />
      <BottomNav />
    </div>
  );
};

export default BuyAirtime;
