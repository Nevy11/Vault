import { useTranslation } from "react-i18next";
import { Zap } from "lucide-react";

export function DepositHeader() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600">
            {t("transactions.deposit.instant_settlement")}
          </span>
        </div>
        <h1 className="text-4xl font-light tracking-tight text-slate-900 dark:text-white">
          {t("transactions.deposit.fund_your_vault")}
        </h1>
      </div>
    </div>
  );
}
