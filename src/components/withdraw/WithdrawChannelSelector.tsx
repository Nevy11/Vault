import { useTranslation } from "react-i18next";
import { Building2, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

type Channel = "bank" | "mobile";

interface WithdrawChannelSelectorProps {
  selected: Channel;
  onSelect: (channel: Channel) => void;
}

export function WithdrawChannelSelector({ selected, onSelect }: WithdrawChannelSelectorProps) {
  const { t } = useTranslation();

  const channels: { id: Channel; icon: any; label: string; description: string }[] = [
    {
      id: "bank",
      icon: Building2,
      label: t("transactions.withdraw.bank_accounts"),
      description: t("transactions.withdraw.bank_rail_desc"),
    },
    {
      id: "mobile",
      icon: Smartphone,
      label: t("transactions.withdraw.mobile_money"),
      description: t("transactions.withdraw.mpesa_airtel_desc"),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      {channels.map((item) => {
        const Icon = item.icon;
        const isActive = selected === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={cn(
              "flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all duration-300",
              isActive
                ? "bg-primary border-primary text-primary-foreground shadow-xl shadow-primary/20 scale-105"
                : "bg-white dark:bg-slate-900 border-border/40 hover:border-primary/30 text-slate-600 dark:text-slate-400",
            )}
          >
            <div
              className={cn(
                "p-3 rounded-2xl mb-3",
                isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary",
              )}
            >
              <Icon className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest">{item.label}</span>
            <span
              className={cn(
                "text-[10px] mt-1 font-medium",
                isActive ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            >
              {item.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
