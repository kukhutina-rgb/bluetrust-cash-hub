import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search } from "lucide-react";

const AdminTransactions = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["admin-transactions", search, statusFilter],
    queryFn: async () => {
      let query = supabase.from("transactions").select("*").order("created_at", { ascending: false });
      if (search) {
        query = query.or(`reference.ilike.%${search}%,phone_number.ilike.%${search}%`);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const { data } = await query.limit(100);
      return data ?? [];
    },
  });

  const statusColor = (s: string) =>
    s === "success" ? "bg-success/10 text-success" :
    s === "failed" ? "bg-destructive/10 text-destructive" :
    s === "reversed" ? "bg-muted text-muted-foreground" :
    "bg-warning/10 text-warning";

  return (
    <div className="space-y-4 max-w-6xl">
      <h1 className="text-2xl font-bold font-display">Transactions</h1>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by reference..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="reversed">Reversed</option>
        </select>
      </div>

      <div className="rounded-xl bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Reference</th>
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-left font-medium">Amount</th>
                <th className="px-4 py-2 text-left font-medium">Fee</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions?.map((tx) => (
                <tr key={tx.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{tx.reference}</td>
                  <td className="px-4 py-2.5 capitalize">{tx.type.replace("_", " ")}</td>
                  <td className="px-4 py-2.5 font-medium">{tx.currency} {tx.amount.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{tx.currency} {tx.fee.toLocaleString()}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColor(tx.status)}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {new Date(tx.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
              )}
              {!isLoading && !transactions?.length && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No transactions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminTransactions;
