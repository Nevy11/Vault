import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DepositAmountInputProps {
  amount: string;
  onAmountChange: (value: string) => void;
  currency: string;
  inputCurrency: "USD" | "KES";
  onCurrencyToggle: () => void;
  kesEquivalent: number;
}

export function DepositAmountInput({
  amount,
  onAmountChange,
  currency,
  inputCurrency,
  onCurrencyToggle,
  kesEquivalent,
}: DepositAmountInputProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">
          {t("transactions.deposit.amount_to_fund")}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCurrencyToggle}
          className="h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10"
        >
          {inputCurrency} <span className="mx-1">⇄</span> {inputCurrency === "USD" ? "KES" : "USD"}
        </Button>
      </div>

      <div className="relative group">
        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-light text-slate-400">
          {inputCurrency === "USD" ? "$" : "KES"}
        </div>
        <Input
          type="number"
          placeholder="0.00"
          className="h-20 pl-16 pr-6 rounded-3xl border-2 border-border/40 bg-white dark:bg-slate-900 text-4xl font-light focus:border-emerald-500/40 transition-all"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
        />
      </div>

      {inputCurrency === "USD" && (
        <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-border/40 animate-in fade-in slide-in-from-top-2">
          <span className="text-xs font-medium text-muted-foreground">
            {t("transactions.deposit.kes_equivalent")}:
          </span>
          <span className="text-xs font-bold text-emerald-600">
            KES {kesEquivalent.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
