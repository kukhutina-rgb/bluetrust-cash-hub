import BottomNav from "@/components/BottomNav";
import TransactionList from "@/components/TransactionList";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Transactions = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="border-b bg-card px-4 py-4">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold font-display">Transactions</h1>
        </div>
      </div>
      <div className="mx-auto max-w-md px-4 py-4">
        <div className="rounded-xl bg-card p-3 shadow-card">
          <TransactionList limit={50} />
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Transactions;
