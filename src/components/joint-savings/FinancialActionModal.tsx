import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Coins, Loader2 } from "lucide-react";

interface FinancialActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
  title: string;
  description: string;
  actionLabel: string;
}

export function FinancialActionModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  actionLabel,
}: FinancialActionModalProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(parseFloat(amount));
      setAmount("");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] border-white/20 bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl shadow-2xl">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-4">
            <Coins className="w-8 h-8" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">
              Amount (KES)
            </label>
            <Input
              type="number"
              placeholder="0.00"
              className="h-14 rounded-2xl border-2 border-emerald-500/10 focus:border-emerald-500/40 bg-white/50 text-xl font-bold"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </div>
          <DialogFooter className="sm:justify-start gap-3">
            <Button
              type="submit"
              disabled={loading || !amount}
              className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-xl shadow-emerald-500/20"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : actionLabel}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-14 px-6 rounded-2xl font-bold text-muted-foreground"
              onClick={onClose}
            >
              Cancel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
