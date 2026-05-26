import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { 
  PiggyBank, 
  Target, 
  Calendar, 
  Lock as LockIcon, 
  Zap, 
  Wallet, 
  TrendingUp, 
  ChevronRight, 
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Info,
  ShieldCheck,
  X,
  Check,
  ArrowLeft,
  Building2,
  Smartphone,
  Trophy,
  Sparkles
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format, isBefore, startOfToday } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/savings")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as string) || "overview",
    };
  },
  component: SavingsPage,
});

const FINANCIAL_JOKES = [
  "Why did the savings account break up with the wallet? It felt like the wallet was just taking it for granted.",
  "I asked my banker for a loan to buy a giant clock. He said, 'Time is money, but not that much money.'",
  "My bank balance is currently 'Ask me again on payday.'",
  "Compound interest is the eighth wonder of the world. He who understands it, earns it... he who doesn't, pays it.",
  "A budget is telling your money where to go instead of wondering where it went."
];

function SavingsPage() {
  const { tab } = Route.useSearch();
  const [activeTab, setActiveTab] = useState(tab || "overview");
  const [isAutomated, setIsAutomated] = useState(false);
  const [showAutoPopup, setShowAutoPopup] = useState(false);
  
  // Automation state
  const [autoFreq, setAutoFreq] = useState("weekly");
  const [autoAmount, setAutoAmount] = useState("");
  const [autoProvider, setAutoProvider] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");

  // Mock Savings Data
  const savingsGoal = {
    title: "New MacBook Pro M4",
    target: 250000,
    current: 175000,
    deadline: "2026-12-25",
    lockUntil: "2026-12-25",
  };

  const progress = (savingsGoal.current / savingsGoal.target) * 100;
  const rewardAmount = savingsGoal.target * 0.02;
  
  const chartData = [
    { name: "Saved", value: savingsGoal.current, color: "var(--primary)" },
    { name: "Remaining", value: savingsGoal.target - savingsGoal.current, color: "hsl(var(--muted))" },
  ];

  const barData = [
    { month: "Jan", amount: 12000 },
    { month: "Feb", amount: 15000 },
    { month: "Mar", amount: 18000 },
    { month: "Apr", amount: 22000 },
    { month: "May", amount: 25000 },
  ];

  const [jokeIndex, setJokeIndex] = useState(0);
  const joke = useMemo(() => FINANCIAL_JOKES[jokeIndex], [jokeIndex]);

  const nextJoke = () => {
    setJokeIndex((prev) => (prev + 1) % FINANCIAL_JOKES.length);
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Savings Goal Created!", {
      description: "Your funds are now being locked for your goal. 2% reward pending!",
    });
    setActiveTab("overview");
  };

  const handleAutoToggle = (checked: boolean) => {
    if (checked) {
      setShowAutoPopup(true);
    } else {
      setIsAutomated(false);
    }
  };

  const confirmAutomation = () => {
    if (!autoAmount || !autoProvider) {
      toast.error("Incomplete Settings", { description: "Please provide amount and financial provider." });
      return;
    }
    setIsAutomated(true);
    setShowAutoPopup(false);
    toast.success("Automation Configured", {
      description: `KES ${autoAmount} will be deducted ${autoFreq} via ${autoProvider}.`
    });
  };

  const handleReceiveReward = () => {
    toast.success("Reward Received!", {
      description: `KES ${rewardAmount.toLocaleString()} has been added to your Vault account.`,
      icon: <Sparkles className="w-5 h-5 text-emerald-500" />
    });
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2 drop-shadow-sm text-slate-950 dark:text-white">Savings Vault</h1>
              <p className="text-muted-foreground flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Cryptographically secured target-based savings.
              </p>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList className="grid w-full grid-cols-3 h-12 bg-white/20 dark:bg-slate-900/40 backdrop-blur-md p-1 rounded-2xl border border-white/20">
                <TabsTrigger value="overview" className="rounded-xl font-bold transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">Overview</TabsTrigger>
                <TabsTrigger value="setup" className="rounded-xl font-bold transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">New Goal</TabsTrigger>
                <TabsTrigger value="congrats" className="rounded-xl font-bold transition-all duration-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-xs">🎉 Completion</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            {/* OVERVIEW & PROGRESS */}
            <TabsContent value="overview" className="space-y-8 focus-visible:outline-none animate-in fade-in duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Progress Card */}
                <Card className="lg:col-span-2 rounded-[2rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl overflow-hidden shadow-2xl">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-2xl font-black text-slate-950 dark:text-white">{savingsGoal.title}</CardTitle>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="rounded-full h-8 text-[10px] font-black uppercase border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10" onClick={() => setActiveTab("congrats")}>Simulate Hit</Button>
                        <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest flex items-center">
                          {progress.toFixed(0)}% Complete
                        </div>
                      </div>
                    </div>
                    <CardDescription className="font-bold text-slate-700 dark:text-slate-300">Target: KES {savingsGoal.target.toLocaleString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-6">
                      <div className="h-[250px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={70}
                              outerRadius={90}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-3xl font-black text-slate-950 dark:text-white">KES {savingsGoal.current.toLocaleString()}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mt-1 font-black">Current Saved</span>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-900 dark:text-slate-100 font-black uppercase tracking-tight">Monthly Contributions</span>
                            <span className="font-black text-primary">+15.2%</span>
                          </div>
                          <div className="h-[120px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={barData}>
                                <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3">
                          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-slate-900 dark:text-slate-100 font-bold leading-relaxed">
                            Your funds are locked until <span className="text-primary font-black">{format(new Date(savingsGoal.lockUntil), "PPP")}</span>. 
                            Achieve your goal to unlock the 2% reward!
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Wisdom & Jokes Card */}
                <Card className="rounded-[2rem] border border-white/30 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl overflow-hidden flex flex-col shadow-xl">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 border border-primary/20 shadow-lg">
                      <Zap className="w-6 h-6" />
                    </div>
                    <CardTitle className="font-black text-slate-950 dark:text-white uppercase tracking-tight">Vault Wisdom</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-center">
                    <div className="relative p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 italic text-lg leading-relaxed text-slate-900 dark:text-slate-100 shadow-inner font-bold border border-white/20">
                      <span className="absolute -top-4 -left-2 text-6xl text-primary/20 font-serif">"</span>
                      {joke}
                    </div>
                  </CardContent>
                  <div className="p-8 mt-auto border-t border-white/20">
                    <Button variant="outline" className="w-full rounded-xl border-primary/30 font-black hover:bg-primary/5 transition-all" onClick={nextJoke}>
                      Another Tip
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Ledger Table */}
              <div className="space-y-4">
                <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Savings Ledger</h3>
                <div className="rounded-[2.5rem] border border-white/30 bg-white/80 dark:bg-slate-950/80 overflow-hidden backdrop-blur-2xl shadow-2xl">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/20 bg-primary/5">
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">Date</th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">Source</th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">Type</th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">Amount</th>
                        <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white text-right">Running Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 font-bold text-slate-900 dark:text-slate-100">
                      {[
                        { date: "May 24, 2026", source: "M-Pesa", type: "Contribution", amount: 5000, total: 175000 },
                        { date: "May 10, 2026", source: "KCB Bank", type: "Automated", amount: 10000, total: 170000 },
                        { date: "Apr 28, 2026", source: "M-Pesa", type: "Contribution", amount: 2500, total: 160000 },
                        { date: "Apr 15, 2026", source: "Airtel Money", type: "Contribution", amount: 7500, total: 157500 },
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-primary/5 transition-colors">
                          <td className="px-6 py-4 text-sm">{row.date}</td>
                          <td className="px-6 py-4 text-sm">{row.source}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm",
                              row.type === 'Automated' ? "bg-primary text-primary-foreground" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            )}>
                              {row.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-emerald-600 dark:text-emerald-400">
                            +KES {row.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-right font-black">
                            KES {row.total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* SETUP FORM */}
            <TabsContent value="setup" className="focus-visible:outline-none animate-in slide-in-from-bottom-4 duration-500">
              <div className="max-w-3xl mx-auto">
                <Card className="rounded-[2.5rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl p-8 sm:p-12 shadow-2xl overflow-hidden relative group transition-all duration-500">
                  <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors duration-1000" />
                  
                  <form onSubmit={handleCreateGoal} className="space-y-8 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="title" className="text-sm font-black uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-400">Goal Title</Label>
                          <span className="text-[10px] text-muted-foreground font-black animate-pulse bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10 shadow-sm">💡 ideas: Tech, Home</span>
                        </div>
                        <div className="relative">
                          <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                          <Input id="title" placeholder="Saving for..." className="h-14 pl-12 rounded-2xl bg-white/50 dark:bg-slate-900/40 border-white/40 font-black text-lg" required />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="target" className="text-sm font-black uppercase tracking-[0.1em]">Target (KES)</Label>
                        <div className="relative">
                          <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="target" type="number" placeholder="0.00" className="h-14 pl-12 rounded-2xl bg-white/50 dark:bg-slate-900/40 border-white/40 font-black" required />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label htmlFor="start" className="text-sm font-black uppercase tracking-[0.1em]">Start Date (Today+)</Label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="start" type="date" min={today} defaultValue={today} className="h-14 pl-12 rounded-2xl bg-white/50 dark:bg-slate-900/40 border-white/40 font-black" required />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="deadline" className="text-sm font-black uppercase tracking-[0.1em]">Deadline Date</Label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="deadline" type="date" min={today} className="h-14 pl-12 rounded-2xl bg-white/50 dark:bg-slate-900/40 border-white/40 font-black" required />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="source" className="text-sm font-black uppercase tracking-[0.1em]">Funding Source</Label>
                      <Select>
                        <SelectTrigger className="h-14 rounded-2xl bg-white/50 dark:bg-slate-900/40 border-white/40 font-black">
                          <SelectValue placeholder="Select Source" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-white/30 bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl max-h-[400px] overflow-y-auto">
                          <SelectItem value="any" className="font-black text-emerald-600 dark:text-emerald-400">Any Available Source</SelectItem>
                          <div className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase border-t border-white/10 mt-1">Categories</div>
                          <SelectItem value="any_mobile" className="font-black text-primary">Any Mobile Money</SelectItem>
                          <SelectItem value="any_bank" className="font-black text-primary">Any Bank Account</SelectItem>
                          <div className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase border-t border-white/10 mt-1">Specifics</div>
                          <SelectItem value="mpesa" className="font-bold">M-Pesa (Safaricom)</SelectItem>
                          <SelectItem value="airtel" className="font-bold">Airtel Money</SelectItem>
                          <SelectItem value="kcb" className="font-bold">KCB Group</SelectItem>
                          <SelectItem value="equity" className="font-bold">Equity Bank</SelectItem>
                          <SelectItem value="ncba" className="font-bold">NCBA Bank</SelectItem>
                          <SelectItem value="absa" className="font-bold">Absa Kenya</SelectItem>
                          <SelectItem value="coop" className="font-bold">Co-operative Bank</SelectItem>
                          <SelectItem value="stanbic" className="font-bold">Stanbic Bank</SelectItem>
                          <SelectItem value="im" className="font-bold">I&M Bank</SelectItem>
                          <SelectItem value="dtb" className="font-bold">Diamond Trust Bank</SelectItem>
                          <SelectItem value="family" className="font-bold">Family Bank Kenya</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="p-8 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 space-y-6 backdrop-blur-sm shadow-inner">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-black text-emerald-900 dark:text-emerald-300">Lock Rules</h4>
                          <p className="text-xs text-muted-foreground font-medium">Funds are inaccessible until target date.</p>
                        </div>
                        <Switch checked={true} disabled className="scale-125 data-[state=checked]:bg-emerald-500" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-black">Automate Savings</h4>
                          <p className="text-xs text-muted-foreground font-medium">Configure scheduled deductions.</p>
                        </div>
                        <Switch checked={isAutomated} onCheckedChange={handleAutoToggle} className="scale-125 data-[state=checked]:bg-primary" />
                      </div>
                    </div>

                    <Button type="submit" className="w-full h-18 rounded-[1.5rem] text-xl font-black bg-gradient-to-r from-emerald-600 via-primary to-emerald-600">
                      Initialize Savings Vault
                    </Button>
                  </form>
                </Card>
              </div>
            </TabsContent>

            {/* COMPLETION / STATUS VIEW */}
            <TabsContent value="congrats" className="focus-visible:outline-none animate-in zoom-in-95 duration-500">
              <div className="max-w-4xl mx-auto text-center py-12">
                {savingsGoal.current < savingsGoal.target ? (
                  <>
                    <div className="relative inline-block mb-8">
                      <div className="absolute inset-0 bg-primary blur-3xl opacity-20 animate-pulse" />
                      <div className="w-32 h-32 rounded-[2.5rem] bg-white/20 backdrop-blur-xl text-primary flex items-center justify-center shadow-2xl border border-white/30 relative z-10">
                        <Target className="w-16 h-16" />
                      </div>
                    </div>
                    
                    <h2 className="text-5xl font-black text-slate-950 dark:text-white mb-4 tracking-tight drop-shadow-sm">You have a pending saving left</h2>
                    <p className="text-xl text-slate-900 dark:text-slate-100 font-bold mb-12 max-w-2xl mx-auto leading-relaxed">
                      You are KES <span className="text-primary">{(savingsGoal.target - savingsGoal.current).toLocaleString()}</span> away from your goal. 
                      Complete it to receive the rewards.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                      <Card className="rounded-[2.5rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-xl p-8 shadow-xl">
                        <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-widest">Left Amount</h4>
                        <p className="text-4xl font-black text-slate-950 dark:text-white uppercase">KES {(savingsGoal.target - savingsGoal.current).toLocaleString()}</p>
                      </Card>
                      <Card className="rounded-[2.5rem] border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-xl p-8 shadow-xl">
                        <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-widest">Pending Reward</h4>
                        <p className="text-4xl font-black text-emerald-600">KES {rewardAmount.toLocaleString()}</p>
                      </Card>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 justify-center">
                      <Button size="lg" className="h-18 px-12 rounded-[1.5rem] text-xl font-black shadow-2xl shadow-primary/30 bg-primary hover:bg-primary/90 transition-all" onClick={() => setActiveTab("overview")}>
                        Go to Overview
                      </Button>
                      <Button variant="outline" size="lg" className="h-18 px-12 rounded-[1.5rem] text-xl font-black border-white/40 backdrop-blur-md" onClick={() => setActiveTab("setup")}>
                        Adjust Goal
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="relative inline-block mb-8">
                      <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 animate-pulse" />
                      <div className="w-32 h-32 rounded-[2.5rem] bg-emerald-500 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/40 relative z-10 animate-bounce">
                        <Trophy className="w-16 h-16" />
                      </div>
                    </div>
                    
                    <h2 className="text-5xl font-black text-slate-950 dark:text-white mb-4 tracking-tight drop-shadow-sm">Goal Achieved!</h2>
                    <p className="text-xl text-slate-900 dark:text-slate-100 font-bold mb-12 max-w-2xl mx-auto leading-relaxed">
                      Congratulations! You have successfully completed your savings goal: <span className="text-emerald-600">"{savingsGoal.title}"</span>. 
                      Your discipline has earned you a special reward.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                      <Card className="rounded-[2.5rem] border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-xl p-8 shadow-xl relative overflow-hidden group">
                        <Sparkles className="w-10 h-10 text-emerald-600 mb-4 mx-auto relative z-10" />
                        <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-2 relative z-10 tracking-widest">2% Interest Reward</h4>
                        <p className="text-4xl font-black text-emerald-600 relative z-10">KES {rewardAmount.toLocaleString()}</p>
                      </Card>
                      <Card className="rounded-[2.5rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-xl p-8 shadow-xl">
                        <PiggyBank className="w-10 h-10 text-primary mb-4 mx-auto" />
                        <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-widest">Total Value</h4>
                        <p className="text-4xl font-black text-slate-950 dark:text-white">KES {(savingsGoal.target + rewardAmount).toLocaleString()}</p>
                      </Card>
                    </div>

                    <div className="space-y-8">
                      <div className="flex flex-col sm:flex-row gap-6 justify-center">
                        <Button size="lg" className="h-18 px-12 rounded-[1.5rem] text-xl font-black shadow-2xl shadow-emerald-500/30 bg-emerald-600 hover:bg-emerald-700 transition-all duration-300 hover:scale-105 active:scale-95" onClick={handleReceiveReward}>
                          Receive Reward
                        </Button>
                        <Button variant="outline" size="lg" className="h-18 px-12 rounded-[1.5rem] text-xl font-black border-white/40 backdrop-blur-md transition-all duration-300 hover:bg-white/10" onClick={() => setActiveTab("setup")}>
                          Start New Goal
                        </Button>
                      </div>
                    </div>
                  </>
                )}
                
                <div className="mt-16 pt-8 border-t border-white/10 inline-block px-12">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">Vault Automated Growth Engine</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* AUTOMATION POPUP MODAL */}
      <Dialog open={showAutoPopup} onOpenChange={(open) => {
        if (!open && !isAutomated) setShowAutoPopup(false);
      }}>
        <DialogContent className="max-w-md rounded-[2.5rem] border-white/30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl p-0 overflow-hidden shadow-2xl">
          <div className="relative p-8">
            <button onClick={() => setShowAutoPopup(false)} className="absolute right-6 top-6 w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center hover:bg-muted/40 transition-colors">
              <X className="w-4 h-4" />
            </button>

            <DialogHeader className="mb-8">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 shadow-lg">
                <Zap className="w-7 h-7" />
              </div>
              <DialogTitle className="text-2xl font-black text-slate-950 dark:text-white">Automation Engine</DialogTitle>
              <DialogDescription className="font-bold text-slate-700 dark:text-slate-300">Configure your scheduled savings schedule.</DialogDescription>
            </DialogHeader>

            <div className="space-y-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Frequency</Label>
                <RadioGroup value={autoFreq} onValueChange={setAutoFreq} className="grid grid-cols-2 gap-4">
                  {['daily', 'weekly', 'monthly', 'yearly'].map((freq) => (
                    <div key={freq} className={cn(
                      "relative rounded-xl border border-white/20 p-4 cursor-pointer transition-all",
                      autoFreq === freq ? "bg-primary text-primary-foreground border-primary shadow-lg scale-[1.02]" : "bg-muted/10 hover:bg-muted/20"
                    )} onClick={() => setAutoFreq(freq)}>
                      <RadioGroupItem value={freq} id={freq} className="sr-only" />
                      <Label htmlFor={freq} className="capitalize font-black text-sm cursor-pointer">{freq}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Deduction Amount (KES)</Label>
                <div className="relative">
                  <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={autoAmount}
                    onChange={(e) => setAutoAmount(e.target.value)}
                    className="h-14 pl-12 rounded-2xl bg-muted/20 border-white/20 font-black" 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Financial Provider</Label>
                <Select value={autoProvider} onValueChange={setAutoProvider}>
                  <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-white/20 font-black">
                    <SelectValue placeholder="Which provider?" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-2xl backdrop-blur-xl max-h-[300px] overflow-y-auto">
                    <SelectItem value="any" className="font-black text-emerald-600 dark:text-emerald-400">Any Available Source</SelectItem>
                    <div className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1 border-t border-white/10 mt-1"><Smartphone className="w-3 h-3"/> Mobile</div>
                    <SelectItem value="mpesa" className="font-bold">M-Pesa (Safaricom)</SelectItem>
                    <SelectItem value="airtel" className="font-bold">Airtel Money</SelectItem>
                    <div className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1 border-t border-white/10 mt-1"><Building2 className="w-3 h-3"/> Banks</div>
                    <SelectItem value="kcb" className="font-bold">KCB Group</SelectItem>
                    <SelectItem value="equity" className="font-bold">Equity Bank</SelectItem>
                    <SelectItem value="ncba" className="font-bold">NCBA Bank</SelectItem>
                    <SelectItem value="absa" className="font-bold">Absa Kenya</SelectItem>
                    <SelectItem value="coop" className="font-bold">Co-operative Bank</SelectItem>
                    <SelectItem value="stanbic" className="font-bold">Stanbic Bank</SelectItem>
                    <SelectItem value="im" className="font-bold">I&M Bank</SelectItem>
                    <SelectItem value="dtb" className="font-bold">Diamond Trust Bank</SelectItem>
                    <SelectItem value="family" className="font-bold">Family Bank Kenya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-10 flex gap-4">
              <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black border-white/20" onClick={() => setShowAutoPopup(false)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button className="flex-1 h-14 rounded-2xl font-black shadow-xl" onClick={confirmAutomation}>
                Confirm OK <Check className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
