import { useTranslation } from "react-i18next";
import { Smartphone, Building2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

type SourceChannel = "bank" | "mobile" | "stripe";

interface PaymentMethodSelectorProps {
  selected: SourceChannel;
  onSelect: (channel: SourceChannel) => void;
}

export function PaymentMethodSelector({ selected, onSelect }: PaymentMethodSelectorProps) {
  const { t } = useTranslation();

  const methods: { id: SourceChannel; icon: any; label: string; description: string }[] = [
    {
      id: "mobile",
      icon: Smartphone,
      label: t("transactions.deposit.mobile_money"),
      description: "M-Pesa, Airtel",
    },
    {
      id: "bank",
      icon: Building2,
      label: t("transactions.deposit.bank_transfer"),
      description: "Direct & ACH",
    },
    {
      id: "stripe",
      icon: CreditCard,
      label: t("transactions.deposit.card_payment"),
      description: "Visa, Mastercard",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      {methods.map((method) => {
        const Icon = method.icon;
        const isActive = selected === method.id;
        return (
          <button
            key={method.id}
            onClick={() => onSelect(method.id)}
            className={cn(
              "flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all duration-300",
              isActive
                ? "bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-500/20 scale-105"
                : "bg-white dark:bg-slate-900 border-border/40 hover:border-emerald-500/30 text-slate-600 dark:text-slate-400",
            )}
          >
            <div
              className={cn(
                "p-3 rounded-2xl mb-3",
                isActive ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-600",
              )}
            >
              <Icon className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest">{method.label}</span>
            <span
              className={cn(
                "text-[10px] mt-1 font-medium",
                isActive ? "text-white/70" : "text-muted-foreground",
              )}
            >
              {method.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
