import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Receipt as ReceiptIcon, FileText, ChevronRight } from "lucide-react";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProfile } from "@/hooks/use-profile";
import { getReceipts, type Receipt } from "@/api/receipts";
import { useReceiptRealtime } from "@/hooks/use-receipt-realtime";
import { ReceiptDetailView } from "./ReceiptDetailView";

export function ReceiptHistoryContent() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  // Realtime updates
  const { latestReceipt } = useReceiptRealtime();

  useEffect(() => {
    if (latestReceipt) {
      setReceipts((prev) => {
        if (prev.find((r) => r.id === latestReceipt.id)) return prev;
        return [latestReceipt, ...prev];
      });
    }
  }, [latestReceipt]);

  useEffect(() => {
    async function fetch() {
      if (!profile?.id) return;

      try {
        const data = await getReceipts({ data: { userId: profile.id, page: 0, pageSize: 20 } });
        setReceipts(data.receipts);
      } catch (err) {
        console.error("Failed to fetch receipts:", err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [profile?.id]);

  if (selectedReceipt) {
    return <ReceiptDetailView receipt={selectedReceipt} onBack={() => setSelectedReceipt(null)} />;
  }

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="p-6 pb-2">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <ReceiptIcon size={22} />
          </div>
          <div>
            <SheetTitle className="text-xl font-bold tracking-tight">
              {t("receipts.title")}
            </SheetTitle>
            <SheetDescription className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
              {t("receipts.secure_logs")}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <ScrollArea className="flex-1 px-4 py-4">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 w-full rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : receipts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
            <FileText size={48} className="mb-4" />
            <p className="text-sm font-medium">{t("receipts.no_receipts")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {receipts.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedReceipt(r)}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-card/40 hover:bg-accent/40 hover:border-border transition-all group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-background border border-border/40 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                    <FileText size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold truncate max-w-[180px] dark:text-white">
                      {r.transaction_details.description || t("receipts.vault_transaction")}
                    </div>
                    <div className="text-[10px] dark:text-white font-mono">{r.receipt_number}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-bold text-primary">
                      {r.currency} {r.amount.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {format(new Date(r.created_at), "MMM d")}
                    </div>
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-muted-foreground/40 group-hover:text-primary transition-colors"
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
