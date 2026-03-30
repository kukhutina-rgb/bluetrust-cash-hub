import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";

const SetPin = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [loading, setLoading] = useState(false);

  const hasRepeatingDigits = (p: string) => /^(\d)\1{3}$/.test(p);

  const handleDigit = (digit: string) => {
    if (step === "create") {
      if (pin.length < 4) {
        const newPin = pin + digit;
        setPin(newPin);
        if (newPin.length === 4) {
          if (hasRepeatingDigits(newPin)) {
            toast.error("PIN cannot be all the same digit");
            setPin("");
            return;
          }
          setTimeout(() => setStep("confirm"), 300);
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const newConfirm = confirmPin + digit;
        setConfirmPin(newConfirm);
        if (newConfirm.length === 4) {
          if (newConfirm !== pin) {
            toast.error("PINs don't match. Try again.");
            setConfirmPin("");
            setStep("create");
            setPin("");
          } else {
            submitPin(newConfirm);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    if (step === "create") {
      setPin(pin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const submitPin = async (finalPin: string) => {
    if (!user) return;
    setLoading(true);
    // In production, hash on server. For now, simple hash via edge function would be ideal.
    // Storing as base64 encoded for demo — in production, use bcrypt in edge function.
    const encoded = btoa(finalPin);
    const { error } = await supabase
      .from("profiles")
      .update({ pin_hash: encoded, pin_set: true })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to set PIN");
    } else {
      toast.success("PIN set successfully!");
      await refreshProfile();
      navigate("/");
    }
    setLoading(false);
  };

  const currentPin = step === "create" ? pin : confirmPin;

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-6">
      <div className="mx-auto w-full max-w-sm">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold font-display">
            {step === "create" ? "Create PIN" : "Confirm PIN"}
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            {step === "create"
              ? "Enter a 4-digit PIN to secure your transactions"
              : "Re-enter your PIN to confirm"}
          </p>
        </div>

        {/* PIN Dots */}
        <div className="mb-10 flex justify-center gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-4 w-4 rounded-full transition-all ${
                i < currentPin.length ? "bg-primary scale-110" : "border-2 border-border"
              }`}
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="mx-auto grid max-w-[260px] grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onClick={() => handleDigit(String(n))}
              disabled={loading}
              className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold text-foreground transition-colors hover:bg-muted active:bg-primary active:text-primary-foreground mx-auto"
            >
              {n}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleDigit("0")}
            disabled={loading}
            className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold text-foreground transition-colors hover:bg-muted active:bg-primary active:text-primary-foreground mx-auto"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex h-16 w-16 items-center justify-center rounded-full text-sm font-medium text-muted-foreground hover:bg-muted mx-auto"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetPin;
