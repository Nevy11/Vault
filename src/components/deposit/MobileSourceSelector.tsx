import { useTranslation } from "react-i18next";
import { Smartphone, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import * as React from "react";

interface MobileSourceSelectorProps {
  sources: any[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  isAddingNew: boolean;
  onAddNewToggle: (val: boolean) => void;
  newPhoneNumber: string;
  onNewPhoneChange: (val: string) => void;
  selectedCarrier: string;
  onCarrierChange: (val: string) => void;
  carriers: string[];
}

export function MobileSourceSelector({
  sources,
  selectedId,
  onSelect,
  isAddingNew,
  onAddNewToggle,
  newPhoneNumber,
  onNewPhoneChange,
  selectedCarrier,
  onCarrierChange,
  carriers,
}: MobileSourceSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">
        {t("transactions.deposit.select_mobile_source")}
      </span>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sources.map((source) => (
          <button
            key={source.id}
            onClick={() => {
              onSelect(source.id);
              onAddNewToggle(false);
            }}
            className={cn(
              "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all group relative overflow-hidden",
              selectedId === source.id && !isAddingNew
                ? "bg-white dark:bg-slate-900 border-emerald-500 shadow-lg"
                : "bg-slate-50 dark:bg-slate-800/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700",
            )}
          >
            <div className={cn("p-3 rounded-xl", source.color || "bg-emerald-600", "text-white")}>
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <p className="text-sm font-bold truncate">{source.name}</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest truncate">
                {source.carrier}
              </p>
            </div>
            {selectedId === source.id && !isAddingNew && (
              <div className="absolute top-2 right-2 h-5 w-5 bg-emerald-500 rounded-full flex items-center justify-center text-white animate-in zoom-in">
                <Check className="w-3 h-3" />
              </div>
            )}
          </button>
        ))}

        <button
          onClick={() => onAddNewToggle(true)}
          className={cn(
            "flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed transition-all",
            isAddingNew
              ? "bg-white dark:bg-slate-900 border-emerald-500 shadow-lg"
              : "border-slate-300 dark:border-slate-700 hover:border-emerald-500/50 text-muted-foreground",
          )}
        >
          <div className="p-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold uppercase tracking-widest">
            {t("transactions.deposit.use_new_number")}
          </span>
        </button>
      </div>

      {isAddingNew && (
        <div className="p-6 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-emerald-500/20 animate-in slide-in-from-top-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {t("transactions.deposit.carrier")}
              </label>
              <div className="flex gap-2">
                {carriers.map((c) => (
                  <button
                    key={c}
                    onClick={() => onCarrierChange(c)}
                    className={cn(
                      "flex-1 h-10 rounded-xl text-xs font-bold transition-all",
                      selectedCarrier === c
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                        : "bg-white dark:bg-slate-800 text-slate-600 border border-border/40",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {t("transactions.deposit.phone_number")}
              </label>
              <Input
                placeholder="0712 345 678"
                className="h-10 rounded-xl bg-white"
                value={newPhoneNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onNewPhoneChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
