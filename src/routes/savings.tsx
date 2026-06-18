import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  Users,
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

const { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } = Recharts;

import { useSavings } from "@/hooks/use-savings";
import JointSavingsContent from "@/components/joint-savings-content";

export const Route = createFileRoute("/savings")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: search.tab as string | undefined,
      mode: search.mode as "individual" | "joint" | undefined,
      potId: search.potId as string | undefined,
    };
  },
  component: SavingsPage,
});

function SavingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { tab, mode } = search;

  // Top-level mode: 'individual' or 'joint'
  const [viewMode, setViewMode] = useState<"individual" | "joint">(mode || "individual");
  // Sub-tabs for individual
  const [individualTab, setIndividualTab] = useState(tab || "overview");

  const [isEditing, setIsEditing] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [showAutoPopup, setShowAutoPopup] = useState(false);

  // New goal form state
  const [goalTitle, setGoalTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [goalSource, setGoalSource] = useState("");
  const [isAutomated, setIsAutomated] = useState(false);
  const [autoFreq, setAutoFreq] = useState("weekly");
  const [autoAmount, setAutoAmount] = useState("");
  const [autoProvider, setAutoProvider] = useState("");

  // Setup account info
  const [setupPhone, setSetupPhone] = useState("");
  const [setupAccount, setSetupAccount] = useState("");
  const [autoPhone, setAutoPhone] = useState("");
  const [autoAccount, setAutoAccount] = useState("");

  // Contribution state
  const [contribAmount, setContribAmount] = useState("");
  const [contribSource, setContribSource] = useState("");
  const [contribPhone, setContribPhone] = useState("");
  const [contribAccount, setContribAccount] = useState("");

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

  const today = format(new Date(), "yyyy-MM-dd");
  const rewardAmount = savingsGoal ? savingsGoal.target_amount * 0.02 : 0;
  const progress = savingsGoal ? (savingsGoal.current_amount / savingsGoal.target_amount) * 100 : 0;

  const ringRadius = 40;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (progress / 100) * ringCircumference;

  const deadline = savingsGoal ? new Date(savingsGoal.deadline_date) : null;
  const daysLeft = deadline ? differenceInCalendarDays(deadline, startOfToday()) : null;
  const displayDaysLeft = daysLeft !== null ? Math.max(0, daysLeft) : null;

  const remaining = savingsGoal
    ? Math.max(0, savingsGoal.target_amount - savingsGoal.current_amount)
    : 0;

  const averageContribution = useMemo(() => {
    if (!ledger.length) return 0;
    const total = ledger.reduce((sum, entry) => sum + Number(entry.amount), 0);
    return total / ledger.length;
  }, [ledger]);

  const barData = useMemo(() => {
    if (!ledger.length) return [];
    // Last 7 contributions
    return [...ledger]
      .slice(0, 7)
      .reverse()
      .map((entry) => ({
        label: format(new Date(entry.created_at), "MMM dd"),
        amount: Number(entry.amount),
      }));
  }, [ledger]);

  const financialJokes = useMemo(
    () => t("savings.jokes", { returnObjects: true }) as string[],
    [t],
  );
  const savingLines = useMemo(
    () => t("savings.saving_lines", { returnObjects: true }) as string[],
    [t],
  );

  const [jokeIndex, setJokeIndex] = useState(0);
  const joke = useMemo(() => financialJokes[jokeIndex], [jokeIndex, financialJokes]);

  const [lineIndex, setLineIndex] = useState(0);
  const savingLine = useMemo(() => savingLines[lineIndex], [lineIndex, savingLines]);

  useEffect(() => {
    if (showContributionModal) {
      setLineIndex(Math.floor(Math.random() * (savingLines?.length || 1)));
    }
  }, [showContributionModal, savingLines]);

  const nextJoke = () => {
    setJokeIndex((prev) => (prev + 1) % (financialJokes?.length || 1));
  };

  // Sync mode with URL if it changes externally or on load
  useEffect(() => {
    if (mode && mode !== viewMode) {
      setViewMode(mode);
    } else if (!mode && tab === "joint") {
      // Legacy support for ?tab=joint
      handleSetViewMode("joint");
    }
  }, [mode, tab]);

  // Sync sub-tab with URL
  useEffect(() => {
    if (tab && tab !== individualTab && viewMode === "individual") {
      setIndividualTab(tab);
    }
  }, [tab, viewMode]);

  const handleSetViewMode = (newMode: "individual" | "joint") => {
    setViewMode(newMode);
    navigate({
      search: (prev) => ({ ...prev, mode: newMode }),
    });
  };

  // Auto-switch to completion tab if goal is met
  useEffect(() => {
    if (savingsGoal && savingsGoal.current_amount >= savingsGoal.target_amount) {
      setIndividualTab("congrats");
    }
  }, [savingsGoal]);

  const handleSetIndividualTab = (newTab: string) => {
    setIndividualTab(newTab);
    navigate({
      search: (prev) => ({ ...prev, tab: newTab }),
    });
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
        ["kcb", "equity", "ncba", "absa", "coop", "stanbic", "im", "dtb", "family"].includes(
          autoProvider,
        ) &&
        autoAccount
      ) {
        finalAutoProvider = `${autoProvider.toUpperCase()} (${autoAccount})`;
      }
    }

    const form = e.target as HTMLFormElement;
    const goalData = {
      title: goalTitle,
      target_amount: parseFormattedNumber(targetAmount),
      start_date: (form.elements.namedItem("start") as HTMLInputElement).value,
      deadline_date: (form.elements.namedItem("deadline") as HTMLInputElement).value,
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
      setIndividualTab("overview");
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
    setIndividualTab("overview");
  };

  const handleRestrictedFieldClick = (fieldName: string) => {
    if (isEditing && savingsGoal) {
      toast.info(t("savings.overview.fixed_field", { field: fieldName }), {
        description: t("savings.overview.fixed_field_desc"),
      });
    }
  };

  const handleAddContribution = async () => {
    if (!contribAmount || !contribSource) {
      toast.error(t("common.errors.fill_all"));
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
      toast.error(t("common.errors.enter_phone"));
      return;
    }

    if (isBank && !contribAccount) {
      toast.error(t("common.errors.enter_account"));
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
    if (!autoAmount) {
      toast.error(t("common.errors.incomplete_settings"), {
        description: t("common.errors.provide_amount_provider"),
      });
      return;
    }

    const displayProvider = "Vault Account";

    setIsAutomated(true);
    setShowAutoPopup(false);
    toast.success("Automation Configured", {
      description: `KES ${autoAmount} will be deducted ${autoFreq} via ${displayProvider}.`,
    });
    
    // Here, you would also call your API to set 'vault_balance' for this goal
    // updateGoal(goal.id, { is_automated: true, automation_amount: parseFormattedNumber(autoAmount), automation_provider: 'vault_balance' });
  };

  const handleReceiveReward = async () => {
    if (!savingsGoal) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const totalToReceive = Number(savingsGoal.target_amount) + rewardAmount;

      // 1. Update Wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", user.id)
        .single();

      if (wallet) {
        await supabase
          .from("wallets")
          .update({ balance: Number(wallet.balance) + totalToReceive })
          .eq("id", wallet.id);
      }

      // 2. Mark goal as completed
      await supabase
        .from("savings_goals")
        .update({ status: "completed" })
        .eq("id", savingsGoal.id);

      // 3. Log to Transactions
      await supabase.from("transactions").insert({
        sender_id: user.id,
        type: "deposit",
        method: "vault",
        amount: totalToReceive,
        status: "completed",
        description: `Savings Goal Completed: ${savingsGoal.title}`,
      });

      toast.success("Reward received!", {
        description: `KES ${totalToReceive.toLocaleString()} has been added to your balance.`,
      });

      // 4. Default to new goal if goals exist, otherwise setup
      if (goals.length > 1) {
        setIndividualTab("overview");
      } else {
        setIndividualTab("setup");
      }
      fetchSavingsData();
    } catch (error) {
      console.error("Error receiving reward:", error);
      toast.error("Failed to process reward.");
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

        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 animate-in fade-in duration-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
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
                <h1 className="text-3xl font-medium tracking-tight mb-2 drop-shadow-sm text-slate-950 dark:text-white">
                  {t("savings.title")}
                </h1>
                <p className="text-muted-foreground flex items-center gap-2 font-normal text-slate-900 dark:text-slate-100">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  {t("savings.subtitle")}
                </p>
              </div>
            </div>

            {/* Top-level Mode Switcher */}
            <div className="bg-white/20 dark:bg-slate-900/40 backdrop-blur-md p-1.5 rounded-[2rem] border border-white/20 shadow-2xl flex items-center gap-1 w-full md:w-auto">
              <Button
                variant="ghost"
                className={cn(
                  "flex-1 md:flex-none h-11 rounded-[1.5rem] font-medium px-8 transition-all duration-300",
                  viewMode === "individual"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => handleSetViewMode("individual")}
              >
                <PiggyBank className="w-4 h-4 mr-2" />
                Personal
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "flex-1 md:flex-none h-11 rounded-[1.5rem] font-medium px-8 transition-all duration-300",
                  viewMode === "joint"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => handleSetViewMode("joint")}
              >
                <Users className="w-4 h-4 mr-2" />
                Joint
              </Button>
            </div>
          </div>

          {/* INDIVIDUAL SAVINGS VIEW */}
          {viewMode === "individual" && (
            <Tabs
              value={individualTab}
              onValueChange={handleSetIndividualTab}
              className="space-y-8 animate-in slide-in-from-right-4 duration-500"
            >
              <div className="flex justify-center mb-8">
                <TabsList className="h-11 bg-white/20 dark:bg-slate-900/40 backdrop-blur-md p-1 rounded-2xl border border-white/20">
                  <TabsTrigger
                    value="overview"
                    className="rounded-xl font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
                  >
                    {t("savings.tabs.overview")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="setup"
                    className="rounded-xl font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
                    onClick={() => setIsEditing(false)}
                  >
                    {t("savings.tabs.new_goal")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="congrats"
                    className="rounded-xl font-medium transition-all duration-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
                  >
                    {t("savings.tabs.completion")}
                  </TabsTrigger>
                </TabsList>
              </div>

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
                      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        {t("savings.overview.my_goals")}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      {goals.map((g, index) => (
                        <Button
                          key={g.id}
                          variant={selectedGoalIndex === index ? "default" : "outline"}
                          className={cn(
                            "h-11 rounded-2xl font-medium transition-all duration-500",
                            selectedGoalIndex === index
                              ? "px-6 bg-primary text-primary-foreground shadow-2xl scale-105 border-none"
                              : "w-11 p-0 bg-white/50 dark:bg-slate-800/50 border-white/10 hover:bg-primary/10 text-slate-700 dark:text-slate-300",
                          )}
                          onClick={() => {
                            setSelectedGoalIndex(index);
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
                          className="h-11 px-4 rounded-2xl border-dashed border-primary/40 text-primary hover:bg-primary/10 hover:border-primary shrink-0 font-medium flex items-center transition-all duration-300"
                          onClick={() => {
                            setIsEditing(false);
                            setIndividualTab("setup");
                          }}
                        >
                          <span className="mr-2">{goals.length + 1}</span>
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-8 animate-in fade-in duration-700">
                  <Card className="w-full rounded-2xl border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl overflow-hidden shadow-2xl">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="space-y-1">
                          <CardTitle className="text-2xl font-medium text-slate-950 dark:text-white">
                            {savingsGoal?.title || "Savings Goal"}
                          </CardTitle>
                        </div>

                        <div className="flex gap-2">
                          <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium uppercase tracking-widest flex items-center">
                            {progress.toFixed(0)}% {t("savings.overview.complete_badge")}
                          </div>
                        </div>
                      </div>
                      <CardDescription className="font-medium text-slate-700 dark:text-slate-300">
                        {t("savings.overview.target_label", {
                          amount: savingsGoal?.target_amount?.toLocaleString() || "0",
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-8 xl:grid-cols-[2.2fr_1fr] items-stretch">
                        <div className="space-y-8">
                          {/* Top Status Card */}
                          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-100 via-white to-slate-100 text-slate-950 shadow-2xl p-8 border border-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:border-slate-800 dark:text-white">
                            <div className="absolute right-0 top-0 h-full w-full bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.18),_transparent_25%)] pointer-events-none" />
                            <div className="relative z-10 space-y-6">
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.35em] text-emerald-700 font-medium">
                                    {t("savings.overview.savings_status")}
                                  </p>
                                  <h2 className="mt-3 text-4xl font-medium tracking-tight">
                                    KES {savingsGoal?.current_amount?.toLocaleString() || "0"}
                                  </h2>
                                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                    {t("savings.overview.of_target", {
                                      amount: savingsGoal?.target_amount?.toLocaleString() || "0",
                                    })}
                                  </p>
                                </div>
                                <div className="relative rounded-3xl bg-white p-4 border border-slate-200 shadow-sm text-center dark:bg-slate-900 dark:border-slate-800">
                                  <Calendar className="absolute right-4 top-4 w-4 h-4 text-emerald-500" />
                                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 text-center font-medium">
                                    {t("savings.overview.days_left")}
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
                                        <span className="text-sm font-medium text-slate-950 dark:text-white">
                                          {displayDaysLeft !== null ? displayDaysLeft : "--"}
                                        </span>
                                        <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-medium">
                                          {t("savings.overview.days")}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-3xl bg-white p-4 border border-slate-200 shadow-sm">
                                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-normal">
                                    {t("savings.overview.progress")}
                                  </p>
                                  <p className="mt-2 text-2xl font-medium text-slate-950 dark:text-white">
                                    {progress.toFixed(0)}%
                                  </p>
                                  <Progress
                                    value={Math.min(100, progress)}
                                    className="mt-4 h-3 rounded-full bg-slate-200 dark:bg-slate-800"
                                  />
                                </div>
                                <div className="rounded-3xl bg-white p-4 border border-slate-200 shadow-sm">
                                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-normal">
                                    {t("savings.overview.remaining")}
                                  </p>
                                  <p className="mt-2 text-2xl font-medium text-slate-950 dark:text-white">
                                    KES {remaining.toLocaleString()}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {t("savings.overview.towards_goal")}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-[2rem] bg-white/95 dark:bg-slate-950/95 p-4 md:p-5 shadow-2xl border border-white/60 dark:border-white/10">
                            <div className="flex items-center justify-between gap-4 mb-4">
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-[0.4em] font-normal text-muted-foreground">
                                  {t("savings.overview.momentum")}
                                </p>
                                <h3 className="text-lg font-medium text-slate-950 dark:text-white">
                                  {t("savings.overview.daily_progress")}
                                </h3>
                              </div>
                              <div className="rounded-3xl bg-primary/10 px-3 py-2 text-primary font-normal text-xs uppercase">
                                {t("savings.overview.money_fancy")}
                              </div>
                            </div>
                            <div className="h-[250px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={barData}>
                                  <defs>
                                    <linearGradient
                                      id="savingsGradient"
                                      x1="0"
                                      y1="0"
                                      x2="0"
                                      y2="1"
                                    >
                                      <stop
                                        offset="5%"
                                        stopColor="rgba(16,185,129,0.85)"
                                        stopOpacity={0.85}
                                      />
                                      <stop
                                        offset="95%"
                                        stopColor="rgba(16,185,129,0)"
                                        stopOpacity={0}
                                      />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid
                                    strokeDasharray="4 4"
                                    stroke="rgba(148,163,184,0.15)"
                                  />
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

                        <div className="flex flex-col gap-8 h-full">
                          <Card className="flex-1 rounded-[2.5rem] border border-slate-200 bg-gradient-to-br from-emerald-100 via-white to-slate-100 text-slate-950 shadow-2xl p-6 overflow-hidden relative flex flex-col">
                            <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-emerald-500/15 blur-3xl" />
                            <div className="absolute -left-10 bottom-10 w-36 h-36 rounded-full bg-primary/15 blur-3xl" />
                            <div className="relative z-10 space-y-6">
                              <div className="flex items-center gap-4">
                                <div className="grid place-items-center h-14 w-14 rounded-3xl bg-white shadow-sm text-emerald-600 border border-slate-200">
                                  <PiggyBank className="w-6 h-6" />
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-[0.35em] text-emerald-700 font-normal">
                                    {t("savings.overview.goal_snapshot")}
                                  </p>
                                  <h3 className="text-2xl font-medium">
                                    {t("savings.overview.visible_progress")}
                                  </h3>
                                </div>
                              </div>
                              <div className="relative z-10 mt-6 grid gap-4 flex-1">
                                <div className="rounded-3xl bg-white p-5 border border-slate-200 shadow-sm flex flex-col justify-center">
                                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-normal">
                                    {t("savings.overview.reward")}
                                  </p>
                                  <p className="mt-3 text-2xl font-medium">
                                    KES {rewardAmount.toLocaleString()}
                                  </p>
                                </div>
                                <div className="rounded-3xl bg-white p-5 border border-slate-200 shadow-sm flex flex-col justify-center">
                                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-normal">
                                    {t("savings.overview.avg_day")}
                                  </p>
                                  <p className="mt-3 text-2xl font-medium">
                                    KES {averageContribution.toLocaleString()}
                                  </p>
                                </div>
                                <div className="rounded-3xl bg-white p-5 border border-slate-200 shadow-sm flex flex-col justify-center">
                                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-normal">
                                    {t("savings.overview.funding")}
                                  </p>
                                  <p className="mt-3 text-lg font-medium">
                                    {savingsGoal?.funding_source ||
                                      t("savings.overview.funding_fallback")}
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
                                <p className="text-xs uppercase tracking-[0.35em] text-emerald-700 font-normal">
                                  {t("savings.overview.quick_tip")}
                                </p>
                                <p className="text-lg font-medium">
                                  {t("savings.overview.tip_desc")}
                                </p>
                              </div>
                            </div>
                            <p className="mt-4 text-sm text-slate-600 leading-relaxed font-normal">{joke}</p>
                            <div className="mt-5">
                              <Button
                                variant="outline"
                                className="w-full rounded-xl border-primary/30 font-medium hover:bg-primary/5 transition-all"
                                onClick={nextJoke}
                              >
                                {t("savings.overview.next_tip")}
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
                        {t("savings.overview.add_savings_btn")}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>

                {/* Ledger Table */}
                <div className="space-y-4">
                  <h3 className="text-xl font-medium text-slate-950 dark:text-white uppercase tracking-tight">
                    {t("savings.ledger.title")}
                  </h3>
                  <div className="rounded-2xl border border-white/30 bg-white/80 dark:bg-slate-950/80 overflow-hidden backdrop-blur-2xl shadow-2xl">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/20 bg-primary/5">
                          <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-950 dark:text-white">
                            {t("common.date")}
                          </th>
                          <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-950 dark:text-white">
                            {t("common.source")}
                          </th>
                          <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-950 dark:text-white">
                            {t("common.type")}
                          </th>
                          <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-950 dark:text-white">
                            {t("common.amount")}
                          </th>
                          <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-950 dark:text-white text-right">
                            {t("savings.ledger.running_total")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 font-medium text-slate-900 dark:text-slate-100">
                        {ledger.length > 0 ? (
                          ledger.map((row) => (
                            <tr key={row.id} className="hover:bg-primary/5 transition-colors">
                              <td className="px-6 py-4 text-sm font-normal">
                                {format(new Date(row.created_at), "MMM dd, yyyy")}
                              </td>
                              <td className="px-6 py-4 text-sm capitalize font-normal">{row.source}</td>
                              <td className="px-6 py-4">
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider shadow-sm",
                                    row.type === "automated"
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
                                  )}
                                >
                                  {row.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                +KES {Number(row.amount).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-sm font-mono text-right font-medium">
                                KES {Number(row.running_total).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-6 py-12 text-center text-muted-foreground font-normal"
                            >
                              {t("savings.ledger.no_contributions")}
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
                      title={t("common.cancel")}
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <form onSubmit={handleCreateGoal} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        <div className="space-y-2">
                          <Label className="text-[9px] font-medium uppercase tracking-wider">
                            {t("savings.form.title")}
                          </Label>
                          <div className="relative">
                            <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-600" />
                            <Input
                              placeholder={t("savings.form.title_placeholder")}
                              value={goalTitle}
                              onChange={(e) => setGoalTitle(e.target.value)}
                              className="h-10 pl-10 rounded-xl bg-white/40 dark:bg-slate-900/40 border-white/10 font-medium text-sm"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[9px] font-medium uppercase tracking-wider">
                            {t("savings.form.target_amount")}
                          </Label>
                          <div className="relative">
                            <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                              placeholder="0.00"
                              value={targetAmount}
                              onChange={(e) => setTargetAmount(formatWithCommas(e.target.value))}
                              className="h-10 pl-10 rounded-xl bg-white/40 dark:bg-slate-900/40 border-white/10 font-medium text-sm tabular-nums"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label
                            htmlFor="start"
                            className="text-sm font-medium uppercase tracking-[0.1em]"
                          >
                            {t("savings.form.start_date")}{" "}
                            {isEditing && savingsGoal && (
                              <span className="text-[10px] text-amber-600 lowercase font-medium">
                                {t("savings.form.fixed")}
                              </span>
                            )}
                          </Label>
                          <div
                            className="relative"
                            onClick={() => handleRestrictedFieldClick(t("savings.form.start_date"))}
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
                                "h-14 pl-12 rounded-2xl bg-white/50 dark:bg-slate-900/40 border-white/40 font-medium",
                                isEditing && savingsGoal && "opacity-60 cursor-not-allowed",
                              )}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label
                            htmlFor="deadline"
                            className="text-sm font-medium uppercase tracking-[0.1em]"
                          >
                            {t("savings.form.deadline_date")}{" "}
                            {isEditing && savingsGoal && (
                              <span className="text-[10px] text-amber-600 lowercase font-medium">
                                {t("savings.form.fixed")}
                              </span>
                            )}
                          </Label>
                          <div
                            className="relative"
                            onClick={() =>
                              handleRestrictedFieldClick(t("savings.form.deadline_date"))
                            }
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
                                "h-14 pl-12 rounded-2xl bg-white/50 dark:bg-slate-900/40 border-white/40 font-medium",
                                isEditing && savingsGoal && "opacity-60 cursor-not-allowed",
                              )}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-medium uppercase tracking-[0.1em]">
                          {t("savings.form.funding_source")}
                        </Label>
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-white/40">
                          <Wallet className="w-5 h-5 text-primary" />
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            Vault Account
                          </span>
                        </div>
                      </div>

                      {/* Conditional Setup Inputs - Removed as only Vault balance is supported */}

                      <div className="p-8 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-6 backdrop-blur-sm shadow-inner">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h4 className="font-semibold text-emerald-900 dark:text-emerald-300">
                              {t("savings.form.lock_rules")}
                            </h4>
                            <p className="text-xs text-muted-foreground font-medium">
                              {t("savings.form.lock_rules_desc")}
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
                            <h4 className="font-semibold">{t("savings.form.automate_savings")}</h4>
                            <p className="text-xs text-muted-foreground font-medium">
                              {t("savings.form.automate_desc")}
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
                        {isEditing ? t("savings.form.update_btn") : t("savings.form.init_btn")}
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

                      <h2 className="text-2xl font-bold text-slate-950 dark:text-white mb-2 tracking-tight">
                        {t("savings.completion.pending_title")}
                      </h2>
                      <p className="text-sm text-slate-900 dark:text-slate-100 font-semibold mb-8 max-w-sm mx-auto leading-relaxed">
                        {t("savings.completion.away_message", {
                          amount: (
                            savingsGoal.target_amount - savingsGoal.current_amount
                          ).toLocaleString(),
                        })}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                        <Card className="rounded-2xl border border-white/10 bg-white/40 dark:bg-slate-900/40 p-4 shadow-md">
                          <h4 className="text-[8px] font-semibold uppercase text-muted-foreground mb-1 tracking-widest">
                            {t("savings.overview.remaining")}
                          </h4>
                          <p className="text-xl font-bold text-slate-950 dark:text-white tabular-nums">
                            KES{" "}
                            {(
                              savingsGoal.target_amount - savingsGoal.current_amount
                            ).toLocaleString()}
                          </p>
                        </Card>
                        <Card className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4 shadow-md">
                          <h4 className="text-[8px] font-semibold uppercase text-muted-foreground mb-1 tracking-widest">
                            {t("savings.overview.reward")}
                          </h4>
                          <p className="text-xl font-bold text-emerald-600 tabular-nums">
                            KES {rewardAmount.toLocaleString()}
                          </p>
                        </Card>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                          className="h-10 px-8 rounded-xl text-xs font-bold shadow-md bg-primary active:scale-95 transition-all"
                          onClick={() => setIndividualTab("overview")}
                        >
                          {t("savings.tabs.overview")}
                        </Button>
                        <Button
                          variant="outline"
                          className="h-10 px-8 rounded-xl text-xs font-bold border-white/10 backdrop-blur-md active:scale-95"
                          onClick={() => {
                            setIsEditing(true);
                            setIndividualTab("setup");
                          }}
                        >
                          {t("savings.completion.adjust_btn")}
                        </Button>
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
                        {t("savings.completion.achieved_title")}
                      </h2>
                      <p className="text-xl text-slate-900 dark:text-slate-100 font-semibold mb-12 max-w-2xl mx-auto leading-relaxed">
                        {t("savings.completion.congrats_message", { title: savingsGoal?.title })}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                        <Card className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-xl p-8 shadow-xl relative overflow-hidden group">
                          <Sparkles className="w-10 h-10 text-emerald-600 mb-4 mx-auto relative z-10" />
                          <h4 className="text-[10px] font-semibold uppercase text-muted-foreground mb-2 relative z-10 tracking-widest">
                            {t("savings.completion.reward_label")}
                          </h4>
                          <p className="text-4xl font-bold text-emerald-600 relative z-10">
                            KES {rewardAmount.toLocaleString()}
                          </p>
                        </Card>
                        <Card className="rounded-2xl border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-xl p-8 shadow-xl">
                          <PiggyBank className="w-10 h-10 text-primary mb-4 mx-auto" />
                          <h4 className="text-[10px] font-semibold uppercase text-muted-foreground mb-2 tracking-widest">
                            {t("savings.completion.total_value")}
                          </h4>
                          <p className="text-4xl font-bold text-slate-950 dark:text-white">
                            KES{" "}
                            {((savingsGoal?.target_amount || 0) + rewardAmount).toLocaleString()}
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
                            Receive
                          </Button>
                          <Button
                            variant="outline"
                            size="lg"
                            className="h-18 px-12 rounded-[1.5rem] text-xl font-bold border-white/40 backdrop-blur-md transition-all duration-300 hover:bg-white/10"
                            onClick={() => setIndividualTab("setup")}
                          >
                            {t("savings.completion.start_new_btn")}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="mt-16 pt-8 border-t border-white/10 inline-block px-12">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.4em]">
                      {t("savings.completion.growth_engine")}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* JOINT SAVINGS VIEW */}
          {viewMode === "joint" && (
            <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
              <JointSavingsContent />
            </div>
          )}
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
                {t("savings.add_savings_modal.title")}
              </DialogTitle>
              <DialogDescription className="font-semibold text-emerald-600 dark:text-emerald-400 italic">
                "{savingLine}"
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {t("savings.add_savings_modal.amount_label")}
                </Label>
                <div className="relative">
                  <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder={t("savings.add_savings_modal.amount_placeholder")}
                    value={contribAmount}
                    onChange={(e) => setContribAmount(formatWithCommas(e.target.value))}
                    className="h-14 pl-12 rounded-2xl bg-muted/20 border-white/20 font-semibold"
                  />
                </div>
              </div>

              {/* Conditional Inputs - Removed provider selection, forcing Vault */}
              <div className="space-y-3 p-4 rounded-2xl bg-muted/20 border border-white/20">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  Funding Source
                </p>
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-primary" />
                  <span className="font-medium">Vault Account</span>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <Button
                className="w-full h-11 rounded-xl font-bold shadow-lg bg-emerald-600 hover:bg-emerald-700 text-sm"
                onClick={() => {
                  setContribSource("vault_balance");
                  handleAddContribution();
                }}
              >
                {t("savings.add_savings_modal.save_now_btn")}{" "}
                <ArrowUpRight className="ml-1.5 w-3.5 h-3.5" />
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
                {t("savings.automation_modal.title")}
              </DialogTitle>
              <DialogDescription className="font-semibold text-slate-700 dark:text-slate-300">
                {t("savings.automation_modal.description")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {t("savings.automation_modal.frequency")}
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
                        className="capitalize font-semibold text-sm cursor-pointer"
                      >
                        {t(`savings.automation_modal.${freq}`)}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {t("savings.automation_modal.deduction_amount")}
                </Label>
                <div className="relative">
                  <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0.00"
                    value={autoAmount}
                    onChange={(e) => setAutoAmount(formatWithCommas(e.target.value))}
                    className="h-14 pl-12 rounded-2xl bg-muted/20 border-white/20 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-2xl bg-muted/20 border border-white/20">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  Funding Source
                </p>
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-primary" />
                  <span className="font-medium">Vault Account</span>
                </div>
              </div>

              {/* Conditional Automation Inputs - Removed as only Vault balance is supported */}

            </div>

            <div className="mt-10 flex gap-4">
              <Button
                variant="outline"
                className="flex-1 h-14 rounded-2xl font-bold border-white/20"
                onClick={() => setShowAutoPopup(false)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> {t("common.back")}
              </Button>
              <Button
                className="flex-1 h-14 rounded-2xl font-bold shadow-xl"
                onClick={confirmAutomation}
              >
                {t("savings.automation_modal.confirm_ok")} <Check className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
