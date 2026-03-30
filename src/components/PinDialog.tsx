import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Lock } from "lucide-react";

interface PinDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => void;
  title?: string;
  description?: string;
  loading?: boolean;
}

const PinDialog = ({
  open,
  onClose,
  onConfirm,
  title = "Enter PIN",
  description = "Enter your 4-digit PIN to confirm",
  loading = false,
}: PinDialogProps) => {
  const [pin, setPin] = useState("");

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        onConfirm(newPin);
        setTimeout(() => setPin(""), 500);
      }
    }
  };

  const handleDelete = () => setPin(pin.slice(0, -1));

  const handleClose = () => {
    setPin("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-xs mx-auto p-6 rounded-2xl">
        <DialogHeader className="items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-2">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="font-display">{title}</DialogTitle>
          <DialogDescription className="text-xs">{description}</DialogDescription>
        </DialogHeader>

        {/* PIN Dots */}
        <div className="flex justify-center gap-4 my-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-3.5 w-3.5 rounded-full transition-all ${
                i < pin.length ? "bg-primary scale-110" : "border-2 border-border"
              }`}
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="mx-auto grid max-w-[220px] grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onClick={() => handleDigit(String(n))}
              disabled={loading}
              className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-foreground transition-colors hover:bg-muted active:bg-primary active:text-primary-foreground mx-auto"
            >
              {n}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleDigit("0")}
            disabled={loading}
            className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-foreground transition-colors hover:bg-muted active:bg-primary active:text-primary-foreground mx-auto"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex h-14 w-14 items-center justify-center rounded-full text-sm font-medium text-muted-foreground hover:bg-muted mx-auto"
          >
            ⌫
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PinDialog;
