import { Send, Download, Phone, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const actions = [
  { icon: Send, label: "Send", path: "/send", color: "bg-primary" },
  { icon: Download, label: "Withdraw", path: "/withdraw", color: "bg-success" },
  { icon: Phone, label: "Airtime", path: "/airtime", color: "bg-warning" },
  { icon: Upload, label: "Deposit", path: "/deposit", color: "bg-secondary text-secondary-foreground" },
];

const QuickActions = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleAction = (path: string) => {
    if (profile?.kyc_status !== "approved") {
      toast.error("Complete KYC verification first");
      return;
    }
    if (!profile?.pin_set) {
      toast.error("Set your PIN first");
      navigate("/set-pin");
      return;
    }
    navigate(path);
  };

  return (
    <div className="grid grid-cols-4 gap-3 animate-slide-up">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => handleAction(action.path)}
          className="flex flex-col items-center gap-2"
        >
          <div className={`${action.color} flex h-12 w-12 items-center justify-center rounded-xl text-primary-foreground shadow-card transition-transform active:scale-95`}>
            <action.icon className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{action.label}</span>
        </button>
      ))}
    </div>
  );
};

export default QuickActions;
