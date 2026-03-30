import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, ArrowLeftRight, Wallet, ShieldCheck } from "lucide-react";

const AdminOverview = () => {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, transactions, wallets, pendingKyc] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("transactions").select("*", { count: "exact", head: true }),
        supabase.from("wallets").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("kyc_status", "pending"),
      ]);
      return {
        totalUsers: users.count ?? 0,
        totalTransactions: transactions.count ?? 0,
        totalWallets: wallets.count ?? 0,
        pendingKyc: pendingKyc.count ?? 0,
      };
    },
  });

  const { data: recentTx } = useQuery({
    queryKey: ["admin-recent-tx"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const cards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-primary bg-primary/10" },
    { label: "Pending KYC", value: stats?.pendingKyc ?? 0, icon: ShieldCheck, color: "text-warning bg-warning/10" },
    { label: "Active Wallets", value: stats?.totalWallets ?? 0, icon: Wallet, color: "text-success bg-success/10" },
    { label: "Transactions", value: stats?.totalTransactions ?? 0, icon: ArrowLeftRight, color: "text-secondary-foreground bg-secondary" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold font-display">Dashboard Overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl bg-card p-4 shadow-card">
            <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg ${card.color}`}>
              <card.icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold font-display">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-card shadow-card overflow-hidden">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Reference</th>
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-left font-medium">Amount</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentTx?.map((tx) => (
                <tr key={tx.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{tx.reference}</td>
                  <td className="px-4 py-2.5 capitalize">{tx.type}</td>
                  <td className="px-4 py-2.5 font-medium">{tx.currency} {tx.amount.toLocaleString()}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      tx.status === "success" ? "bg-success/10 text-success" :
                      tx.status === "failed" ? "bg-destructive/10 text-destructive" :
                      tx.status === "reversed" ? "bg-muted text-muted-foreground" :
                      "bg-warning/10 text-warning"
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {!recentTx?.length && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No transactions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
