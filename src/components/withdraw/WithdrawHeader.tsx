import { useTranslation } from "react-i18next";
import { Landmark } from "lucide-react";

export function WithdrawHeader() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            {t("transactions.withdraw.secure_disbursement")}
          </span>
        </div>
        <h1 className="text-4xl font-light tracking-tight text-slate-900 dark:text-white">
          {t("transactions.withdraw.withdraw_funds")}
        </h1>
      </div>
    </div>
  );
}
