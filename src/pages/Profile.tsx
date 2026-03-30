import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Shield, Lock, LogOut, ChevronRight, Globe } from "lucide-react";

const Profile = () => {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { icon: Shield, label: "KYC Verification", desc: profile?.kyc_status === "approved" ? "Verified" : "Not verified", action: () => navigate("/kyc") },
    { icon: Lock, label: "Change PIN", desc: profile?.pin_set ? "PIN is set" : "No PIN set", action: () => navigate("/set-pin") },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="gradient-primary px-4 pb-12 pt-6">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button onClick={() => navigate("/")} className="text-primary-foreground/70">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold font-display text-primary-foreground">Profile</h1>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 -mt-8 space-y-4">
        {/* Profile Card */}
        <div className="rounded-xl bg-card p-4 shadow-card animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{profile?.full_name}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <p className="text-xs text-muted-foreground">{profile?.phone_number}</p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="rounded-xl bg-card shadow-card overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted ${
                i < menuItems.length - 1 ? "border-b" : ""
              }`}
            >
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {isAdmin && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/admin")}
          >
            <Shield className="mr-2 h-4 w-4" />
            Admin Dashboard
          </Button>
        )}

        <Button
          variant="ghost"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
