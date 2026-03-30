import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import { Save, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const AdminRates = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newBase, setNewBase] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newRate, setNewRate] = useState("");

  const { data: rates } = useQuery({
    queryKey: ["admin-exchange-rates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exchange_rates")
        .select("*")
        .order("base_currency")
        .order("target_currency");
      return data ?? [];
    },
  });

  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const updateRate = useMutation({
    mutationFn: async ({ id, rate }: { id: string; rate: number }) => {
      const { error } = await supabase
        .from("exchange_rates")
        .update({ rate, updated_by: user!.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-exchange-rates"] });
      toast.success("Rate updated");
      setEditValues((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addRate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("exchange_rates").insert({
        base_currency: newBase.toUpperCase(),
        target_currency: newTarget.toUpperCase(),
        rate: parseFloat(newRate),
        updated_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exchange-rates"] });
      toast.success("Rate added");
      setShowAdd(false);
      setNewBase("");
      setNewTarget("");
      setNewRate("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Exchange Rates</h1>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Rate
        </Button>
      </div>

      <div className="rounded-xl bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">From</th>
                <th className="px-4 py-2 text-left font-medium">To</th>
                <th className="px-4 py-2 text-left font-medium">Rate</th>
                <th className="px-4 py-2 text-left font-medium">Updated</th>
                <th className="px-4 py-2 text-left font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rates?.map((r) => {
                const isEditing = r.id in editValues;
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-mono font-medium">{r.base_currency}</td>
                    <td className="px-4 py-2.5 font-mono font-medium">{r.target_currency}</td>
                    <td className="px-4 py-2.5">
                      <Input
                        value={isEditing ? editValues[r.id] : String(r.rate)}
                        onChange={(e) => setEditValues({ ...editValues, [r.id]: e.target.value })}
                        onFocus={() => {
                          if (!isEditing) setEditValues({ ...editValues, [r.id]: String(r.rate) });
                        }}
                        className="h-8 w-32 font-mono text-sm"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {new Date(r.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5">
                      {isEditing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateRate.mutate({ id: r.id, rate: parseFloat(editValues[r.id]) })}
                        >
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Exchange Rate</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Base Currency</Label>
                <Input value={newBase} onChange={(e) => setNewBase(e.target.value)} placeholder="USD" className="font-mono" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Target Currency</Label>
                <Input value={newTarget} onChange={(e) => setNewTarget(e.target.value)} placeholder="KES" className="font-mono" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Rate</Label>
              <Input value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="153.50" type="number" step="any" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => addRate.mutate()} disabled={!newBase || !newTarget || !newRate}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <label className={`text-sm font-medium ${className}`}>{children}</label>
);

export default AdminRates;
