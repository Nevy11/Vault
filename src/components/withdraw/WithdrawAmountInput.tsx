import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LockIcon } from "lucide-react";

interface WithdrawAmountInputProps {
  amount: string;
  onAmountChange: (value: string) => void;
  currency: string;
  balance: number | null;
  loading: boolean;
}

export function WithdrawAmountInput({
  amount,
  onAmountChange,
  currency,
  balance,
  loading,
}: WithdrawAmountInputProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">
            {t("transactions.withdraw.vault_balance_label", {
              currency: currency || "USD",
            })}
          </Label>
          <LockIcon className="w-3.5 h-3.5 text-muted-foreground/60" />
        </div>
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              {t("transactions.withdraw.loading_balance")}
            </span>
          </div>
        ) : (
          <div className="text-4xl font-light text-primary tracking-tight">
            {currency === "KES" ? "KSH " : "$"}
            {balance?.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) || "0.00"}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Label
          htmlFor="amount"
          className="text-xs uppercase tracking-wider text-muted-foreground ml-1"
        >
          {t("transactions.withdraw.withdrawal_amount", { currency: currency || "USD" })}
        </Label>
        <div className="relative group">
          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground text-2xl font-light">
            {currency === "KES" ? "KSH" : "$"}
          </span>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            className="h-20 pl-20 pr-6 rounded-3xl border-2 border-border/40 bg-white dark:bg-slate-900 text-4xl font-light focus:border-primary/40 transition-all"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
