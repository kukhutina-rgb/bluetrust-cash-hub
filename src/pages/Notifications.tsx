import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-4 py-4">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold font-display">Notifications</h1>
        </div>
      </div>
      <div className="mx-auto max-w-md px-4 py-4 space-y-2">
        {notifications?.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">No notifications yet</p>
        )}
        {notifications?.map((n) => (
          <div
            key={n.id}
            className={`rounded-xl p-3 transition-colors ${n.read ? "bg-card" : "bg-primary/5 border border-primary/10"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.read && (
                <button
                  onClick={() => markRead.mutate(n.id)}
                  className="shrink-0 rounded-full bg-primary/10 p-1 text-primary hover:bg-primary/20"
                >
                  <Check className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;
