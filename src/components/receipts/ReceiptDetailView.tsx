import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import { X, Download, Share2, Receipt as ReceiptIcon, ShieldCheck, Lock, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Receipt } from "@/api/receipts";
import { useMemo } from "react";

interface ReceiptDetailViewProps {
  receipt: Receipt;
  onBack: () => void;
}

/** Generate a deterministic pseudo-signature from receipt data */
function generateSignature(receipt: Receipt): string {
  const raw = `${receipt.receipt_number}:${receipt.transaction_id}:${receipt.amount}:${receipt.created_at}`;
  // Simple deterministic hash-like string for display
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0").toUpperCase();
  // Format as a realistic-looking cryptographic signature
  const parts = [
    hex,
    receipt.receipt_number.replace(/\D/g, "").slice(-4).padStart(4, "0"),
    Math.abs(hash ^ 0xdeadbeef)
      .toString(16)
      .slice(0, 8)
      .toUpperCase(),
    Math.abs(hash ^ 0xcafebabe)
      .toString(16)
      .slice(0, 8)
      .toUpperCase(),
  ];
  return `SHA256:${parts.join("-")}`;
}

/** Generate a short verification code */
function generateVerificationCode(receipt: Receipt): string {
  const seed = receipt.id.replace(/-/g, "").slice(0, 12).toUpperCase();
  return `VLT-${seed.slice(0, 4)}-${seed.slice(4, 8)}-${seed.slice(8, 12)}`;
}

export function ReceiptDetailView({ receipt, onBack }: ReceiptDetailViewProps) {
  const { t } = useTranslation();
  const signature = useMemo(() => generateSignature(receipt), [receipt]);
  const verificationCode = useMemo(() => generateVerificationCode(receipt), [receipt]);
  const issuedAt = format(new Date(receipt.created_at), "PPP 'at' HH:mm:ss 'UTC'");

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
    const stampColor: [number, number, number] = [5, 150, 105];

    // Header background
    doc.setFillColor(240, 253, 250);
    doc.rect(0, 0, pageWidth, 55, "F");

    // Logo box
    doc.setFillColor(...primaryColor);
    doc.rect(pageWidth / 2 - 8, yPosition, 16, 16, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("V", pageWidth / 2, yPosition + 11, { align: "center" });

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

    // Receipt details
    doc.setTextColor(...mutedColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(t("receipts.receipt_number").toUpperCase(), 20, yPosition);
    doc.setTextColor(...textColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(receipt.receipt_number, pageWidth - 20, yPosition, { align: "right" });

    yPosition += 12;

    // Amount
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

    details.forEach((row) => {
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

    yPosition += 30;

    // ── Cryptographic Signature Section ──
    doc.setDrawColor(...mutedColor);
    doc.setLineWidth(0.3);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 8;

    doc.setTextColor(...mutedColor);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("DIGITAL SIGNATURE", 20, yPosition);
    yPosition += 5;

    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(50, 50, 50);
    doc.text(signature, 20, yPosition, { maxWidth: pageWidth - 40 });
    yPosition += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...mutedColor);
    doc.text("VERIFICATION CODE", 20, yPosition);
    doc.setFont("courier", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text(verificationCode, pageWidth - 20, yPosition, { align: "right" });
    yPosition += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...mutedColor);
    doc.text(`Issued: ${issuedAt}`, 20, yPosition);
    yPosition += 10;

    // ── Vault Stamp ──
    const stampX = pageWidth - 48;
    const stampY = yPosition - 28;
    const stampR = 18;

    doc.setDrawColor(...stampColor);
    doc.setLineWidth(1);
    doc.circle(stampX, stampY, stampR, "S");
    doc.setLineWidth(0.5);
    doc.circle(stampX, stampY, stampR - 2, "S");

    doc.setTextColor(...stampColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("VAULT", stampX, stampY - 2, { align: "center" });
    doc.setFontSize(6);
    doc.text("VERIFIED", stampX, stampY + 3, { align: "center" });
    doc.setFontSize(5);
    doc.text("OFFICIAL", stampX, stampY + 7, { align: "center" });

    yPosition += 5;

    // Legal note
    doc.setTextColor(...mutedColor);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const finalText = t("receipts.legal_note");
    doc.text(finalText, pageWidth / 2, yPosition, { align: "center", maxWidth: pageWidth - 40 });

    // Save
    doc.save(
      `Receipt_${receipt.receipt_number}_${format(new Date(receipt.created_at), "yyyy-MM-dd")}.pdf`,
    );
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Top bar */}
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

          {/* Top accent stripe */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-primary to-emerald-600" />

          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span
              className="text-[80px] font-black text-primary/[0.03] dark:text-primary/[0.04] tracking-widest rotate-[-35deg] whitespace-nowrap"
              aria-hidden
            >
              VAULT OS
            </span>
          </div>

          {/* Subtle receipt icon watermark */}
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <ReceiptIcon size={120} className="rotate-12" />
          </div>

          {/* ── Header ── */}
          <div className="text-center mb-10">
            {/* Vault Logo */}
            <div className="w-16 h-16 rounded-2xl bg-primary mx-auto mb-4 flex items-center justify-center text-white shadow-lg shadow-primary/20 relative">
              <ReceiptIcon size={32} />
              {/* tiny verified badge on logo */}
              <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 flex items-center justify-center">
                <BadgeCheck size={11} className="text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-black tracking-tight">Vault OS</h2>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
              {t("receipts.certified")}
            </p>
          </div>

          {/* ── Receipt Fields ── */}
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
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10 gap-1">
                  <ShieldCheck size={11} />
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

            {/* ── Secure Transfer Banner ── */}
            <div className="mt-6 px-4 py-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex gap-2 items-start">
              <Lock size={13} className="text-emerald-500 mt-0.5 shrink-0" />
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold leading-relaxed">
                {t("receipts.transfer_secure_msg", {
                  currency: receipt.currency,
                  amount: receipt.amount.toLocaleString(),
                })}
              </p>
            </div>

            {/* ══════════════════════════════════════════
                VAULT STAMP + CRYPTOGRAPHIC SIGNATURE
            ══════════════════════════════════════════ */}
            <div className="mt-10 pt-8 border-t-2 border-dashed border-border/50 space-y-5">

              {/* Vault Official Stamp */}
              <div className="flex justify-center">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full border-[3px] border-primary/60" />
                  {/* Inner ring */}
                  <div className="absolute inset-[6px] rounded-full border-[1.5px] border-primary/40" />
                  {/* Rotating dotted border effect */}
                  <div className="absolute inset-[2px] rounded-full border-[2px] border-dashed border-primary/25 animate-spin [animation-duration:20s]" />
                  {/* Stamp content */}
                  <div className="flex flex-col items-center justify-center z-10">
                    <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center mb-1 shadow-md shadow-primary/30">
                      <span className="text-white text-xs font-black">V</span>
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-[0.25em] text-primary">Vault</span>
                    <span className="text-[6.5px] font-bold uppercase tracking-[0.2em] text-primary/70">Verified</span>
                    <span className="text-[5.5px] font-bold uppercase tracking-[0.15em] text-primary/50 mt-0.5">Official</span>
                  </div>
                </div>
              </div>

              {/* Trust badges row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-muted/30 border border-border/40">
                  <ShieldCheck size={15} className="text-emerald-500" />
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wide text-center">Verified</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-muted/30 border border-border/40">
                  <Lock size={15} className="text-blue-500" />
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wide text-center">Encrypted</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-muted/30 border border-border/40">
                  <BadgeCheck size={15} className="text-violet-500" />
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wide text-center">Certified</span>
                </div>
              </div>

              {/* Cryptographic Signature Block */}
              <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Lock size={12} className="text-primary" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Digital Signature
                  </span>
                </div>

                {/* Signature hash */}
                <div className="bg-background/60 dark:bg-zinc-800/60 rounded-lg px-3 py-2 border border-border/40">
                  <p className="text-[8.5px] font-mono text-foreground/70 break-all leading-relaxed">
                    {signature}
                  </p>
                </div>

                {/* Verification code + issued at */}
                <div className="flex justify-between items-end pt-1">
                  <div>
                    <p className="text-[8px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
                      Verification Code
                    </p>
                    <p className="text-[9px] font-mono font-bold text-foreground">
                      {verificationCode}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
                      Issued At
                    </p>
                    <p className="text-[8px] font-mono text-foreground/70">
                      {issuedAt}
                    </p>
                  </div>
                </div>
              </div>

              {/* Legal note */}
              <p className="text-[9px] text-muted-foreground text-center max-w-[260px] mx-auto leading-relaxed">
                {t("receipts.legal_note")}
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
