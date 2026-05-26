import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
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
  Check
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, addMonths } from "date-fns";

export const Route = createFileRoute("/loans")({
  component: LoansPage,
});

function LoansPage() {
  const [activeTab, setActiveTab] = useState<string>("request");
  const [loanAmount, setLoanAmount] = useState<string>("");
  const [period, setPeriod] = useState<string>("3");

  // Mock User Eligibility Data
  const userStats = {
    accountAgeYears: 7,
    avgDeposits: 2500,
    medianFrequentBalance: 50000,
    activeLoan: {
      amount: 15000,
      remaining: 8500,
      dueDate: "2026-06-15",
      totalPaid: 6500,
    }
  };

  // Eligibility Logic
  const isEligible = userStats.accountAgeYears > 6 && userStats.avgDeposits > 2000;
  const maxLimit = userStats.medianFrequentBalance * 0.5;
  const requestedAmountNum = parseFloat(loanAmount) || 0;
  const isOverLimit = requestedAmountNum > maxLimit;

  const handleRequestLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOverLimit) {
      toast.error("Limit Exceeded", {
        description: `Your maximum loan limit is KES ${maxLimit.toLocaleString()}.`,
      });
      return;
    }
    toast.success("Loan Approved!", {
      description: `KES ${requestedAmountNum.toLocaleString()} has been credited to your ledger. Disbursement Date: ${format(new Date(), 'PPP')}`,
    });
    setActiveTab("tracker");
  };

  const handleFullRepayment = () => {
    toast.success("Loan Fully Repaid!", {
      description: "Congratulations! Your credit limit has been increased by 15% due to your excellent repayment record.",
    });
    setActiveTab("success");
  };

  return (
    <AppShell>
      <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden">
        {/* Full-Bleed Background Image */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-fixed"
          style={{ 
            backgroundImage: 'url("https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=2070&auto=format&fit=crop")',
            opacity: 0.20
          }}
        />
        <div className="absolute inset-0 z-0 bg-background/10 backdrop-blur-[2px]" />

        <main className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-in fade-in duration-700">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2 drop-shadow-sm text-slate-950 dark:text-white">Instant Credit</h1>
              <p className="text-muted-foreground flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Algorithmic lending based on your ledger integrity.
              </p>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList className="grid w-full grid-cols-3 h-12 bg-white/20 dark:bg-slate-900/40 backdrop-blur-md p-1 rounded-2xl border border-white/20">
                <TabsTrigger value="request" className="rounded-xl font-bold transition-all duration-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-xs sm:text-sm">Request</TabsTrigger>
                <TabsTrigger value="tracker" className="rounded-xl font-bold transition-all duration-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-xs sm:text-sm">Tracker</TabsTrigger>
                <TabsTrigger value="success" className="rounded-xl font-bold transition-all duration-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-xs sm:text-sm">Status</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

        {/* Weekly Reminder Banner */}
        {userStats.activeLoan && activeTab !== "success" && (
          <div className="relative overflow-hidden rounded-[1.5rem] bg-destructive/10 border border-destructive/20 p-6 mb-10 flex flex-col sm:flex-row items-center justify-between gap-6 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center text-destructive group-hover:animate-bounce transition-transform">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-destructive">Weekly Outstanding Debt Alert</h3>
                <p className="text-sm text-destructive/80 font-medium leading-relaxed">
                  You have an outstanding balance of <span className="font-black">KES {userStats.activeLoan.remaining.toLocaleString()}</span>. 
                  Pay fully to increase your future limit!
                </p>
              </div>
            </div>
            <Button variant="destructive" className="rounded-xl px-8 h-12 font-black shadow-lg shadow-destructive/20 active:scale-95 transition-all" onClick={() => setActiveTab("success")}>
              Repay Now
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          {/* LOAN REQUEST FORM */}
          <TabsContent value="request" className="focus-visible:outline-none animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card className="rounded-[2.5rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl p-8 sm:p-12 shadow-2xl">
                  <form onSubmit={handleRequestLoan} className="space-y-8">
                    <div className="space-y-3">
                      <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Desired Loan Amount</Label>
                      <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-muted-foreground">KES</span>
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
                        <span className="text-xs text-muted-foreground font-bold">Max Limit: <span className="text-foreground font-black">KES {maxLimit.toLocaleString()}</span></span>
                        {isOverLimit && <span className="text-xs text-destructive font-black flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Limit Exceeded</span>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Repayment Period (Months)</Label>
                        <Select value={period} onValueChange={setPeriod}>
                          <SelectTrigger className="h-14 rounded-2xl bg-white/50 dark:bg-slate-900/40 border-white/40 font-black">
                            <SelectValue placeholder="Select period" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-white/30 bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl">
                            <SelectItem value="1" className="font-bold">1 Month (8% Interest)</SelectItem>
                            <SelectItem value="3" className="font-bold">3 Months (12% Interest)</SelectItem>
                            <SelectItem value="6" className="font-bold">6 Months (15% Interest)</SelectItem>
                            <SelectItem value="12" className="font-bold">12 Months (20% Interest)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Borrow Date</Label>
                        <div className="h-14 flex items-center px-4 rounded-2xl bg-white/30 dark:bg-slate-900/20 border border-dashed border-white/40 text-muted-foreground font-black">
                          <Calendar className="w-4 h-4 mr-2 text-emerald-500" />
                          {format(new Date(), "PPP")}
                        </div>
                      </div>
                    </div>

                    <div className="p-8 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 grid grid-cols-2 sm:grid-cols-4 gap-6">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Principal</span>
                        <p className="font-black">KES {requestedAmountNum.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Interest</span>
                        <p className="font-black text-emerald-500">+KES {(requestedAmountNum * 0.12).toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Processing</span>
                        <p className="font-black">KES 0.00</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Total Due</span>
                        <p className="font-black">KES {(requestedAmountNum * 1.12).toLocaleString()}</p>
                      </div>
                    </div>

                    <Button type="submit" disabled={!isEligible || isOverLimit || requestedAmountNum <= 0} className="w-full h-18 rounded-[1.5rem] text-xl font-black shadow-2xl shadow-emerald-500/30 bg-emerald-600 hover:bg-emerald-700 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                      Disburse Instant Loan
                    </Button>
                  </form>
                </Card>
              </div>

              {/* Eligibility Guard Sidebar */}
              <div className="space-y-6">
                <Card className="rounded-[2rem] border border-white/30 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl overflow-hidden shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-950 dark:text-white">Limit Guard™</CardTitle>
                    <CardDescription className="font-bold">Eligibility criteria & limit rules</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", userStats.accountAgeYears > 6 ? "bg-emerald-500 animate-pulse" : "bg-muted")} />
                        <span className="text-sm text-slate-900 dark:text-slate-100 font-bold">Account Age {">"} 6 Years</span>
                      </div>
                      <span className="text-sm font-black text-emerald-600">{userStats.accountAgeYears} Years</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", userStats.avgDeposits > 2000 ? "bg-emerald-500 animate-pulse" : "bg-muted")} />
                        <span className="text-sm text-slate-900 dark:text-slate-100 font-bold">Avg Deposits {">"} KES 2K</span>
                      </div>
                      <span className="text-sm font-black text-emerald-600">KES {userStats.avgDeposits.toLocaleString()}</span>
                    </div>
                    <div className="pt-4 border-t border-white/10">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-black text-slate-950 dark:text-white">Limit Logic</div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-bold leading-relaxed">
                        Your limit is strictly capped at <span className="text-emerald-600 font-black">50%</span> of your frequent account balance (KES {userStats.medianFrequentBalance.toLocaleString()}).
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
                  <h4 className="font-black uppercase text-xs tracking-wider text-slate-950 dark:text-white">Need a higher limit?</h4>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-bold leading-relaxed">
                    Increase your frequent deposits and maintain a higher median balance over 90 days to automatically unlock premium credit tiers.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* REPAYMENT TRACKER */}
          <TabsContent value="tracker" className="focus-visible:outline-none space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Active Loan Card */}
              <Card className="md:col-span-2 rounded-[2rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl overflow-hidden shadow-2xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-black text-slate-950 dark:text-white">Personal Credit Line</CardTitle>
                      <CardDescription className="font-bold">Active disbursement #L-8829</CardDescription>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-black uppercase tracking-widest shadow-sm border border-emerald-500/20">
                      Active
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-10 py-8">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Original Amount</span>
                      <p className="text-2xl font-black text-slate-950 dark:text-white">KES {userStats.activeLoan.amount.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Total Repaid</span>
                      <p className="text-2xl font-black text-emerald-600 font-black">KES {userStats.activeLoan.totalPaid.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Due Date</span>
                      <p className="text-2xl font-black text-destructive font-black">{format(new Date(userStats.activeLoan.dueDate), "MMM d")}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-black">
                      <span className="text-muted-foreground uppercase tracking-widest text-[10px]">Repayment Progress</span>
                      <span className="text-emerald-600">{((userStats.activeLoan.totalPaid / userStats.activeLoan.amount) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-5 w-full bg-muted/30 rounded-full overflow-hidden shadow-inner border border-white/10">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
                        style={{ width: `${(userStats.activeLoan.totalPaid / userStats.activeLoan.amount) * 100}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-8 border-t border-white/10 flex gap-4 bg-white/5">
                  <Button className="flex-1 rounded-xl h-14 font-black text-lg shadow-xl shadow-primary/20 active:scale-95 transition-all" onClick={() => toast.info("Partial repayment feature coming soon!")}>Repay Amount</Button>
                  <Button variant="outline" className="flex-1 rounded-xl h-14 border-white/30 font-black text-lg hover:bg-emerald-500/10 transition-all hover:border-emerald-500/50 active:scale-95" onClick={() => setActiveTab("success")}>Simulate Full Settlement</Button>
                </CardFooter>
              </Card>

              {/* History Sidebar */}
              <div className="space-y-6">
                <Card className="rounded-[2rem] border border-white/30 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-xl">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <History className="w-5 h-5 text-muted-foreground" />
                      <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-950 dark:text-white">Loan History</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {[
                      { id: "L-7721", date: "Jan 12, 2026", amount: 5000, status: "Paid" },
                      { id: "L-6610", date: "Nov 25, 2025", amount: 12000, status: "Paid" },
                      { id: "L-5501", date: "Sep 05, 2025", amount: 2500, status: "Paid" },
                    ].map((loan, i) => (
                      <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-emerald-500/5 p-2 -mx-2 rounded-xl transition-all">
                        <div>
                          <p className="text-sm font-black text-slate-950 dark:text-white">{loan.id}</p>
                          <p className="text-[10px] text-muted-foreground font-bold">{loan.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-950 dark:text-white font-black">KES {loan.amount.toLocaleString()}</p>
                          <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">{loan.status}</span>
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
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Credit Score</h4>
                    <p className="text-2xl font-black text-slate-950 dark:text-white leading-none">782 <span className="text-[10px] text-emerald-500 font-black ml-1 uppercase">Excellent</span></p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* LOAN COMPLETION / STATUS VIEW (FINAL PAGE) */}
          <TabsContent value="success" className="focus-visible:outline-none animate-in zoom-in-95 duration-500">
            <div className="max-w-4xl mx-auto text-center py-12">
              {userStats.activeLoan.remaining > 0 ? (
                <>
                  <div className="relative inline-block mb-8">
                    <div className="absolute inset-0 bg-destructive blur-3xl opacity-20 animate-pulse" />
                    <div className="w-32 h-32 rounded-[2.5rem] bg-white/20 backdrop-blur-xl text-destructive flex items-center justify-center shadow-2xl border border-white/30 relative z-10">
                      <AlertCircle className="w-16 h-16" />
                    </div>
                  </div>
                  
                  <h2 className="text-5xl font-black text-slate-950 dark:text-white mb-4 tracking-tight drop-shadow-sm uppercase italic">You have a pending loan left</h2>
                  <p className="text-xl text-slate-900 dark:text-slate-100 font-bold mb-12 max-w-2xl mx-auto leading-relaxed">
                    You have an outstanding balance of <span className="text-destructive font-black underline decoration-2 underline-offset-4">KES {userStats.activeLoan.remaining.toLocaleString()}</span>. 
                    Complete the loan today to increase your limit!
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                    <Card className="rounded-[2.5rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-xl p-8 shadow-xl">
                      <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-widest">Outstanding Balance</h4>
                      <p className="text-4xl font-black text-destructive uppercase">KES {userStats.activeLoan.remaining.toLocaleString()}</p>
                    </Card>
                    <Card className="rounded-[2.5rem] border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-xl p-8 shadow-xl">
                      <Zap className="w-8 h-8 text-emerald-600 mb-4 mx-auto" />
                      <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-widest">Potential Limit Boost</h4>
                      <p className="text-4xl font-black text-emerald-600">+15%</p>
                    </Card>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-6 justify-center">
                    <Button size="lg" className="h-18 px-12 rounded-[1.5rem] text-xl font-black shadow-2xl shadow-primary/30 bg-primary hover:bg-primary/90 transition-all active:scale-95" onClick={handleFullRepayment}>
                      Pay Balance Now
                    </Button>
                    <Button variant="outline" size="lg" className="h-18 px-12 rounded-[1.5rem] text-xl font-black border-white/40 backdrop-blur-md hover:bg-white/10 transition-all active:scale-95" onClick={() => setActiveTab("tracker")}>
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
                  
                  <h2 className="text-5xl font-black text-slate-950 dark:text-white mb-4 tracking-tight drop-shadow-sm">Debt-Free Milestone!</h2>
                  <p className="text-xl text-slate-900 dark:text-slate-100 font-bold mb-12 max-w-2xl mx-auto leading-relaxed">
                    Congratulations! You have successfully settled your loan. 
                    Your financial integrity has been verified by our algorithmic engine.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    <Card className="rounded-[2.5rem] border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-xl p-8 shadow-xl relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <TrendingUp className="w-10 h-10 text-emerald-600 mb-4 mx-auto relative z-10" />
                      <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-2 relative z-10 tracking-widest">Limit Increase</h4>
                      <p className="text-4xl font-black text-emerald-600 relative z-10">+15%</p>
                    </Card>
                    <Card className="rounded-[2.5rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-xl p-8 shadow-xl relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Zap className="w-10 h-10 text-primary mb-4 mx-auto relative z-10" />
                      <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-2 relative z-10 tracking-widest">New Credit Max</h4>
                      <p className="text-4xl font-black text-slate-950 dark:text-white relative z-10">KES 57.5K</p>
                    </Card>
                    <Card className="rounded-[2.5rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-xl p-8 shadow-xl relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Check className="w-10 h-10 text-emerald-600 mb-4 mx-auto relative z-10" />
                      <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-2 relative z-10 tracking-widest">Status</h4>
                      <p className="text-4xl font-black text-emerald-600 relative z-10 uppercase tracking-tighter">Pristine</p>
                    </Card>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-6 justify-center">
                    <Button size="lg" className="h-18 px-12 rounded-[1.5rem] text-xl font-black shadow-2xl shadow-emerald-500/30 bg-emerald-600 hover:bg-emerald-700 transition-all duration-300 hover:scale-105 active:scale-95" onClick={() => setActiveTab("request")}>
                      New Instant Loan
                    </Button>
                    <Button variant="outline" size="lg" className="h-18 px-12 rounded-[1.5rem] text-xl font-black border-white/40 backdrop-blur-md transition-all duration-300 hover:bg-white/10 active:scale-95" asChild>
                      <Link to="/finance-hub">Back to Hub</Link>
                    </Button>
                  </div>
                </>
              )}

              <div className="mt-16 pt-8 border-t border-white/10 inline-block px-12">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">Vault Algorithmic Trust Score: 782</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      </div>
    </AppShell>
  );
}

// Helper components for Select
const SelectTrigger = ({ children, className }: any) => <div className={cn("flex items-center justify-between px-4 cursor-pointer", className)}>{children}</div>;
const SelectValue = ({ placeholder }: any) => <span className="text-sm font-black">{placeholder}</span>;
const SelectContent = ({ children, className }: any) => <div className={cn("mt-2 p-2 shadow-xl", className)}>{children}</div>;
const SelectItem = ({ children, value }: any) => <div className="p-2 hover:bg-muted/40 rounded-lg cursor-pointer text-sm font-black">{children}</div>;
function Select({ children, value, onValueChange }: any) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <div onClick={() => setOpen(!open)}>{children[0]}</div>
      {open && <div className="absolute z-50 w-full" onClick={() => setOpen(false)}>{children[1]}</div>}
    </div>
  );
}
