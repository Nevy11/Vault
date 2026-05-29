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
        const { data, error } = await supabase.rpc("repay_loan_from_vault", {
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <Card className="rounded-[2.5rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl p-8 sm:p-12 shadow-2xl overflow-hidden relative">
                    <form onSubmit={handleRequestLoan} className="space-y-8">
                      <div className="space-y-3">
                        <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                          Desired Loan Amount
                        </Label>
                        <div className="relative">
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-muted-foreground">
                            KES
                          </span>
                          <Input
                            type="number"
                            value={loanAmount}
                            onChange={(e) => setLoanAmount(e.target.value)}
                            placeholder="0.00"
                            className="h-20 pl-24 text-3xl font-black rounded-2xl bg-white/50 dark:bg-slate-900/40 border-white/40 focus:bg-white/80 transition-all"
                            required
                          />
                        </div>
                        <div className="flex justify-between items-center px-2">
                          <span className="text-xs text-muted-foreground font-bold">
                            Max Limit:{" "}
                            <span className="text-foreground font-black">
                              KES {maxLimit.toLocaleString()}
                            </span>
                          </span>
                          {isOverLimit && (
                            <span className="text-xs text-destructive font-black flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Limit Exceeded
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                            Repayment Period (Months)
                          </Label>
                          <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="h-14 rounded-2xl bg-white/50 dark:bg-slate-900/40 border-white/40 font-black">
                              <SelectValue placeholder="Select period" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-white/30 bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl">
                              <SelectItem value="1" className="font-bold">
                                1 Month (3% Interest)
                              </SelectItem>
                              <SelectItem value="3" className="font-bold">
                                3 Months (4% Interest)
                              </SelectItem>
                              <SelectItem value="6" className="font-bold">
                                6 Months (5% Interest)
                              </SelectItem>
                              <SelectItem value="12" className="font-bold">
                                12 Months (6% Interest)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                            Borrow Date
                          </Label>
                          <div className="h-14 flex items-center px-4 rounded-2xl bg-white/30 dark:bg-slate-900/20 border border-dashed border-white/40 text-muted-foreground font-black">
                            <Calendar className="w-4 h-4 mr-2 text-emerald-500" />
                            {format(new Date(), "PPP")}
                          </div>
                        </div>
                      </div>

                      <div className="p-8 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 grid grid-cols-2 sm:grid-cols-4 gap-6">
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                            Principal
                          </span>
                          <p className="font-black">KES {requestedAmountNum.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                            Interest
                          </span>
                          <p className="font-black text-emerald-500">
                            +KES {interestAmount.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                            Processing
                          </span>
                          <p className="font-black">KES 0.00</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                            Total Due
                          </span>
                          <p className="font-black">
                            KES {totalDue.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="relative group">
                        <Button
                          type="submit"
                          disabled={!isEligible || isOverLimit || requestedAmountNum <= 0 || !!activeLoan}
                          className="w-full h-18 rounded-[1.5rem] text-xl font-black shadow-2xl shadow-emerald-500/30 bg-emerald-600 hover:bg-emerald-700 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                        >
                          {activeLoan ? "Active Loan Exists" : "Disburse Instant Loan"}
                        </Button>
                        {activeLoan && (
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-destructive text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap border border-white/10 flex items-center gap-2">
                            <AlertCircle className="w-3 h-3" /> Active Loan Restriction
                          </div>
                        )}
                      </div>
                    </form>
                  </Card>
                </div>

                {/* Eligibility Guard Sidebar */}
                <div className="space-y-6">
                  <Card className="rounded-[2rem] border border-white/30 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl overflow-hidden shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-950 dark:text-white">
                        Limit Guard™
                      </CardTitle>
                      <CardDescription className="font-bold">
                        Eligibility criteria & limit rules
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-2.5 h-2.5 rounded-full shadow-sm",
                              userStats.accountAgeYears > 6
                                ? "bg-emerald-500 animate-pulse"
                                : "bg-muted",
                            )}
                          />
                          <span className="text-sm text-slate-900 dark:text-slate-100 font-bold">
                            Account Age {">"} 6 Years
                          </span>
                        </div>
                        <span className="text-sm font-black text-emerald-600">
                          {userStats.accountAgeYears} Years
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-2.5 h-2.5 rounded-full shadow-sm",
                              userStats.avgDeposits > 2000
                                ? "bg-emerald-500 animate-pulse"
                                : "bg-muted",
                            )}
                          />
                          <span className="text-sm text-slate-900 dark:text-slate-100 font-bold">
                            Avg Deposits {">"} KES 2K
                          </span>
                        </div>
                        <span className="text-sm font-black text-emerald-600">
                          KES {userStats.avgDeposits.toLocaleString()}
                        </span>
                      </div>
                      <div className="pt-4 border-t border-white/10">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-black text-slate-950 dark:text-white">
                          Limit Logic
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-bold leading-relaxed">
                          Your limit is strictly capped at{" "}
                          <span className="text-emerald-600 font-black">50%</span> of your frequent
                          account balance (KES {userStats.medianFrequentBalance.toLocaleString()}).
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-emerald-500/10 p-4 border-t border-emerald-500/10">
                      <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-black uppercase tracking-widest">
                        <ShieldCheck className="w-4 h-4" /> Verified by Ledger Engine
                      </div>
                    </CardFooter>
                  </Card>

                  <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/20 space-y-4 backdrop-blur-sm shadow-lg">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-md">
                      <Zap className="w-5 h-5" />
                    </div>
                    <h4 className="font-black uppercase text-xs tracking-wider text-slate-950 dark:text-white">
                      Need a higher limit?
                    </h4>
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-bold leading-relaxed">
                      Increase your frequent deposits and maintain a higher median balance over 90
                      days to automatically unlock premium credit tiers.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* REPAYMENT TRACKER */}
            <TabsContent
              value="tracker"
              className="focus-visible:outline-none space-y-8 animate-in fade-in duration-500"
            >
              {activeLoan ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Active Loan Card */}
                  <Card className="md:col-span-2 rounded-[2rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl overflow-hidden shadow-2xl">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl font-black text-slate-950 dark:text-white">
                            Personal Credit Line
                          </CardTitle>
                          <CardDescription className="font-bold">
                            Active disbursement #{activeLoan.id.slice(0, 8)}
                          </CardDescription>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-black uppercase tracking-widest shadow-sm border border-emerald-500/20">
                          {activeLoan.status}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-10 py-8">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                            Original Amount
                          </span>
                          <p className="text-2xl font-black text-slate-950 dark:text-white">
                            KES {parseFloat(activeLoan.amount).toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                            Total Repaid
                          </span>
                          <p className="text-2xl font-black text-emerald-600 font-black">
                            KES {(parseFloat(activeLoan.amount) * (1 + activeLoan.interest_rate/100) - parseFloat(activeLoan.remaining_balance)).toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                            Due Date
                          </span>
                          <p className="text-2xl font-black text-destructive font-black">
                            {format(new Date(activeLoan.due_date), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm font-black">
                          <span className="text-muted-foreground uppercase tracking-widest text-[10px]">
                            Repayment Progress
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
                        <div className="h-5 w-full bg-muted/30 rounded-full overflow-hidden shadow-inner border border-white/10">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                            style={{
                              width: `${((parseFloat(activeLoan.amount) * (1 + activeLoan.interest_rate/100) - parseFloat(activeLoan.remaining_balance)) / 
                              (parseFloat(activeLoan.amount) * (1 + activeLoan.interest_rate/100))) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="p-8 border-t border-white/10 flex gap-4 bg-white/5">
                      <Button
                        className="flex-1 rounded-xl h-14 font-black text-lg shadow-xl shadow-primary/20 active:scale-95 transition-all"
                        onClick={() => setShowRepayPopup(true)}
                      >
                        Repay Amount
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 rounded-xl h-14 border-white/30 font-black text-lg hover:bg-emerald-500/10 transition-all hover:border-emerald-500/50 active:scale-95"
                        onClick={() => setActiveTab("success")}
                      >
                        Status Overview
                      </Button>
                    </CardFooter>
                  </Card>

                  {/* History Sidebar */}
                  <div className="space-y-6">
                    <Card className="rounded-[2rem] border border-white/30 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-xl">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <History className="w-5 h-5 text-muted-foreground" />
                          <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-950 dark:text-white">
                            Loan History
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {loanHistory.slice(0, 5).map((loan, i) => (
                          <div
                            key={loan.id}
                            className="flex items-center justify-between group cursor-pointer hover:bg-emerald-500/5 p-2 -mx-2 rounded-xl transition-all"
                          >
                            <div>
                              <p className="text-sm font-black text-slate-950 dark:text-white">
                                #{loan.id.slice(0, 6).toUpperCase()}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-bold">
                                {format(new Date(loan.created_at), "MMM d, yyyy")}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-slate-950 dark:text-white font-black">
                                KES {parseFloat(loan.amount).toLocaleString()}
                              </p>
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest",
                                loan.status === 'paid' ? "text-emerald-500" : "text-primary"
                              )}>
                                {loan.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <div className="p-6 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-4 shadow-lg backdrop-blur-sm">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-md border border-emerald-500/20">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                          Credit Score
                        </h4>
                        <p className="text-2xl font-black text-slate-950 dark:text-white leading-none">
                          782{" "}
                          <span className="text-[10px] text-emerald-500 font-black ml-1 uppercase">
                            Excellent
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 rounded-[1.5rem] bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-muted-foreground mb-6 shadow-inner border border-white/10">
                    <Clock className="w-10 h-10" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-950 dark:text-white mb-4 uppercase italic">No Active Loan found</h2>
                  <p className="text-muted-foreground font-bold mb-8 max-w-sm">Ready for an instant credit boost? Request your first loan today.</p>
                  <Button onClick={() => setActiveTab("request")} className="rounded-xl px-8 h-14 font-black text-lg bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20">
                    Get Instant Loan
                  </Button>
                </div>
              )}

              {/* Bottom Ledger Table Section */}
              {activeLoan && (
                <div className="mt-12 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                  <div className="flex items-center gap-2 px-2">
                    <History className="w-6 h-6 text-emerald-500" />
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
                      Detailed Repayment Ledger
                    </h3>
                  </div>
                  <Card className="rounded-[2rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/10 bg-slate-900/5 dark:bg-white/5">
                            <th className="px-6 py-4 font-black uppercase tracking-widest text-xs">Payment Date</th>
                            <th className="px-6 py-4 font-black uppercase tracking-widest text-xs">Source</th>
                            <th className="px-6 py-4 font-black uppercase tracking-widest text-xs">Method</th>
                            <th className="px-6 py-4 font-black uppercase tracking-widest text-xs">Amount Paid</th>
                            <th className="px-6 py-4 font-black uppercase tracking-widest text-xs text-emerald-600">Remaining Loan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {ledgerEntries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-emerald-500/5 transition-colors">
                              <td className="px-6 py-4 font-bold text-sm">{format(new Date(entry.created_at), "PPP, HH:mm")}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                    {entry.source.toLowerCase().includes('bank') ? <Building2 className="w-4 h-4 text-emerald-600" /> : <Smartphone className="w-4 h-4 text-emerald-600" />}
                                  </div>
                                  <span className="font-black uppercase tracking-tighter text-xs">{entry.source}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm",
                                  entry.payment_type === 'automated' ? "bg-primary/20 text-primary border border-primary/20" : "bg-slate-500/20 text-slate-500 border border-slate-500/20"
                                )}>
                                  {entry.payment_type}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-black text-slate-950 dark:text-white">KES {parseFloat(entry.amount).toLocaleString()}</td>
                              <td className="px-6 py-4 font-black text-emerald-600">KES {parseFloat(entry.remaining_balance).toLocaleString()}</td>
                            </tr>
                          ))}
                          {ledgerEntries.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-bold italic">
                                No repayment activity has been logged for this active loan.
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
              <div className="max-w-4xl mx-auto text-center py-12">
                {activeLoan ? (
                  <>
                    <div className="relative inline-block mb-8">
                      <div className="absolute inset-0 bg-destructive blur-3xl opacity-20 animate-pulse" />
                      <div className="w-32 h-32 rounded-[2.5rem] bg-white/20 backdrop-blur-xl text-destructive flex items-center justify-center shadow-2xl border border-white/30 relative z-10">
                        <AlertCircle className="w-16 h-16" />
                      </div>
                    </div>

                    <h2 className="text-5xl font-black text-slate-950 dark:text-white mb-4 tracking-tight drop-shadow-sm uppercase italic">
                      You have a pending loan left
                    </h2>
                    <p className="text-xl text-slate-900 dark:text-slate-100 font-bold mb-12 max-w-2xl mx-auto leading-relaxed">
                      You have an outstanding balance of{" "}
                      <span className="text-destructive font-black underline decoration-2 underline-offset-4">
                        KES {parseFloat(activeLoan.remaining_balance).toLocaleString()}
                      </span>
                      . Complete the loan today to increase your limit!
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                      <Card className="rounded-[2.5rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-xl p-8 shadow-xl">
                        <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-widest">
                          Outstanding Balance
                        </h4>
                        <p className="text-4xl font-black text-destructive uppercase">
                          KES {parseFloat(activeLoan.remaining_balance).toLocaleString()}
                        </p>
                      </Card>
                      <Card className="rounded-[2.5rem] border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-xl p-8 shadow-xl">
                        <Zap className="w-8 h-8 text-emerald-600 mb-4 mx-auto" />
                        <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-widest">
                          Potential Limit Boost
                        </h4>
                        <p className="text-4xl font-black text-emerald-600">+15%</p>
                      </Card>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 justify-center">
                      <Button
                        size="lg"
                        className="h-18 px-12 rounded-[1.5rem] text-xl font-black shadow-2xl shadow-primary/30 bg-primary hover:bg-primary/90 transition-all active:scale-95"
                        onClick={() => setShowRepayPopup(true)}
                      >
                        Pay Balance Now
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-18 px-12 rounded-[1.5rem] text-xl font-black border-white/40 backdrop-blur-md hover:bg-white/10 transition-all active:scale-95"
                        onClick={() => setActiveTab("tracker")}
                      >
                        View Tracker
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="relative inline-block mb-8">
                      <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 animate-pulse" />
                      <div className="w-32 h-32 rounded-[2.5rem] bg-emerald-500 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/40 relative z-10 animate-bounce">
                        <ShieldCheck className="w-16 h-16" />
                      </div>
                    </div>

                    <h2 className="text-5xl font-black text-slate-950 dark:text-white mb-4 tracking-tight drop-shadow-sm">
                      Debt-Free Milestone!
                    </h2>
                    <p className="text-xl text-slate-900 dark:text-slate-100 font-bold mb-12 max-w-2xl mx-auto leading-relaxed">
                      Congratulations! You have successfully settled your loan. Your financial
                      integrity has been verified by our algorithmic engine.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                      <Card className="rounded-[2.5rem] border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-xl p-8 shadow-xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <TrendingUp className="w-10 h-10 text-emerald-600 mb-4 mx-auto relative z-10" />
                        <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-2 relative z-10 tracking-widest">
                          Limit Increase
                        </h4>
                        <p className="text-4xl font-black text-emerald-600">+15%</p>
                      </Card>
                      <Card className="rounded-[2.5rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-xl p-8 shadow-xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Zap className="w-10 h-10 text-primary mb-4 mx-auto relative z-10" />
                        <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-2 relative z-10 tracking-widest">
                          New Credit Max
                        </h4>
                        <p className="text-4xl font-black text-slate-950 dark:text-white relative z-10">
                          KES 57.5K
                        </p>
                      </Card>
                      <Card className="rounded-[2.5rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-xl p-8 shadow-xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Check className="w-10 h-10 text-emerald-600 mb-4 mx-auto relative z-10" />
                        <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-2 relative z-10 tracking-widest">
                          Status
                        </h4>
                        <p className="text-4xl font-black text-emerald-600 relative z-10 uppercase tracking-tighter">
                          Pristine
                        </p>
                      </Card>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 justify-center">
                      <Button
                        size="lg"
                        className="h-18 px-12 rounded-[1.5rem] text-xl font-black shadow-2xl shadow-emerald-500/30 bg-emerald-600 hover:bg-emerald-700 transition-all duration-300 hover:scale-105 active:scale-95"
                        onClick={() => setActiveTab("request")}
                      >
                        New Instant Loan
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-18 px-12 rounded-[1.5rem] text-xl font-black border-white/40 backdrop-blur-md transition-all duration-300 hover:bg-white/10 active:scale-95"
                        asChild
                      >
                        <Link to="/finance-hub">Back to Hub</Link>
                      </Button>
                    </div>
                  </>
                )}

                <div className="mt-16 pt-8 border-t border-white/10 inline-block px-12">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">
                    Vault Algorithmic Trust Score: 782
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* REPAYMENT POPUP MODAL */}
      <Dialog open={showRepayPopup} onOpenChange={setShowRepayPopup}>
        <DialogContent className="max-w-md rounded-[2.5rem] border-white/30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl p-0 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="relative p-8">
            <button
              onClick={() => setShowRepayPopup(false)}
              className="absolute right-6 top-6 w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center hover:bg-muted/40 transition-colors z-20"
            >
              <X className="w-4 h-4" />
            </button>

            <DialogHeader className="mb-8">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-4 shadow-lg border border-emerald-500/20">
                <CreditCard className="w-7 h-7" />
              </div>
              <DialogTitle className="text-2xl font-black text-slate-950 dark:text-white">
                Loan Repayment
              </DialogTitle>
              <DialogDescription className="font-bold text-slate-700 dark:text-slate-300">
                Settle your outstanding balance and grow your limit.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-8">
              <div className="p-6 rounded-2xl bg-slate-900/5 dark:bg-white/5 border border-white/10 text-center">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  Total Outstanding
                </span>
                <p className="text-3xl font-black text-slate-950 dark:text-white">
                  KES {activeLoan ? parseFloat(activeLoan.remaining_balance).toLocaleString() : "0.00"}
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Where are you repaying from?
                </Label>
                <Select
                  value={repayProvider}
                  onValueChange={(val) => {
                    setRepayProvider(val);
                    setSourceIdentifier("");
                  }}
                >
                  <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-white/20 font-black">
                    <SelectValue placeholder="Select Payment Source" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-2xl backdrop-blur-xl max-h-[300px] overflow-y-auto z-[100]">
                    <SelectItem value="Vault Wallet" className="font-black text-emerald-600">
                      Vault Wallet (Auto-Deduct)
                    </SelectItem>
                    <div className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1 border-t border-white/10 mt-1">
                      <Smartphone className="w-3 h-3" /> Mobile Money
                    </div>
                    <SelectItem value="M-Pesa" className="font-bold text-slate-950 dark:text-white">
                      M-Pesa (Safaricom)
                    </SelectItem>
                    <SelectItem value="Airtel Money" className="font-bold text-slate-950 dark:text-white">
                      Airtel Money
                    </SelectItem>
                    <SelectItem value="Telkom T-Kash" className="font-bold text-slate-950 dark:text-white">
                      Telkom T-Kash
                    </SelectItem>
                    <div className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1 border-t border-white/10 mt-1">
                      <Building2 className="w-3 h-3" /> Bank Accounts
                    </div>
                    <SelectItem value="Equity Bank" className="font-bold text-slate-950 dark:text-white">
                      Equity Bank
                    </SelectItem>
                    <SelectItem value="KCB Bank" className="font-bold text-slate-950 dark:text-white">
                      KCB Bank
                    </SelectItem>
                    <SelectItem value="Co-operative Bank" className="font-bold text-slate-950 dark:text-white">
                      Co-operative Bank
                    </SelectItem>
                    <SelectItem value="Absa Bank" className="font-bold text-slate-950 dark:text-white">
                      Absa Bank
                    </SelectItem>
                    <SelectItem value="NCBA Bank" className="font-bold text-slate-950 dark:text-white">
                      NCBA Bank
                    </SelectItem>
                    <SelectItem value="Standard Chartered" className="font-bold text-slate-950 dark:text-white">
                      Standard Chartered
                    </SelectItem>
                    <SelectItem value="Stanbic Bank" className="font-bold text-slate-950 dark:text-white">
                      Stanbic Bank
                    </SelectItem>
                    <SelectItem value="I&M Bank" className="font-bold text-slate-950 dark:text-white">
                      I&M Bank
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional Identifier Input */}
              {repayProvider && repayProvider !== "Vault Wallet" && (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {repayProvider.includes("Bank")
                      ? "Enter Bank Account Number"
                      : "Enter Mobile Number"}
                  </Label>
                  <div className="relative">
                    {repayProvider.includes("Bank") ? (
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    )}
                    <Input
                      placeholder={
                        repayProvider.includes("Bank")
                          ? "e.g. 1234567890"
                          : "e.g. 0712345678"
                      }
                      value={sourceIdentifier}
                      onChange={(e) => setSourceIdentifier(e.target.value)}
                      className="h-14 pl-12 rounded-2xl bg-muted/20 border-white/20 font-black text-slate-950 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Repayment Amount (KES)
                </Label>
                <div className="relative">
                  <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    className="h-14 pl-12 rounded-2xl bg-muted/20 border-white/20 font-black text-slate-950 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 flex gap-4">
              <Button
                variant="outline"
                className="flex-1 h-14 rounded-2xl font-black border-white/20"
                onClick={() => setShowRepayPopup(false)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                className="flex-1 h-14 rounded-2xl font-black shadow-xl bg-emerald-600 hover:bg-emerald-700"
                onClick={handleRepayment}
              >
                Repay Loan <Check className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
