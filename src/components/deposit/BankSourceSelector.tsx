import { useTranslation } from "react-i18next";
import { Building2, Check, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface BankSourceSelectorProps {
  sources: any[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  isAddingNew: boolean;
  onAddNewToggle: (val: boolean) => void;
}

export function BankSourceSelector({
  sources,
  selectedId,
  onSelect,
  isAddingNew,
  onAddNewToggle,
}: BankSourceSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">
          {t("transactions.deposit.search_banks")}
        </span>
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-emerald-500" />
          <Input
            placeholder={t("transactions.deposit.search_kenyan_banks")}
            className="pl-12 h-14 bg-white dark:bg-slate-900 border-2 border-border/40 rounded-2xl text-base focus:border-emerald-500/40 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sources.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onSelect(item.id);
              onAddNewToggle(false);
            }}
            className={cn(
              "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all group relative overflow-hidden",
              selectedId === item.id && !isAddingNew
                ? "bg-white dark:bg-slate-900 border-emerald-500 shadow-lg"
                : "bg-slate-50 dark:bg-slate-800/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700",
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-white text-xs font-bold",
                item.color || "bg-emerald-600",
              )}
            >
              {item.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-bold truncate">{item.name}</div>
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest truncate">
                {item.accountNumber}
              </div>
            </div>
            {selectedId === item.id && !isAddingNew && (
              <div className="absolute top-2 right-2 h-5 w-5 bg-emerald-500 rounded-full flex items-center justify-center text-white animate-in zoom-in">
                <Check className="w-3 h-3" />
              </div>
            )}
          </button>
        ))}

        <button
          onClick={() => {
            onSelect("stripe-ach");
            onAddNewToggle(false);
          }}
          className={cn(
            "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all group relative overflow-hidden",
            selectedId === "stripe-ach" && !isAddingNew
              ? "bg-white dark:bg-slate-900 border-emerald-500 shadow-lg"
              : "bg-slate-50 dark:bg-slate-800/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700",
          )}
        >
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white text-xs font-bold">
            ACH
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-bold truncate">
              {t("transactions.deposit.stripe_bank_transfer")}
            </div>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest truncate">
              {t("transactions.deposit.us_ach_international")}
            </div>
          </div>
          {selectedId === "stripe-ach" && !isAddingNew && (
            <div className="absolute top-2 right-2 h-5 w-5 bg-emerald-500 rounded-full flex items-center justify-center text-white animate-in zoom-in">
              <Check className="w-3 h-3" />
            </div>
          )}
        </button>

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
            {t("transactions.deposit.link_new_bank")}
          </span>
        </button>
      </div>
    </div>
  );
}
