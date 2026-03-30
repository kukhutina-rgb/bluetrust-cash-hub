import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import { CheckCircle, XCircle, Eye, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

const AdminUsers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [rejectUserId, setRejectUserId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewingUser, setViewingUser] = useState<Profile | null>(null);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%`);
      }
      const { data } = await query.limit(100);
      return data ?? [];
    },
  });

  const approveKyc = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("approve_kyc", {
        _user_id: userId,
        _admin_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("KYC approved & wallet created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectKyc = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase.rpc("reject_kyc", {
        _user_id: userId,
        _admin_id: user!.id,
        _reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setRejectUserId(null);
      setRejectReason("");
      toast.success("KYC rejected");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusColor = (s: string) =>
    s === "approved" ? "bg-success/10 text-success" :
    s === "rejected" ? "bg-destructive/10 text-destructive" :
    "bg-warning/10 text-warning";

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Users & KYC</h1>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-xl bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">Phone</th>
                <th className="px-4 py-2 text-left font-medium">Country</th>
                <th className="px-4 py-2 text-left font-medium">KYC</th>
                <th className="px-4 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles?.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-medium">{p.full_name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.email}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.phone_number}</td>
                  <td className="px-4 py-2.5">{p.country}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColor(p.kyc_status)}`}>
                      {p.kyc_status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewingUser(p)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {p.kyc_status === "pending" && (
                        <>
                          <Button size="sm" variant="ghost" className="text-success hover:text-success" onClick={() => approveKyc.mutate(p.user_id)}>
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setRejectUserId(p.user_id)}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
              )}
              {!isLoading && !profiles?.length && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={!!rejectUserId} onOpenChange={() => setRejectUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject KYC</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Please provide a reason for rejection:</p>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. ID photo is blurry"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectUserId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={() => rejectUserId && rejectKyc.mutate({ userId: rejectUserId, reason: rejectReason })}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Dialog */}
      <Dialog open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {viewingUser && (
            <div className="space-y-2 text-sm">
              {[
                ["Name", viewingUser.full_name],
                ["Email", viewingUser.email],
                ["Phone", viewingUser.phone_number],
                ["Country", viewingUser.country],
                ["Currency", viewingUser.currency],
                ["KYC Status", viewingUser.kyc_status],
                ["PIN Set", viewingUser.pin_set ? "Yes" : "No"],
                ["Joined", new Date(viewingUser.created_at).toLocaleDateString()],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium capitalize">{value as string}</span>
                </div>
              ))}
              {viewingUser.kyc_rejection_reason && (
                <div className="mt-2 rounded-lg bg-destructive/5 p-2">
                  <p className="text-xs text-muted-foreground">Rejection Reason:</p>
                  <p className="text-sm">{viewingUser.kyc_rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
