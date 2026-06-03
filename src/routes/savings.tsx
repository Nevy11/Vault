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
import { format, differenceInCalendarDays, startOfToday, subDays } from "date-fns";
import { cn, formatWithCommas, parseFormattedNumber } from "@/lib/utils";
import { toast } from "sonner";
import * as Recharts from "recharts";

const {
  ResponsiveContainer,
  AreaChart,
  Area,
  Defs,
  LinearGradient,
  Stop,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} = Recharts;

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
  "Save a little every day and your goal gets closer faster.",
  "Daily deposits build momentum more than one big push.",
  "Track your progress each day to make saving feel effortless.",
  "Small wins today become a big victory by deadline.",
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
  const [contribPhone, setContribPhone] = useState("");
  const [contribAccount, setContribAccount] = useState("");
  const [setupPhone, setSetupPhone] = useState("");
  const [setupAccount, setSetupAccount] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [goalTitle, setGoalTitle] = useState("");

  // Automation state
  const [autoFreq, setAutoFreq] = useState("weekly");
  const [autoAmount, setAutoAmount] = useState("");
  const [autoProvider, setAutoProvider] = useState("");
  const [autoPhone, setAutoPhone] = useState("");
  const [autoAccount, setAutoAccount] = useState("");

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
  const remaining = savingsGoal
    ? Math.max(0, savingsGoal.target_amount - savingsGoal.current_amount)
    : 0;
  const deadlineDate = savingsGoal?.lockUntil ?? savingsGoal?.deadline_date;
  const daysLeft = deadlineDate
    ? differenceInCalendarDays(new Date(deadlineDate), startOfToday())
    : null;
  const averageContribution = ledger.length
    ? Math.round(
        ledger.reduce((sum, entry) => sum + Number(entry.amount), 0) / ledger.length,
      )
    : 0;

  const progressValue = Math.max(0, Math.min(100, progress));
  const ringRadius = 40;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (progressValue / 100) * ringCircumference;
  const displayDaysLeft = daysLeft !== null ? Math.max(0, daysLeft) : null;

  const barData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, index) => {
      const date = subDays(startOfToday(), 6 - index);
      return {
        key: format(date, "yyyy-MM-dd"),
        label: format(date, "EEE"),
        amount: 0,
      };
    });

    const totals: Record<string, number> = {};
    ledger.forEach((entry) => {
      const dateKey = format(new Date(entry.created_at), "yyyy-MM-dd");
      totals[dateKey] = (totals[dateKey] || 0) + Number(entry.amount);
    });

    return last7Days.map((day) => ({
      ...day,
      amount: totals[day.key] || 0,
    }));
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

    let finalSource = goalSource;
    if (["mpesa", "airtel", "any_mobile"].includes(goalSource) && setupPhone) {
      finalSource = `${goalSource.toUpperCase()} (${setupPhone})`;
    } else if (
      [
        "kcb",
        "equity",
        "ncba",
        "absa",
        "coop",
        "stanbic",
        "im",
        "dtb",
        "family",
        "any_bank",
      ].includes(goalSource) &&
      setupAccount
    ) {
      finalSource = `${goalSource.toUpperCase()} (${setupAccount})`;
    }

    let finalAutoProvider = autoProvider;
    if (isAutomated) {
      if (["mpesa", "airtel", "any"].includes(autoProvider) && autoPhone) {
        finalAutoProvider = `${autoProvider.toUpperCase()} (${autoPhone})`;
      } else if (
        [
          "kcb",
          "equity",
          "ncba",
          "absa",
          "coop",
          "stanbic",
          "im",
          "dtb",
          "family",
        ].includes(autoProvider) &&
        autoAccount
      ) {
        finalAutoProvider = `${autoProvider.toUpperCase()} (${autoAccount})`;
      }
    }

    const goalData = {
      title: goalTitle,
      target_amount: parseFormattedNumber(targetAmount),
      start_date: (e.target as any).start.value,
      deadline_date: (e.target as any).deadline.value,
      funding_source: finalSource,
      is_automated: isAutomated,
      automation_frequency: isAutomated ? autoFreq : null,
      automation_amount: isAutomated ? parseFormattedNumber(autoAmount) : null,
      automation_provider: isAutomated ? finalAutoProvider : null,
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
      setSetupPhone("");
      setSetupAccount("");
      setAutoPhone("");
      setAutoAccount("");
    }
  };

  const handleCancel = () => {
    setGoalTitle("");
    setGoalSource("");
    setTargetAmount("");
    setIsAutomated(false);
    setAutoFreq("weekly");
    setAutoAmount("");
    setAutoProvider("");
    setSetupPhone("");
    setSetupAccount("");
    setAutoPhone("");
    setAutoAccount("");
    setIsEditing(false);
    setActiveTab("overview");
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

    // Determine if we need additional info based on source
    const isMobileMoney = ["mpesa", "airtel"].includes(contribSource);
    const isBank = [
      "kcb",
      "equity",
      "ncba",
      "absa",
      "coop",
      "stanbic",
      "im",
      "dtb",
      "family",
    ].includes(contribSource);

    if (isMobileMoney && !contribPhone) {
      toast.error("Please enter your phone number");
      return;
    }

    if (isBank && !contribAccount) {
      toast.error("Please enter your account number");
      return;
    }

    let finalSource = contribSource;
    if (isMobileMoney) {
      finalSource = `${contribSource.toUpperCase()} (${contribPhone})`;
    } else if (isBank) {
      finalSource = `${contribSource.toUpperCase()} (${contribAccount})`;
    }

    await addContribution(parseFormattedNumber(contribAmount), finalSource, "manual");
    setShowContributionModal(false);
    setContribAmount("");
    setContribSource("");
    setContribPhone("");
    setContribAccount("");
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

    let displayProvider = autoProvider;
    if (["mpesa", "airtel", "any"].includes(autoProvider) && autoPhone) {
      displayProvider = `${autoProvider.toUpperCase()} (${autoPhone})`;
    } else if (
      [
        "kcb",
        "equity",
        "ncba",
        "absa",
        "coop",
        "stanbic",
        "im",
        "dtb",
        "family",
      ].includes(autoProvider) &&
      autoAccount
    ) {
      displayProvider = `${autoProvider.toUpperCase()} (${autoAccount})`;
    }

    setIsAutomated(true);
    setShowAutoPopup(false);
    toast.success("Automation Configured", {
      description: `KES ${autoAmount} will be deducted ${autoFreq} via ${displayProvider}.`,
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
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-8 h-8 hover:bg-white/20"
                onClick={() => history.back()}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-4xl font-bold tracking-tight mb-2 drop-shadow-sm text-slate-950 dark:text-white">
                  Savings Vault
                </h1>
                <p className="text-muted-foreground flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Cryptographically secured target-based savings.
                </p>
              </div>
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
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
                    <div className="grid gap-8 xl:grid-cols-[1.75fr_1fr] items-stretch">
                      <div className="space-y-6">
                        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-100 via-white to-slate-100 text-slate-950 shadow-2xl p-7 border border-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:border-slate-800 dark:text-white">
                          <div className="absolute right-0 top-0 h-full w-full bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.18),_transparent_25%)] pointer-events-none" />
                          <div className="relative z-10 space-y-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                              <div>
                                <p className="text-xs uppercase tracking-[0.35em] text-emerald-700 font-semibold">
                                  Savings status
                                </p>
                                <h2 className="mt-3 text-4xl font-bold tracking-tight">
                                  KES {savingsGoal?.current_amount?.toLocaleString() || "0"}
                                </h2>
                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                  of KES {savingsGoal?.target_amount?.toLocaleString() || "0"} target
                                </p>
                              </div>
                              <div className="relative rounded-3xl bg-white p-4 border border-slate-200 shadow-sm text-center dark:bg-slate-900 dark:border-slate-800">
                                <Calendar className="absolute right-4 top-4 w-4 h-4 text-emerald-500" />
                                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 text-center">
                                  Days left
                                </p>
                                <div className="mt-4 flex items-center justify-center">
                                  <div className="relative">
                                    <svg className="h-24 w-24" viewBox="0 0 100 100">
                                      <circle
                                        cx="50"
                                        cy="50"
                                        r={ringRadius}
                                        fill="none"
                                        stroke="rgba(148,163,184,0.2)"
                                        strokeWidth="10"
                                      />
                                      <circle
                                        cx="50"
                                        cy="50"
                                        r={ringRadius}
                                        fill="none"
                                        stroke="#10b981"
                                        strokeWidth="10"
                                        strokeLinecap="round"
                                        strokeDasharray={ringCircumference}
                                        strokeDashoffset={ringOffset}
                                        transform="rotate(-90 50 50)"
                                      />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                      <span className="text-sm font-semibold text-slate-950 dark:text-white">
                                        {displayDaysLeft !== null ? displayDaysLeft : "--"}
                                      </span>
                                      <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                                        days
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="rounded-3xl bg-white p-4 border border-slate-200 shadow-sm">
                                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                                  Progress
                                </p>
                                <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{progress.toFixed(0)}%</p>
                                <Progress value={Math.min(100, progress)} className="mt-4 h-3 rounded-full bg-slate-200 dark:bg-slate-800" />
                              </div>
                              <div className="rounded-3xl bg-white p-4 border border-slate-200 shadow-sm">
                                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                                  Remaining
                                </p>
                                <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">KES {remaining.toLocaleString()}</p>
                                <p className="mt-1 text-xs text-slate-500">towards your goal</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[2rem] bg-white/95 dark:bg-slate-950/95 p-4 md:p-5 shadow-2xl border border-white/60 dark:border-white/10">
                          <div className="flex items-center justify-between gap-4 mb-4">
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-muted-foreground">
                                Momentum
                              </p>
                              <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                                Daily progress
                              </h3>
                            </div>
                            <div className="rounded-3xl bg-primary/10 px-3 py-2 text-primary font-bold text-xs uppercase">
                              Money Fancy
                            </div>
                          </div>
                          <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={barData}>
                                <Defs>
                                  <LinearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                                    <Stop offset="5%" stopColor="rgba(16,185,129,0.85)" stopOpacity={0.85} />
                                    <Stop offset="95%" stopColor="rgba(16,185,129,0)" stopOpacity={0} />
                                  </LinearGradient>
                                </Defs>
                                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.15)" />
                                <XAxis
                                  dataKey="label"
                                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <YAxis
                                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: "rgba(255,255,255,0.95)",
                                    borderRadius: "16px",
                                    border: "1px solid rgba(148,163,184,0.15)",
                                    boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
                                  }}
                                  labelStyle={{ color: "#0f172a", fontWeight: "700" }}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="amount"
                                  stroke="#10b981"
                                  strokeWidth={3}
                                  fill="url(#savingsGradient)"
                                  fillOpacity={0.9}
                                  activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6 flex flex-col justify-center">
                        <Card className="min-h-[30rem] rounded-[2rem] border border-slate-200 bg-gradient-to-br from-emerald-100 via-white to-slate-100 text-slate-950 shadow-2xl p-6 overflow-hidden relative flex flex-col justify-between">
                          <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-emerald-500/15 blur-3xl" />
                          <div className="absolute -left-10 bottom-10 w-36 h-36 rounded-full bg-primary/15 blur-3xl" />
                          <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-4">
                              <div className="grid place-items-center h-14 w-14 rounded-3xl bg-white shadow-sm text-emerald-600 border border-slate-200">
                                <PiggyBank className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.35em] text-emerald-700 font-bold">
                                  Goal snapshot
                                </p>
                                <h3 className="text-2xl font-bold">Visible progress</h3>
                              </div>
                            </div>
                            <div className="relative z-10 mt-6 grid gap-4">
                              <div className="rounded-3xl bg-white p-5 border border-slate-200 shadow-sm">
                                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                                  Reward
                                </p>
                                <p className="mt-3 text-2xl font-bold">KES {rewardAmount.toLocaleString()}</p>
                              </div>
                              <div className="rounded-3xl bg-white p-5 border border-slate-200 shadow-sm">
                                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                                  Avg/day
                                </p>
                                <p className="mt-3 text-2xl font-bold">KES {averageContribution.toLocaleString()}</p>
                              </div>
                              <div className="rounded-3xl bg-white p-5 border border-slate-200 shadow-sm">
                                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                                  Funding
                                </p>
                                <p className="mt-3 text-lg font-bold">
                                  {savingsGoal?.funding_source || "Vault / Mobile Money"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </Card>
                        <Card className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-emerald-100 via-white to-slate-100 text-slate-950 shadow-2xl p-5 overflow-hidden relative animate-in fade-in duration-500">
                          <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-emerald-500/15 blur-3xl" />
                          <div className="absolute -left-10 bottom-8 w-28 h-28 rounded-full bg-primary/15 blur-3xl" />
                          <div className="relative z-10 flex items-center gap-4">
                            <div className="w-14 h-14 rounded-3xl bg-white shadow-sm grid place-items-center text-emerald-600 border border-slate-200">
                              <Sparkles className="w-7 h-7" />
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-[0.35em] text-emerald-700 font-bold">
                                Quick tip
                              </p>
                              <p className="text-lg font-bold">Save a little each day</p>
                            </div>
                          </div>
                          <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                            Daily progress adds up faster than one big push.
                          </p>
                          <div className="mt-5">
                            <Button
                              variant="outline"
                              className="w-full rounded-xl border-primary/30 font-bold hover:bg-primary/5 transition-all"
                              onClick={nextJoke}
                            >
                              Next Tip
                            </Button>
                          </div>
                        </Card>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 pb-8 px-8 flex flex-col sm:flex-row gap-4">
                    <Button
                      className="flex-1 h-14 rounded-2xl text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                      onClick={() => setShowContributionModal(true)}
                    >
                      <PiggyBank className="w-5 h-5 mr-2" />
                      Add Savings
                    </Button>
                  </CardFooter>
                </Card>

                {/* Savings Tip Card */}
                <Card className="mx-auto w-full max-w-[26rem] min-h-[18rem] max-h-[20rem] rounded-2xl border border-slate-200 bg-emerald-50 dark:border-slate-800 dark:bg-slate-950 overflow-hidden flex flex-col shadow-xl animate-in fade-in duration-500">
                  <CardHeader className="relative overflow-hidden px-5 pt-5">
                    <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-3xl" />
                    <div className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-primary/10 blur-3xl" />
                    <div className="flex items-center justify-between gap-3 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="grid place-items-center h-11 w-11 rounded-3xl bg-white text-emerald-600 shadow-sm animate-pulse">
                          <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="font-semibold text-slate-950 dark:text-white uppercase tracking-tight text-base">
                            Savings Tip
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                            Daily progress makes it real.
                          </CardDescription>
                        </div>
                      </div>
                      <Sparkles className="w-5 h-5 text-emerald-500 animate-bounce" />
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-center px-5 py-4">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug tracking-tight">
                      {joke}
                    </p>
                  </CardContent>
                  <div className="px-5 pb-5 border-t border-slate-200 dark:border-slate-800">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-primary/30 font-bold hover:bg-primary/5 transition-all py-3"
                      onClick={nextJoke}
                    >
                      Next Tip
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
                <Card className="rounded-2xl border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl p-5 shadow-xl transition-all relative">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors z-20 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    title="Cancel"
                  >
                    <X className="w-5 h-5" />
                  </button>
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
                          <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 border-t border-white/10 mt-1">
                            <Wallet className="w-3 h-3" /> Vault
                          </div>
                          <SelectItem value="vault_balance" className="font-bold text-primary">
                            Vault Account
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

                    {/* Conditional Setup Inputs */}
                    {["mpesa", "airtel", "any_mobile"].includes(goalSource) && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Default Phone Number
                        </Label>
                        <div className="relative">
                          <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="tel"
                            placeholder="e.g. 0712345678"
                            value={setupPhone}
                            onChange={(e) => setSetupPhone(e.target.value)}
                            className="h-14 pl-12 rounded-2xl bg-white/50 dark:bg-slate-900/40 border-white/40 font-bold"
                          />
                        </div>
                      </div>
                    )}

                    {[
                      "kcb",
                      "equity",
                      "ncba",
                      "absa",
                      "coop",
                      "stanbic",
                      "im",
                      "dtb",
                      "family",
                      "any_bank",
                    ].includes(goalSource) && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Default Bank Account
                        </Label>
                        <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="text"
                            placeholder="Enter account number"
                            value={setupAccount}
                            onChange={(e) => setSetupAccount(e.target.value)}
                            className="h-14 pl-12 rounded-2xl bg-white/50 dark:bg-slate-900/40 border-white/40 font-bold"
                          />
                        </div>
                      </div>
                    )}

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
                    <SelectItem value="vault_balance" className="font-bold">Vault Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional Inputs */}
              {["mpesa", "airtel"].includes(contribSource) && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="e.g. 0712345678"
                      value={contribPhone}
                      onChange={(e) => setContribPhone(e.target.value)}
                      className="h-14 pl-12 rounded-2xl bg-muted/20 border-white/20 font-bold"
                    />
                  </div>
                </div>
              )}

              {[
                "kcb",
                "equity",
                "ncba",
                "absa",
                "coop",
                "stanbic",
                "im",
                "dtb",
                "family",
              ].includes(contribSource) && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Bank Account Number
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Enter account number"
                      value={contribAccount}
                      onChange={(e) => setContribAccount(e.target.value)}
                      className="h-14 pl-12 rounded-2xl bg-muted/20 border-white/20 font-bold"
                    />
                  </div>
                </div>
              )}
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
                      <Wallet className="w-3 h-3" /> Vault
                    </div>
                    <SelectItem value="vault_balance" className="font-bold">
                      Vault Account
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

              {/* Conditional Automation Inputs */}
              {["mpesa", "airtel", "any"].includes(autoProvider) && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Phone Number for Deduction
                  </Label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="e.g. 0712345678"
                      value={autoPhone}
                      onChange={(e) => setAutoPhone(e.target.value)}
                      className="h-14 pl-12 rounded-2xl bg-muted/20 border-white/20 font-bold"
                    />
                  </div>
                </div>
              )}

              {[
                "kcb",
                "equity",
                "ncba",
                "absa",
                "coop",
                "stanbic",
                "im",
                "dtb",
                "family",
              ].includes(autoProvider) && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Bank Account for Deduction
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Enter account number"
                      value={autoAccount}
                      onChange={(e) => setAutoAccount(e.target.value)}
                      className="h-14 pl-12 rounded-2xl bg-muted/20 border-white/20 font-bold"
                    />
                  </div>
                </div>
              )}
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
