import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PotHeaderProps {
  pots: any[];
  selectedPotId: string | null;
  onSelectPot: (id: string | null) => void;
  onNewPot: () => void;
}

export function PotHeader({ pots, selectedPotId, onSelectPot, onNewPot }: PotHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="space-y-1">
        <h1 className="text-4xl font-medium tracking-tighter text-slate-950 dark:text-white uppercase">
          Cooperative Treasury
        </h1>
        <span className="text-sm font-medium text-emerald-600 uppercase tracking-[0.3em] opacity-80">
          Synergized Wealth & Unified Goals
        </span>
      </div>
      <div className="flex gap-3">
        {pots.map((p) => (
          <Button
            key={p.id}
            variant={selectedPotId === p.id ? "default" : "outline"}
            className={cn(
              "h-11 rounded-2xl font-medium transition-all duration-500",
              selectedPotId === p.id
                ? "px-6 bg-primary text-primary-foreground shadow-2xl scale-105"
                : "bg-white/50 dark:bg-slate-800/50",
            )}
            onClick={() => onSelectPot(p.id)}
          >
            {p.title}
          </Button>
        ))}
        <Button
          variant="outline"
          className="h-11 px-4 rounded-2xl border-dashed border-primary/40 text-primary hover:bg-primary/10 hover:border-primary font-medium transition-all duration-300"
          onClick={onNewPot}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Pot
        </Button>
      </div>
    </div>
  );
}
