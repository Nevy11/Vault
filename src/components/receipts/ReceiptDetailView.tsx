import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import { X, Download, Share2, Receipt as ReceiptIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Receipt } from "@/api/receipts";

interface ReceiptDetailViewProps {
  receipt: Receipt;
  onBack: () => void;
}

export function ReceiptDetailView({ receipt, onBack }: ReceiptDetailViewProps) {
  const { t } = useTranslation();

  const handleDownload = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Set colors
    const primaryColor: [number, number, number] = [5, 150, 105]; // #059669
    const textColor: [number, number, number] = [0, 0, 0];
    const mutedColor: [number, number, number] = [102, 102, 102];

    // Header background
    doc.setFillColor(240, 253, 250); // light green background
    doc.rect(0, 0, pageWidth, 50, "F");

    // Logo box
    doc.setFillColor(...primaryColor);
    doc.rect(pageWidth / 2 - 8, yPosition, 16, 16, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("$", pageWidth / 2, yPosition + 11, { align: "center" });

    // Title and subtitle
    doc.setTextColor(...textColor);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    yPosition += 25;
    doc.text("Vault OS", pageWidth / 2, yPosition, { align: "center" });

    yPosition += 8;
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    doc.setFont("helvetica", "bold");
    doc.text(t("receipts.certified").toUpperCase(), pageWidth / 2, yPosition, { align: "center" });

    yPosition += 15;

    // Receipt details section
    doc.setTextColor(...mutedColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(t("receipts.receipt_number").toUpperCase(), 20, yPosition);

    doc.setTextColor(...textColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(receipt.receipt_number, pageWidth - 20, yPosition, { align: "right" });

    yPosition += 12;

    // Amount section
    doc.setTextColor(...mutedColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(t("receipts.amount_deducted").toUpperCase(), 20, yPosition);

    yPosition += 8;
    doc.setTextColor(...primaryColor);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text(`${receipt.currency} ${receipt.amount.toLocaleString()}`, 20, yPosition);

    yPosition += 18;

    // Details table
    const details = [
      [t("receipts.status"), t("receipts.completed")],
      [t("receipts.date"), format(new Date(receipt.created_at), "PPP p")],
      [t("receipts.method"), receipt.transaction_details.method.toUpperCase()],
      [t("receipts.type"), receipt.transaction_details.type.toUpperCase()],
    ];

    doc.setTextColor(...mutedColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");

    details.forEach((row, idx) => {
      doc.text(row[0], 20, yPosition);
      doc.setTextColor(...textColor);
      doc.text(row[1], pageWidth - 20, yPosition, { align: "right" });
      doc.setTextColor(...mutedColor);
      yPosition += 8;
    });

    yPosition += 8;

    // Footer message
    doc.setFillColor(236, 253, 247);
    doc.setDrawColor(167, 243, 208);
    doc.rect(20, yPosition, pageWidth - 40, 20, "FD");

    doc.setTextColor(...primaryColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const footerText = t("receipts.transfer_secure_msg", {
      currency: receipt.currency,
      amount: receipt.amount.toLocaleString(),
    });
    doc.text(footerText, pageWidth / 2, yPosition + 10, {
      align: "center",
      maxWidth: pageWidth - 50,
    });

    yPosition += 28;

    // Final message
    doc.setTextColor(...mutedColor);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const finalText = t("receipts.legal_note");
    doc.text(finalText, pageWidth / 2, yPosition, { align: "center", maxWidth: pageWidth - 40 });

    // Save the PDF
    doc.save(
      `Receipt_${receipt.receipt_number}_${format(new Date(receipt.created_at), "yyyy-MM-dd")}.pdf`,
    );
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="p-4 border-b border-border/40 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-full gap-2">
          <X size={16} /> {t("receipts.back")}
        </Button>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={handleDownload}
            title={t("receipts.download")}
          >
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
              {t("receipts.certified")}
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-baseline border-b border-dashed border-border/60 pb-4">
              <span className="text-xs text-muted-foreground uppercase font-bold">
                {t("receipts.receipt_number")}
              </span>
              <span className="text-sm font-mono font-bold tracking-tighter">
                {receipt.receipt_number}
              </span>
            </div>

            <div className="py-4">
              <div className="text-[10px] text-muted-foreground uppercase font-black mb-1">
                {t("receipts.amount_deducted")}
              </div>
              <div className="text-4xl font-black text-primary tracking-tighter">
                {receipt.currency} {receipt.amount.toLocaleString()}
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t("receipts.status")}</span>
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10">
                  {t("receipts.completed")}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t("receipts.date")}</span>
                <span className="font-semibold">
                  {format(new Date(receipt.created_at), "PPP p")}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t("receipts.method")}</span>
                <span className="font-semibold uppercase tracking-wider text-xs">
                  {receipt.transaction_details.method}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-border/40 pt-4">
                <span className="text-muted-foreground">{t("receipts.type")}</span>
                <span className="font-semibold uppercase tracking-wider text-xs">
                  {receipt.transaction_details.type}
                </span>
              </div>
            </div>

            <div className="mt-12 pt-10 border-t border-dashed border-border/60 text-center">
              <div className="mb-6 px-4 py-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold leading-relaxed">
                  {t("receipts.transfer_secure_msg", {
                    currency: receipt.currency,
                    amount: receipt.amount.toLocaleString(),
                  })}
                </p>
              </div>
              <div className="inline-block p-4 bg-muted/40 rounded-2xl border border-border/40 mb-4 grayscale opacity-50">
                <div className="w-24 h-24 bg-foreground/10 rounded-md" />
              </div>
              <p className="text-[9px] text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                {t("receipts.legal_note")}
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
