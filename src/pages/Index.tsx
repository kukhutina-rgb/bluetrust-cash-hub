import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const Index = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // Dashboard is rendered directly at "/" via App.tsx routes
  return null;
};

export default Index;
