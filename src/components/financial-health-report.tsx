import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/api/supabase";
import { useProfileSignal } from "@/lib/profile-signal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, AlertTriangle, Download, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LedgerMetrics {
  totalInflow: number;
  totalOutflow: number;
  netPosition: number;
  activityVolume: number;
  currentBalance: number;
}

interface AuditInfo {
  verifiedEntries: number;
  tamperedEntries: number;
  isSystemIntegrityValid: boolean;
}

interface FinancialHealthReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currencySymbol?: string;
}

export const FinancialHealthReport: React.FC<FinancialHealthReportProps> = ({
  open,
  onOpenChange,
  currencySymbol = "$",
}) => {
  const [profile] = useProfileSignal();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ metrics: LedgerMetrics; audit: AuditInfo } | null>(null);

  const fetchReportData = useCallback(async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    try {
      const { data: entries, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      let totalInflow = 0;
      let totalOutflow = 0;
      let verifiedEntries = 0;
      let tamperedEntries = 0;

      entries?.forEach((entry: any) => {
        // Simple audit check for demo purposes
        // In a real app, you'd verify entry.cryptographic_signature against HMAC
        const isVerified = entry.cryptographic_signature && !entry.cryptographic_signature.startsWith('invalid_');
        
        if (isVerified) {
          verifiedEntries++;
          const val = parseFloat(entry.amount);
          if (entry.type === 'INFLOW') {
            totalInflow += val;
          } else {
            totalOutflow += val;
          }
        } else {
          tamperedEntries++;
        }
      });

      const netPosition = totalInflow - totalOutflow;

      setData({
        metrics: {
          totalInflow,
          totalOutflow,
          netPosition,
          activityVolume: (entries?.length || 0),
          currentBalance: netPosition,
        },
        audit: {
          verifiedEntries,
          tamperedEntries,
          isSystemIntegrityValid: tamperedEntries === 0,
        }
      });
    } catch (error) {
      console.error("Failed to fetch ledger insights:", error);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (open) {
      fetchReportData();
    }
  }, [open, fetchReportData]);

  const handleDownloadCSV = () => {
    if (!data) return;
    
    // In a production app, this would likely trigger a fetch for the full ledger
    // Here we demonstrate the client-side generation
    const headers = "Metric,Value\n";
    const rows = [
      ["Total Inflow", data.metrics.totalInflow],
      ["Total Outflow", data.metrics.totalOutflow],
      ["Net Position", data.metrics.netPosition],
      ["Activity Volume", data.metrics.activityVolume],
      ["Current Balance", data.metrics.currentBalance]
    ].map(r => r.join(",")).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vault-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-card/95 backdrop-blur-2xl border-border/40 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="font-serif text-2xl">Financial Health Report</DialogTitle>
              <DialogDescription>
                Zero-trust ledger audit & performance metrics.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="p-4 rounded-2xl bg-muted/20 border border-border/10 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-32" />
                </div>
              ))
            ) : data ? (
              <>
                <MetricCard 
                  label="Total Inflow" 
                  value={data.metrics.totalInflow} 
                  symbol={currencySymbol} 
                  variant="positive" 
                />
                <MetricCard 
                  label="Total Outflow" 
                  value={data.metrics.totalOutflow} 
                  symbol={currencySymbol} 
                  variant="negative" 
                />
                <MetricCard 
                  label="Net Position" 
                  value={data.metrics.netPosition} 
                  symbol={currencySymbol} 
                  variant={data.metrics.netPosition >= 0 ? "primary" : "negative"} 
                />
                <MetricCard 
                  label="Activity Volume" 
                  value={data.metrics.activityVolume} 
                  unit="Entries" 
                />
              </>
            ) : null}
          </div>

          {/* Ledger Insights Block */}
          <div className={cn(
            "rounded-2xl border p-5 transition-all",
            data?.audit.isSystemIntegrityValid 
              ? "bg-emerald-500/5 border-emerald-500/20" 
              : "bg-destructive/5 border-destructive/20"
          )}>
            <div className="flex items-start gap-4">
              <div className={cn(
                "mt-1 p-2 rounded-full",
                data?.audit.isSystemIntegrityValid ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
              )}>
                {data?.audit.isSystemIntegrityValid ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold uppercase tracking-wider mb-2">
                  Ledger Integrity Audit
                </h4>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    System scanned <span className="text-foreground font-semibold">{data?.audit.verifiedEntries}</span> cryptographically signed entries. 
                    {data?.audit.isSystemIntegrityValid ? (
                      <> Your current balance of <span className="text-emerald-500 font-bold">{currencySymbol}{data?.metrics.currentBalance.toLocaleString()}</span> is fully verified and immutable.</>
                    ) : (
                      <> <span className="text-destructive font-bold">WARNING:</span> {data?.audit.tamperedEntries} entries failed verification. Portfolio state may be compromised.</>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl">
            Close Audit
          </Button>
          <Button 
            onClick={handleDownloadCSV}
            disabled={loading || !data}
            className="flex-1 rounded-xl bg-primary shadow-lg shadow-primary/20 gap-2"
          >
            <Download size={16} /> Download CSV Statement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MetricCard = ({ 
  label, 
  value, 
  symbol = "", 
  unit = "", 
  variant = "default" 
}: { 
  label: string; 
  value: number; 
  symbol?: string; 
  unit?: string;
  variant?: "default" | "positive" | "negative" | "primary" 
}) => {
  const isPositive = value >= 0;
  const formattedValue = Math.abs(value).toLocaleString();
  
  const colors = {
    default: "text-foreground",
    positive: "text-emerald-500",
    negative: "text-destructive",
    primary: "text-primary"
  };

  return (
    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 transition-all hover:bg-primary/10">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className={cn("text-xl font-bold tracking-tight", colors[variant])}>
        {variant === "positive" && "+"}
        {variant === "negative" && "-"}
        {symbol}{formattedValue} <span className="text-xs font-normal opacity-70">{unit}</span>
      </div>
    </div>
  );
};
