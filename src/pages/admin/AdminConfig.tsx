import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import { Save } from "lucide-react";

const AdminConfig = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: configs } = useQuery({
    queryKey: ["admin-config"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_config").select("*").order("key");
      return data ?? [];
    },
  });

  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const updateConfig = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      let jsonValue: any;
      try {
        jsonValue = JSON.parse(value);
      } catch {
        jsonValue = value;
      }
      const { error } = await supabase
        .from("admin_config")
        .update({ value: jsonValue, updated_by: user!.id })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-config"] });
      toast.success(`${key} updated`);
      setEditValues((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const getDisplayValue = (value: any) => {
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold font-display">Configuration</h1>
      <p className="text-sm text-muted-foreground">Manage fees, exchange rates, and system settings.</p>

      <div className="space-y-3">
        {configs?.map((config) => {
          const isEditing = config.key in editValues;
          const displayValue = getDisplayValue(config.value);

          return (
            <div key={config.id} className="rounded-xl bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-semibold font-mono">{config.key}</p>
                  {config.description && (
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  value={isEditing ? editValues[config.key] : displayValue}
                  onChange={(e) => setEditValues({ ...editValues, [config.key]: e.target.value })}
                  onFocus={() => {
                    if (!isEditing) {
                      setEditValues({ ...editValues, [config.key]: displayValue });
                    }
                  }}
                  className="font-mono text-sm"
                />
                {isEditing && (
                  <Button
                    size="sm"
                    onClick={() => updateConfig.mutate({ key: config.key, value: editValues[config.key] })}
                  >
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminConfig;
