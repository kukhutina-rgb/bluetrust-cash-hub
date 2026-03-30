import BottomNav from "@/components/BottomNav";
import BalanceCard from "@/components/BalanceCard";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const WalletPage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="border-b bg-card px-4 py-4">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold font-display">My Wallet</h1>
        </div>
      </div>
      <div className="mx-auto max-w-md space-y-4 px-4 py-4">
        <BalanceCard />
        <div className="rounded-xl bg-card p-4 shadow-card space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Wallet Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{profile?.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Currency</span>
              <span className="font-medium">{profile?.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Country</span>
              <span className="font-medium">{profile?.country}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">KYC Status</span>
              <span className={`font-medium capitalize ${
                profile?.kyc_status === "approved" ? "text-success" :
                profile?.kyc_status === "rejected" ? "text-destructive" : "text-warning"
              }`}>
                {profile?.kyc_status}
              </span>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default WalletPage;
