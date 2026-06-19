import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface CreatePotFormProps {
  onSubmit: (data: { title: string; description: string; target_amount: number }) => Promise<void>;
  onCancel: () => void;
}

export function CreatePotForm({ onSubmit, onCancel }: CreatePotFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        title,
        description,
        target_amount: parseFloat(targetAmount),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700"
    >
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-bold uppercase tracking-widest text-primary">
          Pot Title
        </Label>
        <Input
          id="title"
          placeholder="e.g. Dream Wedding, Business Venture"
          className="h-12 rounded-xl border-2 border-primary/10 focus:border-primary/40 bg-white/50 dark:bg-slate-900/50"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label
          htmlFor="description"
          className="text-sm font-bold uppercase tracking-widest text-primary"
        >
          Strategic Intent
        </Label>
        <Textarea
          id="description"
          placeholder="What are we building together?"
          className="rounded-xl border-2 border-primary/10 focus:border-primary/40 bg-white/50 dark:bg-slate-900/50 min-h-[100px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label
          htmlFor="target"
          className="text-sm font-bold uppercase tracking-widest text-primary"
        >
          Target Reserve (KES)
        </Label>
        <Input
          id="target"
          type="number"
          placeholder="0.00"
          className="h-12 rounded-xl border-2 border-primary/10 focus:border-primary/40 bg-white/50 dark:bg-slate-900/50"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          required
        />
      </div>
      <div className="flex gap-4 pt-4">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 h-14 rounded-2xl bg-primary text-white text-lg font-bold shadow-xl shadow-primary/20"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Initialize Protocol"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-14 px-8 rounded-2xl border-2 border-primary/10 text-primary font-bold"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
