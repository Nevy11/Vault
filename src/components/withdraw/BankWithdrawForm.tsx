import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check } from "lucide-react";

interface BankWithdrawFormProps {
  banks: string[];
  selectedBank: string | null;
  onBankChange: (bank: string) => void;
  accountNumber: string;
  onAccountNumberChange: (val: string) => void;
  accountHolder: string;
  onAccountHolderChange: (val: string) => void;
}

export function BankWithdrawForm({
  banks,
  selectedBank,
  onBankChange,
  accountNumber,
  onAccountNumberChange,
  accountHolder,
  onAccountHolderChange,
}: BankWithdrawFormProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">
          {t("transactions.withdraw.choose_bank")}
        </Label>
        <Select value={selectedBank || ""} onValueChange={onBankChange}>
          <SelectTrigger className="h-14 bg-white dark:bg-slate-900 border-2 border-border/40 rounded-2xl text-base shadow-sm focus:border-primary/40 transition-all">
            <SelectValue placeholder={t("transactions.withdraw.search_select_bank")} />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-border/50 shadow-xl max-h-[300px]">
            {banks.map((b) => (
              <SelectItem key={b} value={b} className="rounded-xl py-3 px-4 focus:bg-primary/10">
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedBank && (
        <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4 p-5 rounded-2xl border-2 border-primary/20 bg-primary/5 shadow-lg shadow-primary/5">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shadow-inner">
              {selectedBank.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-base font-bold text-foreground">{selectedBank}</div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                {t("transactions.withdraw.external_bank_rail")}
              </div>
            </div>
            <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
              <Check className="w-4 h-4" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">
                {t("transactions.form.account_number")}
              </Label>
              <Input
                placeholder="0000000000"
                className="h-14 bg-white dark:bg-slate-900 border-2 border-border/40 rounded-2xl text-lg font-mono focus:border-primary/40"
                value={accountNumber}
                onChange={(e) => onAccountNumberChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">
                {t("transactions.withdraw.account_holder_name")}
              </Label>
              <Input
                placeholder={t("transactions.withdraw.full_name_records")}
                className="h-14 bg-white dark:bg-slate-900 border-2 border-border/40 rounded-2xl text-base focus:border-primary/40"
                value={accountHolder}
                onChange={(e) => onAccountHolderChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
