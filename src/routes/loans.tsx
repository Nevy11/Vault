import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  Landmark,
  Info,
  AlertCircle,
  ArrowUpRight,
  Calendar,
  History,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Zap,
  Check,
  X,
  Smartphone,
  Building2,
  ArrowLeft,
  Wallet,
  Clock,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, addMonths } from "date-fns";
import { supabase } from "@/api/supabase";
import { useProfileSignal } from "@/lib/profile-signal";

export const Route = createFileRoute("/loans")({
  component: LoansPage,
});

const INTEREST_RATES: Record<string, number> = {
  "1": 3,
  "3": 4,
  "6": 5,
  "12": 6,
};

function LoansPage() {
  const [profile] = useProfileSignal();
  const [activeTab, setActiveTab] = useState<string>("request");
  const [loanAmount, setLoanAmount] = useState<string>("");
  const [period, setPeriod] = useState<string>("3");
  const [showRepayPopup, setShowRepayPopup] = useState(false);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayProvider, setRepayProvider] = useState("");
  const [sourceIdentifier, setSourceIdentifier] = useState("");
  
  const [activeLoan, setActiveLoan] = useState<any>(null);
  const [loanHistory, setLoanHistory] = useState<any[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLoanData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      // Fetch Active Loan
      const { data: active, error: activeErr } = await supabase
        .from("loans")
        .select("*")
        .eq("user_id", profile.id)
        .eq("status", "active")
        .maybeSingle();

      if (activeErr) throw activeErr;
      setActiveLoan(active);

      // Fetch Loan History
      const { data: history, error: historyErr } = await supabase
        .from("loans")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (historyErr) throw historyErr;
      setLoanHistory(history || []);

      // Fetch Ledger if there's an active loan
      if (active) {
        const { data: ledger, error: ledgerErr } = await supabase
          .from("loans_ledger")
          .select("*")
          .eq("loan_id", active.id)
          .order("created_at", { ascending: false });
        
        if (ledgerErr) throw ledgerErr;
        setLedgerEntries(ledger || []);
      }
    } catch (error: any) {
      console.error("Error fetching loan data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoanData();
  }, [profile?.id]);

  // Mock User Eligibility Data (Keeping for eligibility check)
  const userStats = {
    accountAgeYears: 7,
    avgDeposits: 2500,
    medianFrequentBalance: 50000,
  };

  // Eligibility Logic
  const isEligible = userStats.accountAgeYears > 6 && userStats.avgDeposits > 2000;
  const maxLimit = userStats.medianFrequentBalance * 0.5;
  const requestedAmountNum = parseFloat(loanAmount) || 0;
  const isOverLimit = requestedAmountNum > maxLimit;

  const currentInterestRate = INTEREST_RATES[period] || 5;
  const interestAmount = requestedAmountNum * (currentInterestRate / 100);
  const totalDue = requestedAmountNum + interestAmount;

  const loanTotalDue = activeLoan
    ? parseFloat(activeLoan.amount) * (1 + parseFloat(activeLoan.interest_rate) / 100)
    : 0;
  const outstandingBalance = activeLoan ? parseFloat(activeLoan.remaining_balance) : 0;
  const loanPaid = loanTotalDue - outstandingBalance;
  const loanProgress = loanTotalDue > 0 ? Math.round((loanPaid / loanTotalDue) * 100) : 0;
  const potentialLimitBoost = activeLoan
    ? Math.min(25, Math.max(5, Math.round((loanPaid / loanTotalDue) * 20 + 5)))
    : 5;

  const handleRequestLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    
    if (isOverLimit) {
      toast.error("Limit Exceeded", {
        description: `Your maximum loan limit is KES ${maxLimit.toLocaleString()}.`,
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc("disburse_loan", {
        p_amount: requestedAmountNum,
        p_interest_rate: currentInterestRate,
        p_repayment_period: parseInt(period),
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Loan Approved!", {
          description: `KES ${requestedAmountNum.toLocaleString()} has been credited to your ledger.`,
        });
        await fetchLoanData();
        setActiveTab("tracker");
      } else {
        toast.error("Loan Request Failed", { description: data.message });
      }
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
  };

  const handleRepayment = async () => {
    if (!repayAmount || !repayProvider || !activeLoan) {
      toast.error("Incomplete Details", { description: "Please enter amount and select source." });
      return;
    }

    // Require identifier for non-vault payments
    if (repayProvider !== "Vault Wallet" && !sourceIdentifier) {
      const label = repayProvider.includes("Bank") ? "Account Number" : "Phone Number";
      toast.error(`Missing ${label}`, { description: `Please provide your ${label.toLowerCase()}.` });
      return;
    }

    try {
      let result;
      if (repayProvider === "Vault Wallet") {
        const { data, error } = await supabase.rpc("process_vault_repayment", {
          p_loan_id: activeLoan.id,
          p_amount: parseFloat(repayAmount),
        });
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase.rpc("repay_loan", {
          p_loan_id: activeLoan.id,
          p_amount: parseFloat(repayAmount),
          p_source: `${repayProvider} (${sourceIdentifier})`,
          p_payment_type: "manual",
        });
        if (error) throw error;
        result = data;
      }

      if (result.success) {
        toast.success("Repayment Processed", {
          description: `KES ${parseFloat(repayAmount).toLocaleString()} has been processed from your ${repayProvider}.`,
        });
        await fetchLoanData();
        setShowRepayPopup(false);
        setRepayAmount("");
        setSourceIdentifier("");
        if (result.new_balance === 0) {
          setActiveTab("success");
        }
      } else {
        toast.error("Repayment Failed", { description: result.message });
      }
    } catch (err: any) {
      toast.error("Repayment Failed", { description: err.message });
    }
  };

  return (
    <AppShell>
      <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden">
        {/* Full-Bleed Background Image */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-fixed"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=2070&auto=format&fit=crop")',
            opacity: 0.2,
          }}
        />
        <div className="absolute inset-0 z-0 bg-background/10 backdrop-blur-[2px]" />

        <main className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-in fade-in duration-700">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2 drop-shadow-sm text-slate-950 dark:text-white">
                Instant Credit
              </h1>
              <p className="text-muted-foreground flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Algorithmic lending based on your ledger integrity.
              </p>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList className="grid w-full grid-cols-3 h-12 bg-white/20 dark:bg-slate-900/40 backdrop-blur-md p-1 rounded-2xl border border-white/20">
                <TabsTrigger
                  value="request"
                  className="rounded-xl font-bold transition-all duration-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-xs sm:text-sm"
                >
                  Request
                </TabsTrigger>
                <TabsTrigger
                  value="tracker"
                  className="rounded-xl font-bold transition-all duration-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-xs sm:text-sm"
                >
                  Tracker
                </TabsTrigger>
                <TabsTrigger
                  value="success"
                  className="rounded-xl font-bold transition-all duration-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-xs sm:text-sm"
                >
                  Status
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            {/* LOAN REQUEST FORM */}
            <TabsContent
              value="request"
              className="focus-visible:outline-none animate-in fade-in duration-500"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2">
                  <Card className="rounded-2xl border border-white/10 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl p-4 shadow-lg overflow-hidden relative">
                    <form onSubmit={handleRequestLoan} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground opacity-80">
                          Loan Amount
                        </Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-medium text-muted-foreground">
                            KES
                          </span>
                          <Input
                            type="number"
                            value={loanAmount}
                            onChange={(e) => setLoanAmount(e.target.value)}
                            placeholder="0.00"
                            className="h-11 pl-12 text-lg font-bold rounded-xl bg-white/40 dark:bg-slate-900/40 border-white/10 focus:bg-white/60 transition-all tabular-nums"
                            required
                          />
                        </div>
                        <div className="flex justify-between items-center px-0.5">
                          <span className="text-[8px] text-muted-foreground font-medium">
                            Limit: <span className="text-foreground font-semibold">KES {maxLimit.toLocaleString()}</span>
                          </span>
                          {isOverLimit && (
                            <span className="text-[8px] text-destructive font-semibold flex items-center gap-1">
                              <AlertCircle className="w-2 h-2" /> Over Limit
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground opacity-80">
                            Period
                          </Label>
                          <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="h-9 rounded-xl bg-white/40 dark:bg-slate-900/40 border-white/10 font-medium text-[11px]">
                              <SelectValue placeholder="Period" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-xl">
                              <SelectItem value="1" className="font-medium text-[11px]">1 Month (3%)</SelectItem>
                              <SelectItem value="3" className="font-medium text-[11px]">3 Months (4%)</SelectItem>
                              <SelectItem value="6" className="font-medium text-[11px]">6 Months (5%)</SelectItem>
                              <SelectItem value="12" className="font-medium text-[11px]">12 Months (6%)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground opacity-80">
                            Date
                          </Label>
                          <div className="h-9 flex items-center px-3 rounded-xl bg-white/20 dark:bg-slate-900/20 border border-dashed border-white/10 text-muted-foreground font-medium text-[11px]">
                            <Calendar className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                            {format(new Date(), "MMM d, yyyy")}
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[7px] text-muted-foreground uppercase tracking-wider font-semibold">Principal</span>
                          <p className="font-semibold text-[11px] text-slate-950 dark:text-white tabular-nums">KES {requestedAmountNum.toLocaleString()}</p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[7px] text-muted-foreground uppercase tracking-wider font-semibold">Interest</span>
                          <p className="font-semibold text-emerald-500 text-[11px] tabular-nums">+{interestAmount.toLocaleString()}</p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[7px] text-muted-foreground uppercase tracking-wider font-semibold">Fee</span>
                          <p className="font-semibold text-[11px] text-slate-950 dark:text-white">KES 0</p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[7px] text-muted-foreground uppercase tracking-wider font-semibold">Total</span>
                          <p className="font-bold text-[11px] text-slate-950 dark:text-white tabular-nums">KES {totalDue.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="relative group pt-1">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={!isEligible || isOverLimit || requestedAmountNum <= 0 || !!activeLoan}
                          className="w-full h-10 rounded-xl text-xs font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                        >
                          {activeLoan ? "Active Disbursement Exists" : "Disburse Instant Credit"}
                        </Button>
                        {activeLoan && (
                          <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-destructive text-white text-[8px] font-bold uppercase tracking-wider rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none border border-white/5 flex items-center gap-1.5">
                            <AlertCircle className="w-2.5 h-2.5" /> Single Active Loan Rule
                          </div>
                        )}
                      </div>
                    </form>
                  </Card>
                </div>

                {/* Eligibility Guard Sidebar */}
                <div className="space-y-4">
                  <Card className="rounded-2xl border border-white/20 bg-white/70 dark:bg-slate-950/60 backdrop-blur-xl overflow-hidden shadow-md">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-950 dark:text-white">
                        Limit Guard™
                      </CardTitle>
                      <CardDescription className="font-medium text-[9px]">
                        Disbursement criteria
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              userStats.accountAgeYears > 6 ? "bg-emerald-500" : "bg-muted",
                            )}
                          />
                          <span className="text-[11px] text-slate-900 dark:text-slate-100 font-medium">
                            Age {">"} 6 Years
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-600">
                          {userStats.accountAgeYears}y
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              userStats.avgDeposits > 2000 ? "bg-emerald-500" : "bg-muted",
                            )}
                          />
                          <span className="text-[11px] text-slate-900 dark:text-slate-100 font-medium">
                            Deposits {">"} 2K
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-600">
                          {userStats.avgDeposits.toLocaleString()}
                        </span>
                      </div>
                      <div className="pt-3 border-t border-white/5">
                        <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                          Limit is capped at <span className="text-emerald-600 font-bold">50%</span> of median frequent balance.
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-emerald-500/5 p-3 border-t border-emerald-500/10">
                      <div className="flex items-center gap-1.5 text-[8px] text-emerald-600 font-bold uppercase tracking-wider">
                        <ShieldCheck className="w-3 h-3" /> Ledger Verified
                      </div>
                    </CardFooter>
                  </Card>

                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-2 backdrop-blur-sm shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="font-bold uppercase text-[9px] tracking-wider text-slate-950 dark:text-white">
                      Higher Limits?
                    </h4>
                    <p className="text-[10px] text-muted-foreground font-medium leading-tight">
                      Increase frequent deposits to unlock premium credit tiers.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* REPAYMENT TRACKER */}
            <TabsContent
              value="tracker"
              className="focus-visible:outline-none space-y-4 animate-in fade-in duration-500"
            >
              {activeLoan ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Active Loan Card */}
                  <Card className="md:col-span-2 rounded-2xl border border-white/10 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl overflow-hidden shadow-lg">
                    <CardHeader className="p-4 pb-0.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold text-slate-950 dark:text-white">
                            Personal Credit Line
                          </CardTitle>
                          <CardDescription className="font-medium text-[10px] opacity-60">
                            Active disbursement #{activeLoan.id.slice(0, 8)}
                          </CardDescription>
                        </div>
                        <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-semibold uppercase tracking-wider border border-emerald-500/20 shadow-sm">
                          {activeLoan.status}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 py-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="space-y-0.5">
                          <span className="text-[8px] text-muted-foreground uppercase tracking-wider font-semibold opacity-70">
                            Original
                          </span>
                          <p className="text-base font-bold text-slate-950 dark:text-white tabular-nums">
                            KES {parseFloat(activeLoan.amount).toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[8px] text-muted-foreground uppercase tracking-wider font-semibold opacity-70">
                            Repaid
                          </span>
                          <p className="text-base font-bold text-emerald-600 tabular-nums">
                            KES {(parseFloat(activeLoan.amount) * (1 + activeLoan.interest_rate/100) - parseFloat(activeLoan.remaining_balance)).toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[8px] text-muted-foreground uppercase tracking-wider font-semibold opacity-70">
                            Due
                          </span>
                          <p className="text-base font-bold text-destructive tabular-nums">
                            {format(new Date(activeLoan.due_date), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-semibold">
                          <span className="text-muted-foreground uppercase tracking-wider opacity-60">
                            Progress
                          </span>
                          <span className="text-emerald-600">
                            {(
                              ((parseFloat(activeLoan.amount) * (1 + activeLoan.interest_rate/100) - parseFloat(activeLoan.remaining_balance)) / 
                              (parseFloat(activeLoan.amount) * (1 + activeLoan.interest_rate/100))) *
                              100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden border border-white/5">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                            style={{
                              width: `${((parseFloat(activeLoan.amount) * (1 + activeLoan.interest_rate/100) - parseFloat(activeLoan.remaining_balance)) / 
                              (parseFloat(activeLoan.amount) * (1 + activeLoan.interest_rate/100))) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="p-3 border-t border-white/5 flex gap-2 bg-white/5">
                      <Button
                        size="sm"
                        className="flex-1 rounded-xl h-9 font-bold text-xs shadow-sm active:scale-95 transition-all"
                        onClick={() => setShowRepayPopup(true)}
                      >
                        Repay Amount
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl h-9 border-white/10 font-bold text-xs hover:bg-emerald-500/10 active:scale-95 transition-all"
                        onClick={() => setActiveTab("success")}
                      >
                        Status
                      </Button>
                    </CardFooter>
                  </Card>

                  {/* History Sidebar */}
                  <div className="space-y-3">
                    <Card className="rounded-2xl border border-white/10 bg-white/70 dark:bg-slate-950/60 backdrop-blur-xl shadow-md overflow-hidden">
                      <CardHeader className="p-3 pb-0.5">
                        <div className="flex items-center gap-2">
                          <History className="w-3.5 h-3.5 text-muted-foreground" />
                          <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-950 dark:text-white">
                            History
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 p-3 pt-1.5">
                        {loanHistory.slice(0, 4).map((loan, i) => (
                          <div
                            key={loan.id}
                            className="flex items-center justify-between group cursor-pointer hover:bg-emerald-500/5 p-1 -mx-1 rounded-lg transition-all"
                          >
                            <div>
                              <p className="text-[10px] font-semibold text-slate-950 dark:text-white">
                                #{loan.id.slice(0, 6).toUpperCase()}
                              </p>
                              <p className="text-[8px] text-muted-foreground font-medium">
                                {format(new Date(loan.created_at), "MMM d, yyyy")}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-slate-950 dark:text-white tabular-nums">
                                KES {parseFloat(loan.amount).toLocaleString()}
                              </p>
                              <span className={cn(
                                "text-[8px] font-semibold uppercase tracking-tight",
                                loan.status === 'paid' ? "text-emerald-500" : "text-primary"
                              )}>
                                {loan.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-3 shadow-sm backdrop-blur-sm">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Trust
                        </h4>
                        <p className="text-base font-bold text-slate-950 dark:text-white leading-none">
                          782{" "}
                          <span className="text-[8px] text-emerald-500 font-bold ml-1 uppercase">
                            Elite
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-muted-foreground mb-3 shadow-inner border border-white/5">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-1 uppercase italic">No active ledger</h2>
                  <p className="text-muted-foreground font-medium mb-5 max-w-xs text-[10px]">Ready for an instant boost? Request today.</p>
                  <Button onClick={() => setActiveTab("request")} className="rounded-xl px-5 h-9 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 shadow-md">
                    Get Instant Loan
                  </Button>
                </div>
              )}

              {/* Bottom Ledger Table Section */}
              {activeLoan && (
                <div className="mt-6 space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
                  <div className="flex items-center gap-1.5 px-1">
                    <History className="w-3.5 h-3.5 text-emerald-500" />
                    <h3 className="text-xs font-bold uppercase tracking-tight text-slate-950 dark:text-white">
                      Ledger History
                    </h3>
                  </div>
                  <Card className="rounded-2xl border border-white/10 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl overflow-hidden shadow-md">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/5 bg-slate-900/5 dark:bg-white/5">
                            <th className="px-4 py-2 font-bold uppercase tracking-wider text-[8px] text-muted-foreground">Date</th>
                            <th className="px-4 py-2 font-bold uppercase tracking-wider text-[8px] text-muted-foreground">Source</th>
                            <th className="px-4 py-2 font-bold uppercase tracking-wider text-[8px] text-muted-foreground">Type</th>
                            <th className="px-4 py-2 font-bold uppercase tracking-wider text-[8px] text-muted-foreground">Paid</th>
                            <th className="px-4 py-2 font-bold uppercase tracking-wider text-[8px] text-emerald-600">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {ledgerEntries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-emerald-500/5 transition-colors">
                              <td className="px-4 py-2 font-medium text-[10px] opacity-70">{format(new Date(entry.created_at), "MMM d, HH:mm")}</td>
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                    {entry.source.toLowerCase().includes('bank') ? <Building2 className="w-2.5 h-2.5 text-emerald-600" /> : <Smartphone className="w-2.5 h-2.5 text-emerald-600" />}
                                  </div>
                                  <span className="font-semibold uppercase tracking-tighter text-[8px]">{entry.source}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded-full text-[7px] font-bold uppercase tracking-wider border",
                                  entry.payment_type === 'automated' ? "bg-primary/10 text-primary border-primary/20" : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                                )}>
                                  {entry.payment_type}
                                </span>
                              </td>
                              <td className="px-4 py-2 font-bold text-[10px] text-slate-950 dark:text-white tabular-nums">KES {parseFloat(entry.amount).toLocaleString()}</td>
                              <td className="px-4 py-2 font-bold text-[10px] text-emerald-600 tabular-nums">KES {parseFloat(entry.remaining_balance).toLocaleString()}</td>
                            </tr>
                          ))}
                          {ledgerEntries.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground font-semibold italic text-[10px]">
                                No activity logged.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* LOAN COMPLETION / STATUS VIEW (FINAL PAGE) */}
            <TabsContent
              value="success"
              className="focus-visible:outline-none animate-in zoom-in-95 duration-500"
            >
              <div className="max-w-4xl mx-auto py-12">
                {activeLoan ? (
                  <div className="space-y-8">
                    <div className="relative text-center">
                      <div className="absolute inset-x-0 top-0 h-40 rounded-[2.5rem] bg-emerald-500/10 blur-3xl opacity-40" />
                      <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-white/90 shadow-2xl border border-white/40 backdrop-blur-xl text-destructive mx-auto">
                        <AlertCircle className="w-12 h-12 text-emerald-600" />
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground mb-3">
                        Status
                      </p>
                      <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-950 dark:text-white uppercase">
                        YOU HAVE A PENDING LOAN LEFT
                      </h2>
                      <p className="mt-4 text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300 max-w-2xl mx-auto">
                        You have an outstanding balance of <span className="font-bold text-destructive">KES {outstandingBalance.toLocaleString()}</span>. Complete the loan today to increase your limit!
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <Card className="rounded-[2rem] border border-white/30 bg-white/90 shadow-2xl p-8 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-muted-foreground mb-3">
                          OUTSTANDING BALANCE
                        </p>
                        <p className="text-3xl sm:text-4xl font-black text-slate-950 tabular-nums">
                          KES {outstandingBalance.toLocaleString()}
                        </p>
                        <p className="mt-2 text-xs sm:text-sm text-muted-foreground font-medium">
                          Remaining on your active loan.
                        </p>
                      </Card>

                      <Card className="rounded-[2rem] border border-white/30 bg-emerald-500/10 shadow-2xl p-8 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-emerald-700 mb-3">
                          POTENTIAL LIMIT BOOST
                        </p>
                        <p className="text-3xl sm:text-4xl font-black text-emerald-700">
                          +{potentialLimitBoost}%
                        </p>
                        <p className="mt-2 text-xs sm:text-sm text-emerald-950/80 font-medium">
                          Based on your active loan repayment health.
                        </p>
                      </Card>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-2">
                      <Button
                        className="h-12 px-8 rounded-full bg-emerald-600 text-white font-bold shadow-xl hover:bg-emerald-700 transition-all"
                        onClick={() => setShowRepayPopup(true)}
                      >
                        Pay Balance Now
                      </Button>
                      <Button
                        variant="outline"
                        className="h-12 px-8 rounded-full border-white/30 text-slate-950 dark:text-white font-bold hover:bg-white/10 transition-all"
                        onClick={() => setActiveTab("tracker")}
                      >
                        View Tracker
                      </Button>
                    </div>

                    <div className="mt-10 rounded-[2rem] border border-white/20 bg-slate-950/5 dark:bg-slate-900/40 p-6 text-center shadow-inner">
                      <p className="text-[11px] uppercase tracking-[0.35em] font-semibold text-muted-foreground mb-3">
                        Progress to completion
                      </p>
                      <div className="mx-auto h-4 w-full max-w-xl rounded-full bg-muted/20 overflow-hidden border border-white/10">
                        <div className="h-full bg-emerald-600 transition-all" style={{ width: `${loanProgress}%` }} />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">
                        {loanProgress}% repaid of KES {loanTotalDue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <h2 className="text-xl font-bold text-slate-950 dark:text-white mb-3">
                      No Pending Loan
                    </h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Request a loan to see your current status and repayment progress.
                    </p>
                    <Button onClick={() => setActiveTab("request")} className="rounded-full px-6 h-11 font-bold bg-emerald-600 hover:bg-emerald-700 transition-all">
                      Request Loan
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* REPAYMENT POPUP MODAL */}
      <Dialog open={showRepayPopup} onOpenChange={setShowRepayPopup}>
        <DialogContent className="max-w-sm rounded-2xl border-white/10 bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl p-0 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="relative p-5">
            <button
              onClick={() => setShowRepayPopup(false)}
              className="absolute right-4 top-4 w-6 h-6 rounded-full bg-muted/20 flex items-center justify-center hover:bg-muted/40 transition-colors z-20"
            >
              <X className="w-3 h-3" />
            </button>

            <DialogHeader className="mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-2 border border-emerald-500/20">
                <CreditCard className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-950 dark:text-white">Repayment</DialogTitle>
              <DialogDescription className="font-medium text-[11px] text-muted-foreground">Settle balance to grow your credit limit.</DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-900/5 dark:bg-white/5 border border-white/5 text-center">
                <span className="text-[8px] font-semibold uppercase text-muted-foreground tracking-wider">Total Outstanding</span>
                <p className="text-xl font-bold text-slate-950 dark:text-white tabular-nums">KES {activeLoan ? parseFloat(activeLoan.remaining_balance).toLocaleString() : "0.00"}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Payment Source</Label>
                <Select value={repayProvider} onValueChange={(val) => { setRepayProvider(val); setSourceIdentifier(""); }}>
                  <SelectTrigger className="h-10 rounded-lg bg-muted/10 border-white/10 font-semibold text-xs"><SelectValue placeholder="Select Source" /></SelectTrigger>
                  <SelectContent className="rounded-lg shadow-xl backdrop-blur-xl border-white/20 z-[100]">
                    <SelectItem value="Vault Wallet" className="font-bold text-emerald-600 text-xs">Vault Wallet</SelectItem>
                    <SelectItem value="M-Pesa" className="font-medium text-xs">M-Pesa</SelectItem>
                    <SelectItem value="Airtel Money" className="font-medium text-xs">Airtel Money</SelectItem>
                    <SelectItem value="Equity Bank" className="font-medium text-xs">Equity Bank</SelectItem>
                    <SelectItem value="KCB Bank" className="font-medium text-xs">KCB Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {repayProvider && repayProvider !== "Vault Wallet" && (
                <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-300">
                  <Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{repayProvider.includes("Bank") ? "Account Number" : "Mobile Number"}</Label>
                  <div className="relative">
                    {repayProvider.includes("Bank") ? <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" /> : <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />}
                    <Input placeholder={repayProvider.includes("Bank") ? "1234567..." : "07123..."} value={sourceIdentifier} onChange={(e) => setSourceIdentifier(e.target.value)} className="h-10 pl-9 rounded-lg bg-muted/5 border-white/10 font-medium text-xs text-slate-950 dark:text-white" />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Amount (KES)</Label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input type="number" placeholder="0.00" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} className="h-10 pl-9 rounded-lg bg-muted/5 border-white/10 font-bold text-xs text-slate-950 dark:text-white tabular-nums" />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button variant="outline" className="flex-1 h-10 rounded-lg font-bold text-xs border-white/10" onClick={() => setShowRepayPopup(false)}>Back</Button>
              <Button className="flex-1 h-10 rounded-lg font-bold text-xs shadow-md bg-emerald-600 hover:bg-emerald-700" onClick={handleRepayment}>Process <Check className="ml-1.5 w-3.5 h-3.5" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
