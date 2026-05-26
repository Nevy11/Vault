import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
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
  ShieldCheck
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
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
  
  // Mock Data for Demo
  const savingsGoal = {
    title: "New MacBook Pro M4",
    target: 250000,
    current: 175000,
    deadline: "2026-12-25",
    lockUntil: "2026-12-25",
  };

  const progress = (savingsGoal.current / savingsGoal.target) * 100;
  
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

  const joke = useMemo(() => FINANCIAL_JOKES[Math.floor(Math.random() * FINANCIAL_JOKES.length)], []);

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Savings Goal Created!", {
      description: "Your funds are now being locked for your goal. 2% reward pending!",
    });
    setActiveTab("overview");
  };

  return (
    <AppShell>
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Savings Vault</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Cryptographically secured target-based savings.
            </p>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/40 p-1 rounded-2xl">
              <TabsTrigger value="overview" className="rounded-xl font-semibold">Overview</TabsTrigger>
              <TabsTrigger value="setup" className="rounded-xl font-semibold">New Goal</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          {/* OVERVIEW & PROGRESS */}
          <TabsContent value="overview" className="space-y-8 focus-visible:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Progress Card */}
              <Card className="lg:col-span-2 rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-md overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl">{savingsGoal.title}</CardTitle>
                    <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
                      {progress.toFixed(0)}% Complete
                    </div>
                  </div>
                  <CardDescription>Target: KES {savingsGoal.target.toLocaleString()}</CardDescription>
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
                        <span className="text-3xl font-bold">KES {savingsGoal.current.toLocaleString()}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mt-1">Current Saved</span>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground font-medium">Monthly Contributions</span>
                          <span className="font-bold text-primary">+15.2%</span>
                        </div>
                        <div className="h-[120px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                              <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 flex items-start gap-3">
                        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Your funds are locked until <span className="text-foreground font-semibold">{format(new Date(savingsGoal.lockUntil), "PPP")}</span>. 
                          Achieve your goal to unlock the 2% reward!
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wisdom & Jokes Card */}
              <Card className="rounded-[2rem] border-border/40 bg-primary/5 backdrop-blur-md overflow-hidden flex flex-col">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                    <Zap className="w-6 h-6" />
                  </div>
                  <CardTitle>Vault Wisdom</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-center">
                  <div className="relative p-6 rounded-2xl bg-card/60 italic text-lg leading-relaxed text-foreground shadow-inner">
                    <span className="absolute -top-4 -left-2 text-6xl text-primary/20 font-serif">"</span>
                    {joke}
                  </div>
                </CardContent>
                <div className="p-8 mt-auto border-t border-border/40">
                  <Button variant="outline" className="w-full rounded-xl border-primary/20 hover:bg-primary/5" onClick={() => window.location.reload()}>
                    Another Tip
                  </Button>
                </div>
              </Card>
            </div>

            {/* Ledger Table */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold">Savings Ledger</h3>
              <div className="rounded-[2rem] border border-border/40 bg-card/30 overflow-hidden backdrop-blur-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/20">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Source</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Running Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {[
                      { date: "May 24, 2026", source: "M-Pesa", type: "Contribution", amount: 5000, total: 175000 },
                      { date: "May 10, 2026", source: "KCB Bank", type: "Automated", amount: 10000, total: 170000 },
                      { date: "Apr 28, 2026", source: "M-Pesa", type: "Contribution", amount: 2500, total: 160000 },
                      { date: "Apr 15, 2026", source: "Airtel Money", type: "Contribution", amount: 7500, total: 157500 },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4 text-sm">{row.date}</td>
                        <td className="px-6 py-4 text-sm font-medium">{row.source}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            row.type === 'Automated' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            {row.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-emerald-500">
                          +KES {row.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-right font-medium">
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
          <TabsContent value="setup" className="focus-visible:outline-none">
            <div className="max-w-3xl mx-auto">
              <Card className="rounded-[2.5rem] border-border/40 bg-card/40 backdrop-blur-xl p-8 sm:p-12">
                <form onSubmit={handleCreateGoal} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label htmlFor="title" className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Goal Title</Label>
                      <div className="relative">
                        <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="title" placeholder="e.g. Dream House" className="h-14 pl-12 rounded-2xl bg-muted/20 border-border/40 focus:bg-muted/40 transition-all" required />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="target" className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Target Amount (KES)</Label>
                      <div className="relative">
                        <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="target" type="number" placeholder="0.00" className="h-14 pl-12 rounded-2xl bg-muted/20 border-border/40 focus:bg-muted/40 transition-all" required />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label htmlFor="start" className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Start Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="start" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} className="h-14 pl-12 rounded-2xl bg-muted/20 border-border/40 focus:bg-muted/40 transition-all" required />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="deadline" className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Deadline Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="deadline" type="date" className="h-14 pl-12 rounded-2xl bg-muted/20 border-border/40 focus:bg-muted/40 transition-all" required />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="source" className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Funding Source</Label>
                    <Select>
                      <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-border/40">
                        <SelectValue placeholder="Select Funding Account" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-border/40 bg-card/95 backdrop-blur-2xl max-h-[300px] overflow-y-auto">
                        <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mobile Money</div>
                        <SelectItem value="mpesa">M-Pesa (Safaricom)</SelectItem>
                        <SelectItem value="airtel">Airtel Money</SelectItem>
                        <div className="px-3 py-2 mt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-t border-border/20">Banks</div>
                        <SelectItem value="kcb">KCB Group</SelectItem>
                        <SelectItem value="equity">Equity Bank</SelectItem>
                        <SelectItem value="ncba">NCBA Bank</SelectItem>
                        <SelectItem value="abs">Absa Kenya</SelectItem>
                        <SelectItem value="stanchart">Standard Chartered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/10 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="font-bold">Lock Rules</h4>
                        <p className="text-xs text-muted-foreground">Cryptographically prevent early withdrawal.</p>
                      </div>
                      <Switch checked={true} disabled />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="font-bold">Automate Savings</h4>
                        <p className="text-xs text-muted-foreground">Regular daily/weekly transfers.</p>
                      </div>
                      <Switch checked={isAutomated} onCheckedChange={setIsAutomated} />
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button type="submit" className="w-full h-16 rounded-[1.5rem] text-lg font-bold shadow-2xl shadow-primary/20">
                      Initialize Savings Vault
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground mt-4 uppercase tracking-[0.2em] font-medium">
                      By initializing, you agree to the 2% reward policy.
                    </p>
                  </div>
                </form>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </AppShell>
  );
}
