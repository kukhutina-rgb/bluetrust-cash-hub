import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const BalanceCard = () => {
  const { profile } = useAuth();
  const [showBalance, setShowBalance] = useState(true);

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .single();
      if (error) return null;
      return data;
    },
    enabled: profile?.kyc_status === "approved",
  });

  const kycApproved = profile?.kyc_status === "approved";
  const balance = wallet?.balance ?? 0;
  const currency = wallet?.currency ?? profile?.currency ?? "KES";
  const walletNumber = wallet?.wallet_number ?? "---";

  const copyWalletNumber = () => {
    if (wallet?.wallet_number) {
      navigator.clipboard.writeText(wallet.wallet_number);
      toast.success("Wallet number copied");
    }
  };

  return (
    <div className="gradient-card rounded-2xl p-5 text-primary-foreground shadow-elevated animate-fade-in">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium opacity-80">
          {kycApproved ? "Available Balance" : "KYC " + (profile?.kyc_status ?? "Pending")}
        </span>
        <button onClick={() => setShowBalance(!showBalance)} className="opacity-80 hover:opacity-100 transition-opacity">
          {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>

      <p className="text-3xl font-bold font-display mb-4">
        {showBalance
          ? `${currency} ${balance.toLocaleString("en", { minimumFractionDigits: 2 })}`
          : "••••••"}
      </p>

      {kycApproved && (
        <div className="flex items-center justify-between border-t border-primary-foreground/20 pt-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider opacity-60">Wallet Number</p>
            <p className="text-sm font-mono font-medium">{walletNumber}</p>
          </div>
          <button onClick={copyWalletNumber} className="opacity-60 hover:opacity-100 transition-opacity">
            <Copy className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default BalanceCard;
