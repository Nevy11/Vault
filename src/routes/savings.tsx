import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/api/supabase";
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
  Sparkles,
  Plus,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format, isBefore, startOfToday } from "date-fns";
import { cn, formatWithCommas, parseFormattedNumber } from "@/lib/utils";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
  Defs,
  LinearGradient,
  Stop,
} from "recharts";

import { useSavings } from "@/hooks/use-savings";

export const Route = createFileRoute("/savings")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: search.tab as string | undefined,
    };
  },
  component: SavingsPage,
});

const FINANCIAL_JOKES = [
  "Why did the savings account break up with the wallet? It felt like the wallet was just taking it for granted.",
  "I asked my banker for a loan to buy a giant clock. He said, 'Time is money, but not that much money.'",
  "My bank balance is currently 'Ask me again on payday.'",
  "Compound interest is the eighth wonder of the world. He who understands it, earns it... he who doesn't, pays it.",
  "A budget is telling your money where to go instead of wondering where it went.",
];

const SAVING_LINES = [
  "Small drops make a mighty ocean. Start savings today!",
  "A penny saved is a penny earned. Watch your wealth grow!",
  "Your future self will thank you for the discipline you show now.",
  "Financial freedom starts with a single coin in the vault.",
  "Locking away a little now opens big doors later.",
];

function SavingsPage() {
  const { tab } = Route.useSearch();
  const [activeTab, setActiveTab] = useState("overview");

  const {
    goals,
    goal: savingsGoal,
    selectedGoalIndex,
    setSelectedGoalIndex,
    ledger,
    loading,
    addContribution,
    createGoal,
    updateGoal,
  } = useSavings();

  const [isEditing, setIsEditing] = useState(false);

  const [isAutomated, setIsAutomated] = useState(false);
  const [showAutoPopup, setShowAutoPopup] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [contribAmount, setContribAmount] = useState("");
  const [contribSource, setContribSource] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [goalTitle, setGoalTitle] = useState("");

  // Automation state
  const [autoFreq, setAutoFreq] = useState("weekly");
  const [autoAmount, setAutoAmount] = useState("");
  const [autoProvider, setAutoProvider] = useState("");

  const [goalSource, setGoalSource] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    } else if (goals.length === 0) {
      // Default to setup if no goals exist
      setActiveTab("setup");
    } else {
      // Default to overview if goals exist
      setActiveTab("overview");
    }
  }, [tab, goals.length]);

  useEffect(() => {
    if (activeTab === "setup" && isEditing && savingsGoal) {
      setGoalTitle(savingsGoal.title || "");
      setGoalSource(savingsGoal.funding_source || "");
      setTargetAmount(formatWithCommas(savingsGoal.target_amount));
      setIsAutomated(savingsGoal.is_automated || false);
      if (savingsGoal.is_automated) {
        setAutoFreq(savingsGoal.automation_frequency || "weekly");
        setAutoAmount(formatWithCommas(savingsGoal.automation_amount || ""));
        setAutoProvider(savingsGoal.automation_provider || "");
      }
    } else if (activeTab === "setup" && !isEditing) {
      // Clear form for new goal
      setGoalTitle("");
      setGoalSource("");
      setTargetAmount("");
      setIsAutomated(false);
      setAutoFreq("weekly");
      setAutoAmount("");
      setAutoProvider("");
    }
  }, [activeTab, isEditing, savingsGoal]);

  const progress = savingsGoal ? (savingsGoal.current_amount / savingsGoal.target_amount) * 100 : 0;
  const rewardAmount = savingsGoal ? savingsGoal.target_amount * 0.02 : 0;

  const chartData = savingsGoal
    ? [
        { name: "Saved", value: Number(savingsGoal.current_amount), color: "var(--primary)" },
        {
          name: "Remaining",
          value: Math.max(
            0,
            Number(savingsGoal.target_amount) - Number(savingsGoal.current_amount),
          ),
          color: "hsl(var(--muted))",
        },
      ]
    : [];

  const barData = useMemo(() => {
    if (!ledger.length) return [];

    // Group by month
    const months: Record<string, number> = {};
    [...ledger].reverse().forEach((entry) => {
      const month = format(new Date(entry.created_at), "MMM");
      months[month] = (months[month] || 0) + Number(entry.amount);
    });

    return Object.entries(months).map(([month, amount]) => ({ month, amount }));
  }, [ledger]);

  const [jokeIndex, setJokeIndex] = useState(0);
  const joke = useMemo(() => FINANCIAL_JOKES[jokeIndex], [jokeIndex]);

  const [lineIndex, setLineIndex] = useState(0);
  const savingLine = useMemo(() => SAVING_LINES[lineIndex], [lineIndex]);

  useEffect(() => {
    if (showContributionModal) {
      setLineIndex(Math.floor(Math.random() * SAVING_LINES.length));
    }
  }, [showContributionModal]);

  const nextJoke = () => {
    setJokeIndex((prev) => (prev + 1) % FINANCIAL_JOKES.length);
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();

    const goalData = {
      title: goalTitle,
      target_amount: parseFormattedNumber(targetAmount),
      start_date: (e.target as any).start.value,
      deadline_date: (e.target as any).deadline.value,
      funding_source: goalSource,
      is_automated: isAutomated,
      automation_frequency: isAutomated ? autoFreq : null,
      automation_amount: isAutomated ? parseFormattedNumber(autoAmount) : null,
      automation_provider: isAutomated ? autoProvider : null,
    };

    let success = false;
    if (isEditing && savingsGoal?.id) {
      // Update existing goal
      success = await updateGoal(savingsGoal.id, goalData);
    } else {
      // Create new goal
      success = await createGoal(goalData);
    }

    if (success) {
      setActiveTab("overview");
    }
  };

  const handleRestrictedFieldClick = (fieldName: string) => {
    if (isEditing && savingsGoal) {
      toast.info(`${fieldName} is fixed`, {
        description: "This field cannot be changed once the goal is active.",
      });
    }
  };

  const handleAddContribution = async () => {
    if (!contribAmount || !contribSource) {
      toast.error("Please fill in all fields");
      return;
    }
    await addContribution(parseFormattedNumber(contribAmount), contribSource, "manual");
    setShowContributionModal(false);
    setContribAmount("");
    setContribSource("");
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
      toast.error("Incomplete Settings", {
        description: "Please provide amount and financial provider.",
      });
      return;
    }
    setIsAutomated(true);
    setShowAutoPopup(false);
    toast.success("Automation Configured", {
      description: `KES ${autoAmount} will be deducted ${autoFreq} via ${autoProvider}.`,
    });
  };

  const handleReceiveReward = () => {
    toast.success("Reward Received!", {
      description: `KES ${rewardAmount.toLocaleString()} has been added to your Vault account.`,
      icon: <Sparkles className="w-5 h-5 text-emerald-500" />,
    });
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2 drop-shadow-sm text-slate-950 dark:text-white">
                Savings Vault
              </h1>
              <p className="text-muted-foreground flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Cryptographically secured target-based savings.
              </p>
            </div>
            <Tabs
              value={activeTab}
              onValueChange={(val) => {
                setActiveTab(val);
                if (val === "setup") setIsEditing(false);
              }}
              className="w-full md:w-auto"
            >
              <TabsList className="grid w-full grid-cols-3 h-12 bg-white/20 dark:bg-slate-900/40 backdrop-blur-md p-1 rounded-2xl border border-white/20">
                <TabsTrigger
                  value="overview"
                  className="rounded-xl font-bold transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="setup"
                  className="rounded-xl font-bold transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
                >
                  New Goal
                </TabsTrigger>
                <TabsTrigger
                  value="congrats"
                  className="rounded-xl font-bold transition-all duration-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-xs"
                >
                  🎉 Completion
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            {/* OVERVIEW & PROGRESS */}
            <TabsContent
              value="overview"
              className="space-y-8 focus-visible:outline-none animate-in fade-in duration-500"
            >
              {/* Goal Switcher Bar */}
              {goals.length > 0 && (
                <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 shadow-xl overflow-x-auto no-scrollbar">
                  <div className="flex items-center gap-2 px-4 border-r border-white/20 shrink-0">
                    <Target className="w-5 h-5 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      My Goals
                    </span>
                  </div>
                  <div className="flex gap-3">
                    {goals.map((g, index) => (
                      <Button
                        key={g.id}
                        variant={selectedGoalIndex === index ? "default" : "outline"}
                        className={cn(
                          "h-12 rounded-2xl font-bold transition-all duration-500",
                          selectedGoalIndex === index
                            ? "px-6 bg-primary text-primary-foreground shadow-2xl scale-105 border-none"
                            : "w-12 p-0 bg-white/50 dark:bg-slate-800/50 border-white/10 hover:bg-primary/10 text-slate-700 dark:text-slate-300",
                        )}
                        onClick={() => {
                          setSelectedGoalIndex(index);
                          setActiveTab("overview");
                        }}
                      >
                        {selectedGoalIndex === index ? (
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-white/20 flex items-center justify-center text-[10px]">
                              {index + 1}
                            </span>
                            {g.title}
                          </div>
                        ) : (
                          index + 1
                        )}
                      </Button>
                    ))}
                    {goals.length < 2 && (
                      <Button
                        variant="outline"
                        className="h-12 px-4 rounded-2xl border-dashed border-primary/40 text-primary hover:bg-primary/10 hover:border-primary shrink-0 font-bold flex items-center transition-all duration-300"
                        onClick={() => {
                          setIsEditing(false);
                          setActiveTab("setup");
                        }}
                      >
                        <span className="mr-2">{goals.length + 1}</span>
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Progress Card */}
                <Card className="lg:col-span-2 rounded-2xl border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl overflow-hidden shadow-2xl">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-slate-950 dark:text-white">
                          {savingsGoal?.title || "Savings Goal"}
                        </CardTitle>
                      </div>

                      <div className="flex gap-2">
                        <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest flex items-center">
                          {progress.toFixed(0)}% Complete
                        </div>
                      </div>
                    </div>
                    <CardDescription className="font-bold text-slate-700 dark:text-slate-300">
                      Target: KES {savingsGoal?.target_amount?.toLocaleString() || "0"}
                    </CardDescription>
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
                          <span className="text-3xl font-bold text-slate-950 dark:text-white">
                            KES {savingsGoal?.current_amount?.toLocaleString() || "0"}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mt-1 font-bold">
                            Current Saved
                          </span>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <div className="text-sm text-center">
                            <span className="text-slate-900 dark:text-slate-100 font-bold uppercase tracking-tight">
                              Monthly Contributions
                            </span>
                          </div>
                          <div className="h-[120px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={barData}>
                                <defs>
                                  <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop
                                      offset="5%"
                                      stopColor="var(--primary)"
                                      stopOpacity={0.3}
                                    />
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                                    borderRadius: "12px",
                                    border: "none",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                    fontWeight: "bold",
                                  }}
                                  labelStyle={{ color: "var(--primary)" }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="amount"
                                  stroke="var(--primary)"
                                  strokeWidth={4}
                                  dot={{
                                    r: 4,
                                    fill: "var(--primary)",
                                    strokeWidth: 2,
                                    stroke: "#fff",
                                  }}
                                  activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3">
                          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-slate-900 dark:text-slate-100 font-bold leading-relaxed">
                            Your funds are locked until{" "}
                            <span className="text-primary font-bold">
                              {savingsGoal?.lockUntil
                                ? format(new Date(savingsGoal.lockUntil), "PPP")
                                : "N/A"}
                            </span>
                            . Achieve your goal to unlock the 2% reward!
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 pb-8 px-8 flex gap-4">
                    <Button
                      className="flex-1 h-14 rounded-2xl text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                      onClick={() => setShowContributionModal(true)}
                    >
                      <PiggyBank className="w-5 h-5 mr-2" />
                      Add Savings
                    </Button>
                    <Button
                      variant="outline"
                      className="px-6 h-14 rounded-2xl font-bold border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/5 transition-all duration-300"
                      onClick={() => setActiveTab("congrats")}
                    >
                      Simulate Hit
                    </Button>
                  </CardFooter>
                </Card>

                {/* Wisdom & Jokes Card */}
                <Card className="rounded-2xl border border-white/30 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl overflow-hidden flex flex-col shadow-xl">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 border border-primary/20 shadow-lg">
                      <Zap className="w-6 h-6" />
                    </div>
                    <CardTitle className="font-bold text-slate-950 dark:text-white uppercase tracking-tight">
                      Vault Wisdom
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-center">
                    <div className="relative p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 italic text-lg leading-relaxed text-slate-900 dark:text-slate-100 shadow-inner font-bold border border-white/20">
                      <span className="absolute -top-4 -left-2 text-6xl text-primary/20 font-serif">
                        "
                      </span>
                      {joke}
                    </div>
                  </CardContent>
                  <div className="p-8 mt-auto border-t border-white/20">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-primary/30 font-bold hover:bg-primary/5 transition-all"
                      onClick={nextJoke}
                    >
                      Another Tip
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Ledger Table */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-950 dark:text-white uppercase tracking-tight">
                  Savings Ledger
                </h3>
                <div className="rounded-2xl border border-white/30 bg-white/80 dark:bg-slate-950/80 overflow-hidden backdrop-blur-2xl shadow-2xl">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/20 bg-primary/5">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-950 dark:text-white">
                          Date
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-950 dark:text-white">
                          Source
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-950 dark:text-white">
                          Type
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-950 dark:text-white">
                          Amount
                        </th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-950 dark:text-white text-right">
                          Running Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 font-bold text-slate-900 dark:text-slate-100">
                      {ledger.length > 0 ? (
                        ledger.map((row) => (
                          <tr key={row.id} className="hover:bg-primary/5 transition-colors">
                            <td className="px-6 py-4 text-sm">
                              {format(new Date(row.created_at), "MMM dd, yyyy")}
                            </td>
                            <td className="px-6 py-4 text-sm capitalize">{row.source}</td>
                            <td className="px-6 py-4">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm",
                                  row.type === "automated"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
                                )}
                              >
                                {row.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              +KES {Number(row.amount).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-sm font-mono text-right font-bold">
                              KES {Number(row.running_total).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-6 py-12 text-center text-muted-foreground font-medium"
                          >
                            No contributions recorded yet. Start saving to see your ledger!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* SETUP FORM */}
            <TabsContent
              value="setup"
              className="focus-visible:outline-none animate-in slide-in-from-bottom-4 duration-500"
            >
              <div className="max-w-3xl mx-auto">
                <Card className="rounded-2xl border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl p-5 shadow-xl transition-all">
                  <form onSubmit={handleCreateGoal} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-semibold uppercase tracking-wider">Title</Label>
                        <div className="relative">
                          <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-600" />
                          <Input placeholder="Saving for..." value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} className="h-10 pl-10 rounded-xl bg-white/40 dark:bg-slate-900/40 border-white/10 font-bold text-sm" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-semibold uppercase tracking-wider">Target (KES)</Label>
                        <div className="relative">
                          <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input placeholder="0.00" value={targetAmount} onChange={(e) => setTargetAmount(formatWithCommas(e.target.value))} className="h-10 pl-10 rounded-xl bg-white/40 dark:bg-slate-900/40 border-white/10 font-bold text-sm tabular-nums" required />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label
                          htmlFor="start"
                          className="text-sm font-bold uppercase tracking-[0.1em]"
                        >
                          Start Date{" "}
                          {isEditing && savingsGoal && (
                            <span className="text-[10px] text-amber-600 lowercase">(fixed)</span>
                          )}
                        </Label>
                        <div
                          className="relative"
                          onClick={() => handleRestrictedFieldClick("Start date")}
                        >
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="start"
                            name="start"
                            type="date"
                            min={today}
                            defaultValue={isEditing ? savingsGoal?.start_date || today : today}
                            readOnly={isEditing && !!savingsGoal}
                            className={cn(
                              "h-14 pl-12 rounded-2xl bg-white/50 dark:bg-slate-900/40 border-white/40 font-bold",
                              isEditing && savingsGoal && "opacity-60 cursor-not-allowed",
                            )}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label
                          htmlFor="deadline"
                          className="text-sm font-bold uppercase tracking-[0.1em]"
                        >
                          Deadline Date{" "}
                          {isEditing && savingsGoal && (
                            <span className="text-[10px] text-amber-600 lowercase">(fixed)</span>
                          )}
                        </Label>
                        <div
                          className="relative"
                          onClick={() => handleRestrictedFieldClick("Deadline date")}
                        >
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="deadline"
                            name="deadline"
                            type="date"
                            min={today}
                            defaultValue={isEditing ? savingsGoal?.deadline_date : ""}
                            readOnly={isEditing && !!savingsGoal}
                            className={cn(
                              "h-14 pl-12 rounded-2xl bg-white/50 dark:bg-slate-900/40 border-white/40 font-bold",
                              isEditing && savingsGoal && "opacity-60 cursor-not-allowed",
                            )}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="source"
                        className="text-sm font-bold uppercase tracking-[0.1em]"
                      >
                        Funding Source
                      </Label>
                      <Select value={goalSource} onValueChange={setGoalSource}>
                        <SelectTrigger className="h-14 rounded-2xl bg-white/50 dark:bg-slate-900/40 border-white/40 font-bold">
                          <SelectValue placeholder="Select Source" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-white/30 bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl max-h-[400px] overflow-y-auto">
                          <SelectItem
                            value="any"
                            className="font-bold text-emerald-600 dark:text-emerald-400"
                          >
                            Any Available Source
                          </SelectItem>
                          <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase border-t border-white/10 mt-1">
                            Categories
                          </div>
                          <SelectItem value="any_mobile" className="font-bold text-primary">
                            Any Mobile Money
                          </SelectItem>
                          <SelectItem value="any_bank" className="font-bold text-primary">
                            Any Bank Account
                          </SelectItem>
                          <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase border-t border-white/10 mt-1">
                            Specifics
                          </div>
                          <SelectItem value="mpesa" className="font-bold">
                            M-Pesa (Safaricom)
                          </SelectItem>
                          <SelectItem value="airtel" className="font-bold">
                            Airtel Money
                          </SelectItem>
                          <SelectItem value="kcb" className="font-bold">
                            KCB Group
                          </SelectItem>
                          <SelectItem value="equity" className="font-bold">
                            Equity Bank
                          </SelectItem>
                          <SelectItem value="ncba" className="font-bold">
                            NCBA Bank
                          </SelectItem>
                          <SelectItem value="absa" className="font-bold">
                            Absa Kenya
                          </SelectItem>
                          <SelectItem value="coop" className="font-bold">
                            Co-operative Bank
                          </SelectItem>
                          <SelectItem value="stanbic" className="font-bold">
                            Stanbic Bank
                          </SelectItem>
                          <SelectItem value="im" className="font-bold">
                            I&M Bank
                          </SelectItem>
                          <SelectItem value="dtb" className="font-bold">
                            Diamond Trust Bank
                          </SelectItem>
                          <SelectItem value="family" className="font-bold">
                            Family Bank Kenya
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="p-8 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-6 backdrop-blur-sm shadow-inner">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-bold text-emerald-900 dark:text-emerald-300">
                            Lock Rules
                          </h4>
                          <p className="text-xs text-muted-foreground font-medium">
                            Funds are inaccessible until target date.
                          </p>
                        </div>
                        <Switch
                          checked={true}
                          disabled
                          className="scale-125 data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-bold">Automate Savings</h4>
                          <p className="text-xs text-muted-foreground font-medium">
                            Configure scheduled deductions.
                          </p>
                        </div>
                        <Switch
                          checked={isAutomated}
                          onCheckedChange={handleAutoToggle}
                          className="scale-125 data-[state=checked]:bg-primary"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-18 rounded-[1.5rem] text-xl font-bold bg-gradient-to-r from-emerald-600 via-primary to-emerald-600"
                    >
                      {isEditing ? "Update Savings Vault" : "Initialize Savings Vault"}
                    </Button>
                  </form>
                </Card>
              </div>
            </TabsContent>

            {/* COMPLETION / STATUS VIEW */}
            <TabsContent
              value="congrats"
              className="focus-visible:outline-none animate-in zoom-in-95 duration-500"
            >
              <div className="max-w-4xl mx-auto text-center py-12">
                {savingsGoal?.current_amount < savingsGoal?.target_amount ? (
                  <>
                    <div className="relative inline-block mb-8">
                      <div className="absolute inset-0 bg-primary blur-3xl opacity-20 animate-pulse" />
                      <div className="w-32 h-32 rounded-2xl bg-white/20 backdrop-blur-xl text-primary flex items-center justify-center shadow-2xl border border-white/30 relative z-10">
                        <Target className="w-16 h-16" />
                      </div>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-950 dark:text-white mb-2 tracking-tight">Pending saving</h2>
                    <p className="text-sm text-slate-900 dark:text-slate-100 font-semibold mb-8 max-w-sm mx-auto leading-relaxed">
                      You are KES <span className="text-primary tabular-nums">{(savingsGoal.target_amount - savingsGoal.current_amount).toLocaleString()}</span> away.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                      <Card className="rounded-2xl border border-white/10 bg-white/40 dark:bg-slate-900/40 p-4 shadow-md">
                        <h4 className="text-[8px] font-bold uppercase text-muted-foreground mb-1 tracking-widest">Remaining</h4>
                        <p className="text-xl font-bold text-slate-950 dark:text-white tabular-nums">KES {(savingsGoal.target_amount - savingsGoal.current_amount).toLocaleString()}</p>
                      </Card>
                      <Card className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4 shadow-md">
                        <h4 className="text-[8px] font-bold uppercase text-muted-foreground mb-1 tracking-widest">Reward</h4>
                        <p className="text-xl font-bold text-emerald-600 tabular-nums">KES {rewardAmount.toLocaleString()}</p>
                      </Card>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button className="h-10 px-8 rounded-xl text-xs font-bold shadow-md bg-primary active:scale-95 transition-all" onClick={() => setActiveTab("overview")}>Overview</Button>
                      <Button variant="outline" className="h-10 px-8 rounded-xl text-xs font-bold border-white/10 backdrop-blur-md active:scale-95" onClick={() => { setIsEditing(true); setActiveTab("setup"); }}>Adjust</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="relative inline-block mb-8">
                      <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 animate-pulse" />
                      <div className="w-32 h-32 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/40 relative z-10 animate-bounce">
                        <Trophy className="w-16 h-16" />
                      </div>
                    </div>

                    <h2 className="text-5xl font-bold text-slate-950 dark:text-white mb-4 tracking-tight drop-shadow-sm">
                      Goal Achieved!
                    </h2>
                    <p className="text-xl text-slate-900 dark:text-slate-100 font-bold mb-12 max-w-2xl mx-auto leading-relaxed">
                      Congratulations! You have successfully completed your savings goal:{" "}
                      <span className="text-emerald-600">"{savingsGoal?.title}"</span>. Your
                      discipline has earned you a special reward.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                      <Card className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-xl p-8 shadow-xl relative overflow-hidden group">
                        <Sparkles className="w-10 h-10 text-emerald-600 mb-4 mx-auto relative z-10" />
                        <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-2 relative z-10 tracking-widest">
                          2% Interest Reward
                        </h4>
                        <p className="text-4xl font-bold text-emerald-600 relative z-10">
                          KES {rewardAmount.toLocaleString()}
                        </p>
                      </Card>
                      <Card className="rounded-2xl border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-xl p-8 shadow-xl">
                        <PiggyBank className="w-10 h-10 text-primary mb-4 mx-auto" />
                        <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-2 tracking-widest">
                          Total Value
                        </h4>
                        <p className="text-4xl font-bold text-slate-950 dark:text-white">
                          KES {((savingsGoal?.target_amount || 0) + rewardAmount).toLocaleString()}
                        </p>
                      </Card>
                    </div>

                    <div className="space-y-8">
                      <div className="flex flex-col sm:flex-row gap-6 justify-center">
                        <Button
                          size="lg"
                          className="h-18 px-12 rounded-[1.5rem] text-xl font-bold shadow-2xl shadow-emerald-500/30 bg-emerald-600 hover:bg-emerald-700 transition-all duration-300 hover:scale-105 active:scale-95"
                          onClick={handleReceiveReward}
                        >
                          Receive Reward
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          className="h-18 px-12 rounded-[1.5rem] text-xl font-bold border-white/40 backdrop-blur-md transition-all duration-300 hover:bg-white/10"
                          onClick={() => setActiveTab("setup")}
                        >
                          Start New Goal
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                <div className="mt-16 pt-8 border-t border-white/10 inline-block px-12">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.4em]">
                    Vault Automated Growth Engine
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* CONTRIBUTION POPUP MODAL */}
      <Dialog open={showContributionModal} onOpenChange={setShowContributionModal}>
        <DialogContent className="max-w-md rounded-2xl border-white/30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl p-0 overflow-hidden shadow-2xl">
          <div className="relative p-8">
            <button
              onClick={() => setShowContributionModal(false)}
              className="absolute right-6 top-6 w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center hover:bg-muted/40 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <DialogHeader className="mb-8">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-4 shadow-lg">
                <PiggyBank className="w-7 h-7" />
              </div>
              <DialogTitle className="text-2xl font-bold text-slate-950 dark:text-white">
                Add Savings
              </DialogTitle>
              <DialogDescription className="font-bold text-emerald-600 dark:text-emerald-400 italic">
                "{savingLine}"
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Contribution Amount (KES)
                </Label>
                <div className="relative">
                  <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter amount to save"
                    value={contribAmount}
                    onChange={(e) => setContribAmount(formatWithCommas(e.target.value))}
                    className="h-14 pl-12 rounded-2xl bg-muted/20 border-white/20 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Funding Source
                </Label>
                <Select value={contribSource} onValueChange={setContribSource}>
                  <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-white/20 font-bold">
                    <SelectValue placeholder="Where are you saving from?" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-2xl backdrop-blur-xl max-h-[300px] overflow-y-auto">
                    <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                      <Smartphone className="w-3 h-3" /> Mobile Money
                    </div>
                    <SelectItem value="mpesa" className="font-bold">M-Pesa</SelectItem>
                    <SelectItem value="airtel" className="font-bold">Airtel Money</SelectItem>

                    <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 border-t border-white/10 mt-1">
                      <Building2 className="w-3 h-3" /> Banks
                    </div>
                    <SelectItem value="kcb" className="font-bold">KCB Group</SelectItem>
                    <SelectItem value="equity" className="font-bold">Equity Bank</SelectItem>
                    <SelectItem value="ncba" className="font-bold">NCBA Bank</SelectItem>
                    <SelectItem value="absa" className="font-bold">Absa Kenya</SelectItem>
                    <SelectItem value="coop" className="font-bold">Co-operative Bank</SelectItem>
                    <SelectItem value="stanbic" className="font-bold">Stanbic Bank</SelectItem>
                    <SelectItem value="im" className="font-bold">I&M Bank</SelectItem>
                    <SelectItem value="dtb" className="font-bold">Diamond Trust Bank</SelectItem>
                    <SelectItem value="family" className="font-bold">Family Bank Kenya</SelectItem>

                    <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 border-t border-white/10 mt-1">
                      <Wallet className="w-3 h-3" /> Vault
                    </div>
                    <SelectItem value="vault_balance" className="font-bold">Vault Balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-10">
              <Button
                className="w-full h-11 rounded-xl font-bold shadow-lg bg-emerald-600 hover:bg-emerald-700 text-sm"
                onClick={handleAddContribution}
              >
                Save Now <ArrowUpRight className="ml-1.5 w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AUTOMATION POPUP MODAL */}
      <Dialog
        open={showAutoPopup}
        onOpenChange={(open) => {
          if (!open && !isAutomated) setShowAutoPopup(false);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border-white/30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl p-0 overflow-hidden shadow-2xl">
          <div className="relative p-8">
            <button
              onClick={() => setShowAutoPopup(false)}
              className="absolute right-6 top-6 w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center hover:bg-muted/40 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <DialogHeader className="mb-8">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 shadow-lg">
                <Zap className="w-7 h-7" />
              </div>
              <DialogTitle className="text-2xl font-bold text-slate-950 dark:text-white">
                Automation Engine
              </DialogTitle>
              <DialogDescription className="font-bold text-slate-700 dark:text-slate-300">
                Configure your scheduled savings schedule.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Frequency
                </Label>
                <RadioGroup
                  value={autoFreq}
                  onValueChange={setAutoFreq}
                  className="grid grid-cols-2 gap-4"
                >
                  {["daily", "weekly", "monthly", "yearly"].map((freq) => (
                    <div
                      key={freq}
                      className={cn(
                        "relative rounded-xl border border-white/20 p-4 cursor-pointer transition-all",
                        autoFreq === freq
                          ? "bg-primary text-primary-foreground border-primary shadow-lg scale-[1.02]"
                          : "bg-muted/10 hover:bg-muted/20",
                      )}
                      onClick={() => setAutoFreq(freq)}
                    >
                      <RadioGroupItem value={freq} id={freq} className="sr-only" />
                      <Label
                        htmlFor={freq}
                        className="capitalize font-bold text-sm cursor-pointer"
                      >
                        {freq}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Deduction Amount (KES)
                </Label>
                <div className="relative">
                  <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0.00"
                    value={autoAmount}
                    onChange={(e) => setAutoAmount(formatWithCommas(e.target.value))}
                    className="h-14 pl-12 rounded-2xl bg-muted/20 border-white/20 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Financial Provider
                </Label>
                <Select value={autoProvider} onValueChange={setAutoProvider}>
                  <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-white/20 font-bold">
                    <SelectValue placeholder="Which provider?" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-2xl backdrop-blur-xl max-h-[300px] overflow-y-auto">
                    <SelectItem
                      value="any"
                      className="font-bold text-emerald-600 dark:text-emerald-400"
                    >
                      Any Available Source
                    </SelectItem>
                    <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 border-t border-white/10 mt-1">
                      <Smartphone className="w-3 h-3" /> Mobile
                    </div>
                    <SelectItem value="mpesa" className="font-bold">
                      M-Pesa (Safaricom)
                    </SelectItem>
                    <SelectItem value="airtel" className="font-bold">
                      Airtel Money
                    </SelectItem>
                    <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 border-t border-white/10 mt-1">
                      <Building2 className="w-3 h-3" /> Banks
                    </div>
                    <SelectItem value="kcb" className="font-bold">
                      KCB Group
                    </SelectItem>
                    <SelectItem value="equity" className="font-bold">
                      Equity Bank
                    </SelectItem>
                    <SelectItem value="ncba" className="font-bold">
                      NCBA Bank
                    </SelectItem>
                    <SelectItem value="absa" className="font-bold">
                      Absa Kenya
                    </SelectItem>
                    <SelectItem value="coop" className="font-bold">
                      Co-operative Bank
                    </SelectItem>
                    <SelectItem value="stanbic" className="font-bold">
                      Stanbic Bank
                    </SelectItem>
                    <SelectItem value="im" className="font-bold">
                      I&M Bank
                    </SelectItem>
                    <SelectItem value="dtb" className="font-bold">
                      Diamond Trust Bank
                    </SelectItem>
                    <SelectItem value="family" className="font-bold">
                      Family Bank Kenya
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-10 flex gap-4">
              <Button
                variant="outline"
                className="flex-1 h-14 rounded-2xl font-bold border-white/20"
                onClick={() => setShowAutoPopup(false)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                className="flex-1 h-14 rounded-2xl font-bold shadow-xl"
                onClick={confirmAutomation}
              >
                Confirm OK <Check className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
