import React, { useState, useEffect } from "react";
import { Receipt as ReceiptIcon, X, Download, Share2, FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileSignal } from "@/lib/profile-signal";
import { getReceipts, type Receipt } from "@/api/receipts";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

import { useReceiptRealtime } from "@/hooks/use-receipt-realtime";

/**
 * ReceiptActionIcon - The premium entry point for receipt history
 */
export function ReceiptActionIcon() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          className={cn(
            "relative h-10 w-10 rounded-xl bg-card/40 border border-border/40 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 hover:border-primary/20 transition-all active:scale-95 group shadow-sm",
            isOpen && "bg-primary/10 text-primary border-primary/30",
          )}
          aria-label="View receipts"
        >
          <ReceiptIcon
            size={20}
            className="group-hover:scale-110 transition-transform duration-300"
          />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full border border-background shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 bg-background/95 backdrop-blur-2xl border-l border-border/40">
        <ReceiptHistoryContent />
      </SheetContent>
    </Sheet>
  );
}

/**
 * ReceiptHistoryContent - Internal drawer logic for listing and viewing receipts
 */
function ReceiptHistoryContent() {
  const [profile] = useProfileSignal();
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
      if (!profile?.id) {
        console.log("No profile ID found, skipping receipt fetch");
        return;
      }

      try {
        console.log("Fetching receipts for user:", profile.id);
        const data = await getReceipts({ data: { userId: profile.id, page: 0, pageSize: 20 } });
        console.log("Fetched receipts data:", data);
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
            <SheetTitle className="text-xl font-bold tracking-tight">Receipt History</SheetTitle>
            <SheetDescription className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
              Secure Transaction Logs
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
            <p className="text-sm font-medium">No receipts found yet</p>
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
                    <div className="text-sm font-semibold truncate max-w-[180px]">
                      {r.transaction_details.description || "Vault Transaction"}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {r.receipt_number}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-bold text-primary">
                      ${r.amount.toLocaleString()}
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

/**
 * ReceiptDetailView - High-fidelity "Physical" digital receipt rendering
 */
function ReceiptDetailView({ receipt, onBack }: { receipt: Receipt; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="p-4 border-b border-border/40 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-full gap-2">
          <X size={16} /> Back
        </Button>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
            <Download size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
            <Share2 size={16} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="relative bg-white dark:bg-zinc-900 border border-border/60 rounded-3xl p-8 shadow-2xl overflow-hidden">
          {/* Receipt Decorators */}
          <div className="absolute top-0 left-0 w-full h-2 bg-primary/20" />
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <ReceiptIcon size={120} className="rotate-12" />
          </div>

          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-primary mx-auto mb-4 flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <ReceiptIcon size={32} />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Vault OS</h2>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
              Transaction Certified
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-baseline border-b border-dashed border-border/60 pb-4">
              <span className="text-xs text-muted-foreground uppercase font-bold">
                Receipt Number
              </span>
              <span className="text-sm font-mono font-bold tracking-tighter">
                {receipt.receipt_number}
              </span>
            </div>

            <div className="py-4">
              <div className="text-[10px] text-muted-foreground uppercase font-black mb-1">
                Amount Deducted
              </div>
              <div className="text-4xl font-black text-primary tracking-tighter">
                {receipt.currency} {receipt.amount.toLocaleString()}
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10">
                  COMPLETED
                </Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Date</span>
                <span className="font-semibold">
                  {format(new Date(receipt.created_at), "PPP p")}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Method</span>
                <span className="font-semibold uppercase tracking-wider text-xs">
                  {receipt.transaction_details.method}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-border/40 pt-4">
                <span className="text-muted-foreground">Type</span>
                <span className="font-semibold uppercase tracking-wider text-xs">
                  {receipt.transaction_details.type}
                </span>
              </div>
            </div>

            <div className="mt-12 pt-10 border-t border-dashed border-border/60 text-center">
              <div className="mb-6 px-4 py-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold leading-relaxed">
                  Your transfer of {receipt.currency} {receipt.amount.toLocaleString()} has been
                  processed securely.
                </p>
              </div>
              <div className="inline-block p-4 bg-muted/40 rounded-2xl border border-border/40 mb-4 grayscale opacity-50">
                {/* Placeholder for QR Code */}
                <div className="w-24 h-24 bg-foreground/10 rounded-md" />
              </div>
              <p className="text-[9px] text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                This digital receipt is cryptographically signed and serves as official proof of
                transaction for Vault OS services.
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
