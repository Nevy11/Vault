import { useTranslation } from "react-i18next";
import { Smartphone, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface MobileWithdrawSelectorProps {
  sources: any[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  isAddingNew: boolean;
  onAddNewToggle: (val: boolean) => void;
  newMobile: { provider: string; phone: string };
  onNewMobileChange: (val: any) => void;
  onConfirmNew: () => void;
}

export function MobileWithdrawSelector({
  sources,
  selectedId,
  onSelect,
  isAddingNew,
  onAddNewToggle,
  newMobile,
  onNewMobileChange,
  onConfirmNew,
}: MobileWithdrawSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
      <div className="flex flex-col gap-3">
        {sources.map((wallet) => (
          <button
            key={wallet.id}
            onClick={() => {
              onSelect(wallet.id);
              onAddNewToggle(false);
            }}
            className={cn(
              "flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group",
              selectedId === wallet.id && !isAddingNew
                ? "bg-white dark:bg-slate-900 border-primary shadow-lg"
                : "bg-slate-50 dark:bg-slate-800/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700",
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-inner",
                wallet.color,
              )}
            >
              {wallet.provider === "M-Pesa" ? "MP" : "AM"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-bold truncate">{wallet.name}</div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest truncate">
                {wallet.phone}
              </div>
            </div>
            {selectedId === wallet.id && !isAddingNew && (
              <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground animate-in zoom-in">
                <Check className="w-4 h-4" />
              </div>
            )}
          </button>
        ))}
        <button
          onClick={() => onAddNewToggle(true)}
          className={cn(
            "flex items-center gap-4 p-5 rounded-2xl border-2 border-dashed transition-all",
            isAddingNew
              ? "bg-white dark:bg-slate-900 border-primary shadow-lg"
              : "border-slate-300 dark:border-slate-700 hover:border-primary/50 text-muted-foreground",
          )}
        >
          <div className="p-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold uppercase tracking-widest">
            {t("transactions.withdraw.withdraw_new_number")}
          </span>
        </button>
      </div>

      {isAddingNew && (
        <div className="p-8 rounded-3xl bg-slate-100 dark:bg-slate-900 border-2 border-primary/20 space-y-8 animate-in slide-in-from-top-4 duration-500">
          <div className="space-y-4">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">
              {t("transactions.withdraw.provider_choice")}
            </Label>
            <div className="flex gap-2 p-1.5 bg-white dark:bg-slate-800 rounded-2xl border border-border/40">
              {["M-Pesa", "Airtel Money"].map((p) => (
                <button
                  key={p}
                  onClick={() => onNewMobileChange({ ...newMobile, provider: p })}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                    newMobile.provider === p
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">
                {t("transactions.form.phone_number")}
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                  +254
                </span>
                <Input
                  placeholder="7XX XXX XXX"
                  className="pl-16 h-14 bg-white dark:bg-slate-800 border-2 border-border/40 rounded-2xl text-lg font-mono focus:border-primary/40"
                  value={newMobile.phone}
                  onChange={(e) => onNewMobileChange({ ...newMobile, phone: e.target.value })}
                />
              </div>
            </div>
            <Button
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold shadow-xl shadow-primary/20"
              onClick={onConfirmNew}
            >
              {t("transactions.withdraw.confirm_mobile_btn")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
