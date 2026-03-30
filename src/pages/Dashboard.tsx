import { useAuth } from "@/contexts/AuthContext";
import BalanceCard from "@/components/BalanceCard";
import QuickActions from "@/components/QuickActions";
import TransactionList from "@/components/TransactionList";
import BottomNav from "@/components/BottomNav";
import { Bell, Shield, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  const { data: unreadCount } = useQuery({
    queryKey: ["unread-notifications"],
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("read", false);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const firstName = profile?.full_name?.split(" ")[0] ?? "User";
  const kycPending = profile?.kyc_status === "pending";
  const kycRejected = profile?.kyc_status === "rejected";
  const needsPin = profile?.kyc_status === "approved" && !profile?.pin_set;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-primary px-4 pb-16 pt-6">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div>
            <p className="text-sm text-primary-foreground/70">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},</p>
            <h1 className="text-lg font-bold font-display text-primary-foreground">{firstName}</h1>
          </div>
          <button
            onClick={() => navigate("/notifications")}
            className="relative rounded-full bg-primary-foreground/10 p-2 text-primary-foreground"
          >
            <Bell className="h-5 w-5" />
            {!!unreadCount && unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-md px-4 -mt-12 space-y-6">
        <BalanceCard />

        {/* KYC Alerts */}
        {kycPending && (
          <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/5 p-3 animate-slide-up">
            <Shield className="h-5 w-5 text-warning shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Complete KYC Verification</p>
              <p className="text-xs text-muted-foreground">Verify your identity to unlock your wallet</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/kyc")}>
              Start
            </Button>
          </div>
        )}

        {kycRejected && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 animate-slide-up">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">KYC Rejected</p>
              <p className="text-xs text-muted-foreground">{profile?.kyc_rejection_reason ?? "Please re-submit"}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/kyc")}>
              Retry
            </Button>
          </div>
        )}

        {needsPin && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 animate-slide-up">
            <Shield className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Set Your PIN</p>
              <p className="text-xs text-muted-foreground">Create a 4-digit PIN to start transacting</p>
            </div>
            <Button size="sm" onClick={() => navigate("/set-pin")}>
              Set PIN
            </Button>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Quick Actions</h2>
          <QuickActions />
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">Recent Transactions</h2>
            <button onClick={() => navigate("/transactions")} className="text-xs font-medium text-primary">
              See All
            </button>
          </div>
          <div className="rounded-xl bg-card p-3 shadow-card">
            <TransactionList limit={5} />
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
