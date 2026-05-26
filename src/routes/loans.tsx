import { createFileRoute } from "@tanstack/react-router";
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
  Zap
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
  const [activeTab, setActiveTab] = useState("request");
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
  };

  return (
    <AppShell>
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Instant Credit</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Algorithmic lending based on your ledger integrity.
            </p>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/40 p-1 rounded-2xl">
              <TabsTrigger value="request" className="rounded-xl font-semibold">Request Loan</TabsTrigger>
              <TabsTrigger value="tracker" className="rounded-xl font-semibold">Repayment Tracker</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Weekly Reminder Banner (Active Loan) */}
        {userStats.activeLoan && (
          <div className="relative overflow-hidden rounded-[1.5rem] bg-destructive/10 border border-destructive/20 p-6 mb-10 flex flex-col sm:flex-row items-center justify-between gap-6 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center text-destructive group-hover:animate-bounce">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-destructive">Weekly Outstanding Debt Alert</h3>
                <p className="text-sm text-destructive/80">
                  You have an outstanding balance of <span className="font-bold">KES {userStats.activeLoan.remaining.toLocaleString()}</span>. 
                  Pay fully to increase your future limit!
                </p>
              </div>
            </div>
            <Button variant="destructive" className="rounded-xl px-8 h-12 font-bold shadow-lg shadow-destructive/20">
              Repay Now
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          {/* LOAN REQUEST FORM */}
          <TabsContent value="request" className="focus-visible:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card className="rounded-[2.5rem] border-border/40 bg-card/40 backdrop-blur-xl p-8 sm:p-12">
                  <form onSubmit={handleRequestLoan} className="space-y-8">
                    <div className="space-y-3">
                      <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Desired Loan Amount</Label>
                      <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">KES</span>
                        <Input 
                          type="number" 
                          value={loanAmount}
                          onChange={(e) => setLoanAmount(e.target.value)}
                          placeholder="0.00" 
                          className="h-20 pl-24 text-3xl font-bold rounded-2xl bg-muted/20 border-border/40 focus:bg-muted/40 transition-all" 
                          required 
                        />
                      </div>
                      <div className="flex justify-between items-center px-2">
                        <span className="text-xs text-muted-foreground">Max Limit: <span className="text-foreground font-bold">KES {maxLimit.toLocaleString()}</span></span>
                        {isOverLimit && <span className="text-xs text-destructive font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Limit Exceeded</span>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Repayment Period (Months)</Label>
                        <Select value={period} onValueChange={setPeriod}>
                          <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-border/40">
                            <SelectValue placeholder="Select period" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-border/40 bg-card/95 backdrop-blur-2xl">
                            <SelectItem value="1">1 Month (8% Interest)</SelectItem>
                            <SelectItem value="3">3 Months (12% Interest)</SelectItem>
                            <SelectItem value="6">6 Months (15% Interest)</SelectItem>
                            <SelectItem value="12">12 Months (20% Interest)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Borrow Date</Label>
                        <div className="h-14 flex items-center px-4 rounded-2xl bg-muted/10 border border-dashed border-border/40 text-muted-foreground font-medium">
                          <Calendar className="w-4 h-4 mr-2" />
                          {format(new Date(), "PPP")}
                        </div>
                      </div>
                    </div>

                    <div className="p-8 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 grid grid-cols-2 sm:grid-cols-4 gap-6">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Principal</span>
                        <p className="font-bold">KES {requestedAmountNum.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Interest</span>
                        <p className="font-bold text-emerald-500">+KES {(requestedAmountNum * 0.12).toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Processing</span>
                        <p className="font-bold">KES 0.00</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Total Due</span>
                        <p className="font-bold">KES {(requestedAmountNum * 1.12).toLocaleString()}</p>
                      </div>
                    </div>

                    <Button type="submit" disabled={!isEligible || isOverLimit || requestedAmountNum <= 0} className="w-full h-16 rounded-[1.5rem] text-lg font-bold shadow-2xl shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700">
                      Disburse Instant Loan
                    </Button>
                  </form>
                </Card>
              </div>

              {/* Eligibility Guard Sidebar */}
              <div className="space-y-6">
                <Card className="rounded-[2rem] border-border/40 bg-muted/20 backdrop-blur-sm overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg">Limit Guard™</CardTitle>
                    <CardDescription>Eligibility criteria & limit rules</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", userStats.accountAgeYears > 6 ? "bg-emerald-500" : "bg-muted")} />
                        <span className="text-sm text-muted-foreground">Account Age {">"} 6 Years</span>
                      </div>
                      <span className="text-sm font-bold">{userStats.accountAgeYears} Years</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", userStats.avgDeposits > 2000 ? "bg-emerald-500" : "bg-muted")} />
                        <span className="text-sm text-muted-foreground">Avg Deposits {">"} KES 2K</span>
                      </div>
                      <span className="text-sm font-bold">KES {userStats.avgDeposits.toLocaleString()}</span>
                    </div>
                    <div className="pt-4 border-t border-border/40">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-bold">Limit Logic</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Your limit is strictly capped at <span className="text-foreground font-bold">50%</span> of your frequent account balance (KES {userStats.medianFrequentBalance.toLocaleString()}).
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-emerald-500/10 p-4 border-t border-emerald-500/10">
                    <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
                      <ShieldCheck className="w-3 h-3" /> Verified by Ledger Engine
                    </div>
                  </CardFooter>
                </Card>

                <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/10 space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold">Need a higher limit?</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Increase your frequent deposits and maintain a higher median balance over 90 days to automatically unlock premium credit tiers.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* REPAYMENT TRACKER */}
          <TabsContent value="tracker" className="focus-visible:outline-none space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Active Loan Card */}
              <Card className="md:col-span-2 rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-md overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">Personal Credit Line</CardTitle>
                      <CardDescription>Active disbursement #L-8829</CardDescription>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold uppercase tracking-widest">
                      Active
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-10 py-8">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Original Amount</span>
                      <p className="text-2xl font-bold">KES {userStats.activeLoan.amount.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Total Repaid</span>
                      <p className="text-2xl font-bold text-emerald-500">KES {userStats.activeLoan.totalPaid.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Due Date</span>
                      <p className="text-2xl font-bold text-destructive">{format(new Date(userStats.activeLoan.dueDate), "MMM d")}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-muted-foreground uppercase tracking-widest text-[10px]">Repayment Progress</span>
                      <span>{((userStats.activeLoan.totalPaid / userStats.activeLoan.amount) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-4 w-full bg-muted/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${(userStats.activeLoan.totalPaid / userStats.activeLoan.amount) * 100}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-8 border-t border-border/20 flex gap-4">
                  <Button className="flex-1 rounded-xl h-12 font-bold" onClick={() => toast.info("Partial repayment feature coming soon!")}>Repay Amount</Button>
                  <Button variant="outline" className="flex-1 rounded-xl h-12 border-border/40" onClick={handleFullRepayment}>Full Settlement</Button>
                </CardFooter>
              </Card>

              {/* History Sidebar */}
              <div className="space-y-6">
                <Card className="rounded-[2rem] border-border/40 bg-card/30 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-muted-foreground" />
                      <CardTitle className="text-lg">Loan History</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {[
                      { id: "L-7721", date: "Jan 12, 2026", amount: 5000, status: "Paid" },
                      { id: "L-6610", date: "Nov 25, 2025", amount: 12000, status: "Paid" },
                      { id: "L-5501", date: "Sep 05, 2025", amount: 2500, status: "Paid" },
                    ].map((loan, i) => (
                      <div key={i} className="flex items-center justify-between group cursor-pointer">
                        <div>
                          <p className="text-sm font-bold">{loan.id}</p>
                          <p className="text-[10px] text-muted-foreground">{loan.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">KES {loan.amount.toLocaleString()}</p>
                          <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">{loan.status}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="p-6 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest">Credit Score</h4>
                    <p className="text-xl font-bold">782 <span className="text-[10px] text-emerald-500 font-normal">EXCELLENT</span></p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </AppShell>
  );
}

// Helper components for Select
const SelectTrigger = ({ children, className }: any) => <div className={cn("flex items-center justify-between px-4 cursor-pointer", className)}>{children}</div>;
const SelectValue = ({ placeholder }: any) => <span className="text-sm">{placeholder}</span>;
const SelectContent = ({ children, className }: any) => <div className={cn("mt-2 p-2 shadow-xl", className)}>{children}</div>;
const SelectItem = ({ children, value }: any) => <div className="p-2 hover:bg-muted/40 rounded-lg cursor-pointer text-sm">{children}</div>;
function Select({ children, value, onValueChange }: any) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <div onClick={() => setOpen(!open)}>{children[0]}</div>
      {open && <div className="absolute z-50 w-full" onClick={() => setOpen(false)}>{children[1]}</div>}
    </div>
  );
}
