import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<"transactions">;

const TransactionItem = ({ tx, walletId }: { tx: Transaction; walletId?: string }) => {
  const isSent = tx.sender_wallet_id === walletId;
  const isDebit = isSent || ["withdrawal", "airtime", "statement", "fee"].includes(tx.type);

  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${isDebit ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
        {isDebit ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium capitalize truncate">{tx.type.replace("_", " ")}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(tx.created_at).toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${isDebit ? "text-destructive" : "text-success"}`}>
          {isDebit ? "-" : "+"}{tx.currency} {tx.amount.toLocaleString("en", { minimumFractionDigits: 2 })}
        </p>
        <p className="text-[10px] text-muted-foreground capitalize">{tx.status}</p>
      </div>
    </div>
  );
};

const TransactionList = ({ limit = 5 }: { limit?: number }) => {
  const { user } = useAuth();

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const { data } = await supabase.from("wallets").select("*").single();
      return data;
    },
    enabled: !!user,
  });

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      return data ?? [];
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
              <div className="h-2.5 w-16 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-3 w-16 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!transactions?.length) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No transactions yet
      </div>
    );
  }

  return (
    <div className="divide-y">
      {transactions.map((tx) => (
        <TransactionItem key={tx.id} tx={tx} walletId={wallet?.id} />
      ))}
    </div>
  );
};

export default TransactionList;
