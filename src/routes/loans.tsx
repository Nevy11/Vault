import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
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
  Send,
  UserCheck,
  Lock,
  MessageSquare,
  Sparkles,
  RefreshCw,
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
import { useProfile } from "@/hooks/use-profile";

export const Route = createFileRoute("/loans")({
  component: LoansPage,
});

const INTEREST_RATES: Record<string, number> = {
  "1": 3,
  "3": 4,
  "5": 5,
  "7": 6,
  "9": 7,
  "12": 9,
};

type OnboardingData = {
  employment_status: string;
  monthly_income: number;
  financial_dependents: number;
  monthly_debt: number;
  primary_loan_use: string;
  id_number: string;
};

function LoanAssistant({
  onComplete,
  profile,
}: {
  onComplete: (data: OnboardingData) => void;
  profile: any;
}) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Partial<OnboardingData>>({
    employment_status: profile?.employment_status || "",
    monthly_income: profile?.monthly_income || 0,
    financial_dependents: profile?.financial_dependents || 0,
    monthly_debt: profile?.monthly_debt || 0,
    primary_loan_use: profile?.primary_loan_use || "",
    id_number: profile?.id_number || "",
  });

  const questions = [
    {
      id: "id_number",
      label: "National ID Number",
      description: "Enter your valid Government ID or Passport number.",
      type: "text",
    },
    {
      id: "employment_status",
      label: "Employment Status",
      description: "How do you currently earn your primary income?",
      options: ["Full-time salaried", "Freelancer/Gig worker", "Student", "Business Owner"],
      type: "select",
    },
    {
      id: "monthly_income",
      label: "Monthly Income (KES)",
      description: "Your average monthly personal income before expenses.",
      type: "number",
    },
    {
      id: "financial_dependents",
      label: "Financial Dependents",
      description: "Number of people who rely on your income.",
      type: "number",
    },
    {
      id: "monthly_debt",
      label: "Existing Monthly Debt (KES)",
      description: "Total monthly repayments for loans or credit cards elsewhere.",
      type: "number",
    },
    {
      id: "primary_loan_use",
      label: "Primary Loan Purpose",
      description: "What do you intend to use Vault credit for most often?",
      options: ["Business capital", "Emergency bills", "Education", "Personal"],
      type: "select",
    },
  ];

  const current = questions[step];

  const handleNext = () => {
    const value = data[current.id as keyof OnboardingData];
    if (
      value === undefined ||
      value === "" ||
      (current.type === "number" && isNaN(Number(value)))
    ) {
      toast.error("Please provide a valid answer.");
      return;
    }
    if (step < questions.length) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  if (step === questions.length) {
    return (
      <div className="space-y-6 py-2 animate-in zoom-in-95 duration-300">
        <div className="space-y-1 text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 mx-auto mb-3 border border-emerald-500/20 shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-950 dark:text-white">Review & Verify</h3>
          <p className="text-xs text-muted-foreground font-medium">
            Please confirm your details are accurate for limit expansion.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-slate-900/5 dark:bg-white/5 border border-white/10 shadow-inner">
          {questions.map((q) => (
            <div key={q.id} className="space-y-1">
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                {q.label}
              </span>
              <p className="text-sm font-bold text-slate-950 dark:text-white truncate">
                {q.id.includes("income") || q.id.includes("debt")
                  ? `KES ${data[q.id as keyof OnboardingData]?.toLocaleString()}`
                  : data[q.id as keyof OnboardingData]}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="ghost"
            className="flex-1 h-12 rounded-xl font-bold text-slate-600 dark:text-slate-400"
            onClick={handleBack}
          >
            Back to Edit
          </Button>
          <Button
            className="flex-[2] h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg"
            onClick={() => onComplete(data as OnboardingData)}
          >
            Confirm & Save Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${((step + 1) / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tabular-nums">
          Step {step + 1} of {questions.length}
        </span>
      </div>

      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-950 dark:text-white leading-tight">
            {current.label}
          </h3>
          <p className="text-xs text-muted-foreground font-medium">{current.description}</p>
        </div>

        {current.type === "select" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {current.options?.map((opt) => (
              <Button
                key={opt}
                variant={data[current.id as keyof OnboardingData] === opt ? "default" : "outline"}
                className={cn(
                  "h-12 rounded-xl text-xs font-bold transition-all border-white/10",
                  data[current.id as keyof OnboardingData] === opt
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md scale-[1.02]"
                    : "hover:bg-emerald-500/5 hover:border-emerald-500/30",
                )}
                onClick={() => {
                  setData((prev) => ({ ...prev, [current.id]: opt }));
                }}
              >
                {opt}
                {data[current.id as keyof OnboardingData] === opt && (
                  <Check className="ml-2 w-4 h-4" />
                )}
              </Button>
            ))}
          </div>
        ) : (
          <div className="relative">
            <Input
              type={current.type}
              value={data[current.id as keyof OnboardingData] || ""}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  [current.id]:
                    current.type === "number" ? parseFloat(e.target.value) : e.target.value,
                }))
              }
              placeholder={current.type === "number" ? "0.00" : "Enter details..."}
              className="h-14 text-xl font-bold rounded-2xl bg-white/40 dark:bg-slate-900/40 border-white/10 focus:ring-emerald-500/20"
              autoFocus
            />
            {(current.id.includes("income") || current.id.includes("debt")) && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                KES
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4 border-t border-white/5">
        {step > 0 && (
          <Button
            variant="ghost"
            className="flex-1 h-12 rounded-xl font-bold text-slate-600 dark:text-slate-400"
            onClick={handleBack}
          >
            Back
          </Button>
        )}
        <Button
          className="flex-[2] h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg group"
          onClick={handleNext}
        >
          {step === questions.length - 1 ? "Complete Verification" : "Continue"}
          <ArrowUpRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Button>
      </div>

      <p className="text-[9px] text-center text-muted-foreground flex items-center justify-center gap-1.5 opacity-60">
        <Lock className="w-2.5 h-2.5" /> Data is used strictly for credit risk assessment.
      </p>
    </div>
  );
}

function LoansPage() {
  const { t } = useTranslation();
  const { profile, refetch: refreshProfile } = useProfile();

  // Define membershipMonths for use in the UI and eligibility checks
  const membershipMonths = useMemo(() => {
    if (!profile?.created_at) return 0;
    return Math.max(
      0,
      Math.floor(
        (new Date().getTime() - new Date(profile.created_at).getTime()) /
          (1000 * 60 * 60 * 24 * 30),
      ),
    );
  }, [profile?.created_at]);
  const [activeLoan, setActiveLoan] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("request");

  const [loanAmount, setLoanAmount] = useState<string>("");
  const [period, setPeriod] = useState<string>("3");
  const [showRepayPopup, setShowRepayPopup] = useState(false);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayProvider, setRepayProvider] = useState("");
  const [sourceIdentifier, setSourceIdentifier] = useState("");

  const [loanHistory, setLoanHistory] = useState<any[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Advanced Assessment State
  const [assessment, setAssessment] = useState<any>(null);
  const [extensionAssessment, setExtensionAssessment] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showExtensionPopup, setShowExtensionPopup] = useState(false);

  const fetchLoanData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data: active, error: activeErr } = await supabase
        .from("loans")
        .select("*")
        .eq("user_id", profile.id)
        .eq("status", "active")
        .maybeSingle();

      if (activeErr) throw activeErr;
      setActiveLoan(active);

      if (active) {
        setActiveTab("tracker");
        // Run extension assessment if active loan exists
        const { data: extData, error: extErr } = await supabase.rpc("calculate_loan_assessment", {
          p_requested_amount: 0,
          p_requested_period_months: 1, // Extensions are month-by-month
          p_is_extension_request: true,
          p_loan_id: active.id,
        });
        if (!extErr) setExtensionAssessment(extData);
      }

      const { data: history, error: historyErr } = await supabase
        .from("loans")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (historyErr) throw historyErr;
      setLoanHistory(history || []);

      if (active) {
        const { data: ledger, error: ledgerErr } = await supabase
          .from("loans_ledger")
          .select("*")
          .eq("loan_id", active.id)
          .order("created_at", { ascending: false });

        if (ledgerErr) throw ledgerErr;
        setLedgerEntries(ledger || []);
      }

      // Check if profile is complete
      const isProfileComplete = !!(
        profile?.id_number &&
        profile?.employment_status &&
        profile?.monthly_income !== undefined &&
        profile?.monthly_income !== null &&
        profile?.financial_dependents !== undefined &&
        profile?.financial_dependents !== null &&
        profile?.monthly_debt !== undefined &&
        profile?.monthly_debt !== null &&
        profile?.primary_loan_use
      );
      setShowOnboarding(!isProfileComplete);
    } catch (error: any) {
      console.error("Error fetching loan data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoanData();
  }, [profile?.id]);

  // Assessment Effect
  useEffect(() => {
    const runAssessment = async () => {
      if (!profile?.id || parseFloat(loanAmount) <= 0) return;
      try {
        const { data, error } = await supabase.rpc("calculate_loan_assessment", {
          p_requested_amount: parseFloat(loanAmount) || 0,
          p_requested_period_months: parseInt(period),
          p_is_extension_request: false,
        });
        if (error) throw error;
        setAssessment(data);
      } catch (err) {
        console.error("Assessment error:", err);
      }
    };
    runAssessment();
  }, [loanAmount, period, profile?.id]);

  const handleOnboardingComplete = async (onboardingData: OnboardingData) => {
    try {
      const { error } = await supabase.from("profiles").update(onboardingData).eq("id", profile.id);

      if (error) throw error;
      toast.success("Profile updated! Assessment logic is now active.");
      refreshProfile();
      setShowOnboarding(false);
    } catch (err: any) {
      toast.error("Failed to update profile", { description: err.message });
    }
  };

  const handleRequestLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    // 1. Check Membership Age (Tenure)
    const membershipMonths = profile?.created_at
      ? Math.floor(
          (new Date().getTime() - new Date(profile.created_at).getTime()) /
            (1000 * 60 * 60 * 24 * 30),
        )
      : 0;

    if (membershipMonths < 9) {
      toast.error("Eligibility Required", {
        description: `You must be a member for at least 9 months to access Vault Credit. Current: ${membershipMonths}m.`,
        className: "bg-destructive/10 border-destructive/20",
      });
      return;
    }

    // 2. Check Assessment / Transaction History
    if (assessment?.status === "rejected") {
      toast.error("Limit Exceeded", {
        description:
          assessment.message ||
          "Your transaction history is currently insufficient for this loan amount.",
        className: "bg-destructive/10 border-destructive/20",
      });
      return;
    }

    if (!assessment || assessment.calculated_limit <= 0) {
      toast.error("Insufficient History", {
        description:
          "Your transaction volume is currently too low to unlock a credit limit. Increase your deposits to grow your limit.",
        className: "bg-destructive/10 border-destructive/20",
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc("disburse_loan", {
        p_amount: parseFloat(loanAmount),
        p_interest_rate: assessment?.base_interest || INTEREST_RATES[period],
        p_repayment_period: parseInt(period),
      });

      if (error) throw error;

      if (data.success) {
        toast.success(t("loans.toasts.approved"), {
          description: t("loans.toasts.approved_desc", {
            amount: parseFloat(loanAmount).toLocaleString(),
          }),
        });
        await fetchLoanData();
        setActiveTab("tracker");
      } else {
        toast.error(t("loans.toasts.failed"), { description: data.message });
      }
    } catch (err: any) {
      toast.error(t("common.error"), { description: err.message });
    }
  };

  const handleRequestExtension = async () => {
    if (!activeLoan || !extensionAssessment) return;

    try {
      // We need an RPC to actually apply the extension (update loan period and balance)
      // I will create this RPC next, but for now let's use the assessment data.
      const newDueDate = addMonths(new Date(activeLoan.due_date), 1);

      const { error } = await supabase
        .from("loans")
        .update({
          due_date: newDueDate.toISOString(),
          remaining_balance: extensionAssessment.total_repayment_due,
          months_already_extended: extensionAssessment.months_already_extended,
        })
        .eq("id", activeLoan.id);

      if (error) throw error;

      toast.success("Loan Extended!", {
        description: `New due date: ${format(newDueDate, "MMM d, yyyy")}. A penalty of KES ${extensionAssessment.extension_penalties.toLocaleString()} was applied.`,
      });
      await fetchLoanData();
      setShowExtensionPopup(false);
    } catch (err: any) {
      toast.error("Extension Failed", { description: err.message });
    }
  };

  const handleRepayment = async () => {
    if (!repayAmount || !repayProvider || !activeLoan) {
      toast.error(t("loans.toasts.incomplete"), {
        description: t("loans.toasts.incomplete_desc"),
      });
      return;
    }

    const isVault = repayProvider === "vault_balance";
    const isMobile = ["mpesa", "airtel"].includes(repayProvider);

    if (!isVault && !sourceIdentifier) {
      const label = isMobile
        ? t("transactions.form.phone_number")
        : t("transactions.form.account_number");
      toast.error(t("loans.toasts.missing_id", { label }), {
        description: t("loans.toasts.missing_id_desc", { label: label.toLowerCase() }),
      });
      return;
    }

    const finalSource = isVault
      ? t("loans.categories.vault")
      : `${repayProvider.toUpperCase()} (${sourceIdentifier})`;

    try {
      const { data, error } = await supabase.rpc("repay_loan", {
        p_loan_id: activeLoan.id,
        p_amount: parseFloat(repayAmount),
        p_source: finalSource,
        p_payment_type: "manual",
      });

      if (error) throw error;
      const result = data;

      if (result.success) {
        toast.success(t("loans.toasts.repayment_success"), {
          description: t("loans.toasts.repayment_success_desc", {
            amount: parseFloat(repayAmount).toLocaleString(),
            source: finalSource,
          }),
        });
        await fetchLoanData();
        setShowRepayPopup(false);
        setRepayAmount("");
        setSourceIdentifier("");
        setRepayProvider("");
        if (result.new_balance === 0) {
          setActiveTab("success");
        }
      } else {
        toast.error(t("loans.toasts.repayment_failed"), { description: result.message });
      }
    } catch (err: any) {
      toast.error(t("loans.toasts.repayment_failed"), { description: err.message });
    }
  };

  return (
    <AppShell>
      <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden">
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
                  {t("loans.title")}
                </h1>
                <p className="text-muted-foreground flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  {t("loans.subtitle")}
                </p>
              </div>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList className="grid grid-cols-3 w-full md:w-auto h-12 bg-white/20 dark:bg-slate-900/40 backdrop-blur-md p-1 rounded-2xl border border-white/20">
                <TabsTrigger
                  value="request"
                  className="rounded-xl font-bold transition-all duration-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-[10px] sm:text-sm"
                >
                  {t("loans.tabs.request")}
                </TabsTrigger>
                <TabsTrigger
                  value="tracker"
                  className="rounded-xl font-bold transition-all duration-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-[10px] sm:text-sm"
                >
                  {t("loans.tabs.tracker")}
                </TabsTrigger>
                <TabsTrigger
                  value="success"
                  className="rounded-xl font-bold transition-all duration-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-[10px] sm:text-sm"
                >
                  {t("loans.tabs.status")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsContent
              value="request"
              className="focus-visible:outline-none animate-in fade-in duration-500"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-6">
                  {showOnboarding ? (
                    <Card className="rounded-2xl border border-white/10 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl p-0 shadow-lg overflow-hidden relative animate-in slide-in-from-top-4 duration-500">
                      <div className="p-4 border-b border-white/10 bg-emerald-500/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-950 dark:text-white">
                            Demographics Verification
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[8px] font-bold">
                          <ShieldCheck className="w-2.5 h-2.5" /> VERIFIED DATA
                        </div>
                      </div>
                      <div className="p-8">
                        <LoanAssistant onComplete={handleOnboardingComplete} profile={profile} />
                      </div>
                    </Card>
                  ) : (
                    <div className="space-y-6 animate-in fade-in duration-700">
                      {/* Verified Profile Summary Card */}
                      <Card className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/5 backdrop-blur-xl p-0 shadow-md overflow-hidden group">
                        <div className="px-4 py-3 border-b border-emerald-500/10 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                              Verified Profile
                            </h3>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2.5 rounded-lg text-[10px] font-bold text-emerald-600 hover:bg-emerald-500/10"
                            onClick={() => setShowOnboarding(true)}
                          >
                            <RefreshCw className="w-3 h-3 mr-1.5" /> Edit Profile
                          </Button>
                        </div>
                        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                          <div className="space-y-1">
                            <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">
                              Employment
                            </span>
                            <p className="text-[11px] font-bold text-slate-950 dark:text-white truncate">
                              {profile?.employment_status}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">
                              Income
                            </span>
                            <p className="text-[11px] font-bold text-slate-950 dark:text-white tabular-nums">
                              KES {profile?.monthly_income?.toLocaleString()}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">
                              Dependents
                            </span>
                            <p className="text-[11px] font-bold text-slate-950 dark:text-white">
                              {profile?.financial_dependents}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">
                              Debt
                            </span>
                            <p className="text-[11px] font-bold text-slate-950 dark:text-white tabular-nums">
                              KES {profile?.monthly_debt?.toLocaleString()}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">
                              Primary Use
                            </span>
                            <p className="text-[11px] font-bold text-slate-950 dark:text-white truncate">
                              {profile?.primary_loan_use}
                            </p>
                          </div>
                        </div>
                      </Card>

                      <Card className="rounded-2xl border border-white/10 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl p-4 shadow-lg overflow-hidden relative">
                        {showOnboarding && (
                          <div className="absolute inset-0 z-20 bg-background/60 backdrop-blur-[1px] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3 border border-primary/20">
                              <Lock className="w-6 h-6" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-950 dark:text-white mb-1 uppercase tracking-tight">
                              Loan Requests Locked
                            </h3>
                            <p className="text-[10px] text-muted-foreground font-medium max-w-[200px] mb-4">
                              Please complete your demographic verification first to unlock
                              borrowing power.
                            </p>
                            <Button
                              size="sm"
                              className="h-8 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 shadow-md"
                              onClick={() => {
                                const el = document.getElementById("demographics-form");
                                el?.scrollIntoView({ behavior: "smooth" });
                              }}
                            >
                              Verify Demographics
                            </Button>
                          </div>
                        )}
                        <form onSubmit={handleRequestLoan} className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground opacity-80">
                              {t("loans.request.loan_amount")}
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
                              <span className="text-[8px] text-muted-foreground font-medium uppercase tracking-wider">
                                Limit Level: KES{" "}
                                {(assessment?.calculated_limit || 0).toLocaleString()}
                              </span>
                              {assessment?.status === "rejected" &&
                                assessment?.calculated_limit > 0 && (
                                  <span className="text-[8px] text-destructive font-semibold flex items-center gap-1">
                                    <AlertCircle className="w-2 h-2" /> LIMIT EXCEEDED
                                  </span>
                                )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground opacity-80">
                                {t("loans.request.period")}
                              </Label>
                              <Select value={period} onValueChange={setPeriod}>
                                <SelectTrigger className="h-9 rounded-xl bg-white/40 dark:bg-slate-900/40 border-white/10 font-medium text-[11px]">
                                  <SelectValue placeholder={t("loans.request.period")} />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-xl">
                                  <SelectItem value="1" className="font-medium text-[11px]">
                                    1 Month (3%)
                                  </SelectItem>
                                  <SelectItem value="3" className="font-medium text-[11px]">
                                    3 Months (4%)
                                  </SelectItem>
                                  <SelectItem value="5" className="font-medium text-[11px]">
                                    5 Months (5%)
                                  </SelectItem>
                                  <SelectItem value="7" className="font-medium text-[11px]">
                                    7 Months (6%)
                                  </SelectItem>
                                  <SelectItem value="9" className="font-medium text-[11px]">
                                    9 Months (7%)
                                  </SelectItem>
                                  <SelectItem value="12" className="font-medium text-[11px]">
                                    12 Months (9%)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground opacity-80">
                                {t("common.date")}
                              </Label>
                              <div className="h-9 flex items-center px-3 rounded-xl bg-white/20 dark:bg-slate-900/20 border border-dashed border-white/10 text-muted-foreground font-medium text-[11px]">
                                <Calendar className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                                {format(new Date(), "MMM d, yyyy")}
                              </div>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[7px] text-muted-foreground uppercase tracking-wider font-semibold">
                                {t("loans.request.principal")}
                              </span>
                              <p className="font-semibold text-[11px] text-slate-950 dark:text-white tabular-nums">
                                KES {(parseFloat(loanAmount) || 0).toLocaleString()}
                              </p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[7px] text-muted-foreground uppercase tracking-wider font-semibold">
                                {t("loans.request.interest")}
                              </span>
                              <p className="font-semibold text-emerald-500 text-[11px] tabular-nums">
                                {assessment?.base_interest ? `${assessment.base_interest}%` : "---"}
                              </p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[7px] text-muted-foreground uppercase tracking-wider font-semibold">
                                PROCESSING FEE
                              </span>
                              <p className="font-semibold text-[11px] text-slate-950 dark:text-white">
                                KES 0
                              </p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[7px] text-muted-foreground uppercase tracking-wider font-semibold">
                                {t("loans.request.total")}
                              </span>
                              <p className="font-bold text-[11px] text-slate-950 dark:text-white tabular-nums">
                                KES {(assessment?.total_repayment_due || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="relative group pt-1">
                            <Button
                              type="submit"
                              size="sm"
                              disabled={
                                assessment?.status === "rejected" ||
                                parseFloat(loanAmount) <= 0 ||
                                !!activeLoan
                              }
                              className="w-full h-10 rounded-xl text-xs font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                            >
                              {activeLoan
                                ? t("loans.request.active_exists")
                                : t("loans.request.disburse_btn")}
                            </Button>
                            {activeLoan && (
                              <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-destructive text-white text-[8px] font-bold uppercase tracking-wider rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none border border-white/5 flex items-center gap-1.5">
                                <AlertCircle className="w-2.5 h-2.5" />{" "}
                                {t("loans.request.single_active_rule")}
                              </div>
                            )}
                          </div>
                        </form>
                      </Card>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Card className="rounded-2xl border border-white/20 bg-white/70 dark:bg-slate-950/60 backdrop-blur-xl overflow-hidden shadow-md">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-950 dark:text-white">
                          Limit Guard™
                        </CardTitle>
                      </div>
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
                              !showOnboarding ? "bg-emerald-500" : "bg-muted",
                            )}
                          />
                          <span className="text-[11px] text-slate-900 dark:text-slate-100 font-medium">
                            Demographics
                          </span>
                        </div>
                        <span
                          className={cn(
                            "text-[11px] font-bold",
                            !showOnboarding ? "text-emerald-600" : "text-muted-foreground",
                          )}
                        >
                          {!showOnboarding ? "VERIFIED" : "PENDING"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              membershipMonths >= 9 ? "bg-emerald-500" : "bg-muted",
                            )}
                          />
                          <span className="text-[11px] text-slate-900 dark:text-slate-100 font-medium">
                            9-Month Membership
                          </span>
                        </div>
                        <span
                          className={cn(
                            "text-[11px] font-bold",
                            membershipMonths >= 9 ? "text-emerald-600" : "text-muted-foreground",
                          )}
                        >
                          {membershipMonths >= 9 ? "VERIFIED" : "PENDING"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              assessment?.calculated_limit > 0 ? "bg-emerald-500" : "bg-muted",
                            )}
                          />
                          <span className="text-[11px] text-slate-900 dark:text-slate-100 font-medium">
                            30% Volume Limit
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-600 tabular-nums">
                          KES {(assessment?.calculated_limit || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="pt-3 border-t border-white/5">
                        <p className="text-[10px] text-muted-foreground font-medium leading-relaxed italic">
                          "Limits are strictly capped at 30% of your 3-month average volume."
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-emerald-500/5 p-3 border-t border-emerald-500/10 flex justify-between items-center">
                      <div className="flex items-center gap-1.5 text-[8px] text-emerald-600 font-bold uppercase tracking-wider">
                        <ShieldCheck className="w-3 h-3" /> SECURE LEDGER
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6 rounded-full hover:bg-emerald-500/10 text-emerald-600"
                        onClick={() => window.location.reload()}
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    </CardFooter>
                  </Card>

                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-2 backdrop-blur-sm shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-40 transition-opacity">
                      <Sparkles className="w-12 h-12 text-primary" />
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm relative z-10">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="font-bold uppercase text-[9px] tracking-wider text-slate-950 dark:text-white relative z-10">
                      Limit Expansion Tip
                    </h4>
                    <p className="text-[10px] text-muted-foreground font-medium leading-tight relative z-10">
                      Increase your monthly transaction volume to unlock up to 30% borrowing power
                      based on your history.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="tracker"
              className="focus-visible:outline-none space-y-4 animate-in fade-in duration-500"
            >
              {activeLoan ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="md:col-span-2 rounded-2xl border border-white/10 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl overflow-hidden shadow-lg">
                    <CardHeader className="p-4 pb-0.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold text-slate-950 dark:text-white">
                            {t("loans.tracker.credit_line")}
                          </CardTitle>
                          <CardDescription className="font-medium text-[10px] opacity-60">
                            {t("loans.tracker.active_disbursement", {
                              id: activeLoan.id.slice(0, 8),
                            })}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-semibold uppercase tracking-wider border border-emerald-500/20 shadow-sm">
                            {activeLoan.status}
                          </div>
                          {activeLoan.months_already_extended > 0 && (
                            <div className="text-[7px] font-bold text-primary uppercase tracking-tighter">
                              Extended {activeLoan.months_already_extended}x
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 py-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="space-y-0.5">
                          <span className="text-[8px] text-muted-foreground uppercase tracking-wider font-semibold opacity-70">
                            {t("loans.tracker.original")}
                          </span>
                          <p className="text-base font-bold text-slate-950 dark:text-white tabular-nums">
                            KES {parseFloat(activeLoan.amount).toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[8px] text-muted-foreground uppercase tracking-wider font-semibold opacity-70">
                            {t("loans.tracker.repaid")}
                          </span>
                          <p className="text-base font-bold text-emerald-600 tabular-nums">
                            KES{" "}
                            {(
                              parseFloat(activeLoan.amount) * (1 + activeLoan.interest_rate / 100) -
                              parseFloat(activeLoan.remaining_balance)
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[8px] text-muted-foreground uppercase tracking-wider font-semibold opacity-70">
                            {t("loans.tracker.due")}
                          </span>
                          <p className="text-base font-bold text-destructive tabular-nums">
                            {format(new Date(activeLoan.due_date), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-semibold">
                          <span className="text-muted-foreground uppercase tracking-wider opacity-60">
                            {t("loans.tracker.progress")}
                          </span>
                          <span className="text-emerald-600">
                            {Math.round(
                              ((parseFloat(activeLoan.amount) *
                                (1 + activeLoan.interest_rate / 100) -
                                parseFloat(activeLoan.remaining_balance)) /
                                (parseFloat(activeLoan.amount) *
                                  (1 + activeLoan.interest_rate / 100))) *
                                100,
                            )}
                            %
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden border border-white/5">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                            style={{
                              width: `${
                                ((parseFloat(activeLoan.amount) *
                                  (1 + activeLoan.interest_rate / 100) -
                                  parseFloat(activeLoan.remaining_balance)) /
                                  (parseFloat(activeLoan.amount) *
                                    (1 + activeLoan.interest_rate / 100))) *
                                100
                              }%`,
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
                        {t("loans.tracker.repay_btn")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl h-9 border-white/10 font-bold text-xs hover:bg-emerald-500/10 active:scale-95 transition-all"
                        onClick={() => setShowExtensionPopup(true)}
                        disabled={!extensionAssessment}
                      >
                        Request Extension
                      </Button>
                    </CardFooter>
                  </Card>

                  <div className="space-y-3">
                    <Card className="rounded-2xl border border-white/10 bg-white/70 dark:bg-slate-950/60 backdrop-blur-xl shadow-md overflow-hidden">
                      <CardHeader className="p-3 pb-0.5">
                        <div className="flex items-center gap-2">
                          <History className="w-3.5 h-3.5 text-muted-foreground" />
                          <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-950 dark:text-white">
                            {t("loans.tracker.history")}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 p-3 pt-1.5">
                        {loanHistory.slice(0, 4).map((loan) => (
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
                              <span
                                className={cn(
                                  "text-[8px] font-semibold uppercase tracking-tight",
                                  loan.status === "paid" ? "text-emerald-500" : "text-primary",
                                )}
                              >
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
                          Trust Score
                        </h4>
                        <p className="text-base font-bold text-slate-950 dark:text-white leading-none">
                          {(loanHistory.filter((l) => l.status === "paid").length * 150 + 400)
                            .toString()
                            .slice(0, 3)}
                          <span className="text-[8px] text-emerald-500 font-bold ml-1 uppercase">
                            ELITE
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
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-1 uppercase italic">
                    {t("loans.tracker.no_active")}
                  </h2>
                  <p className="text-muted-foreground font-medium mb-5 max-w-xs text-[10px]">
                    {t("loans.tracker.ready_boost")}
                  </p>
                  <Button
                    onClick={() => setActiveTab("request")}
                    className="rounded-xl px-5 h-9 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 shadow-md"
                  >
                    {t("loans.tracker.get_loan_btn")}
                  </Button>
                </div>
              )}

              {activeLoan && (
                <div className="mt-6 space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
                  <div className="flex items-center gap-1.5 px-1">
                    <History className="w-3.5 h-3.5 text-emerald-500" />
                    <h3 className="text-xs font-bold uppercase tracking-tight text-slate-950 dark:text-white">
                      {t("loans.tracker.ledger_history")}
                    </h3>
                  </div>
                  <Card className="rounded-2xl border border-white/10 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl overflow-hidden shadow-md">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/5 bg-slate-900/5 dark:bg-white/5">
                            <th className="px-4 py-2 font-bold uppercase tracking-wider text-[8px] text-muted-foreground">
                              {t("common.date")}
                            </th>
                            <th className="px-4 py-2 font-bold uppercase tracking-wider text-[8px] text-muted-foreground">
                              {t("transactions.form.provider")}
                            </th>
                            <th className="px-4 py-2 font-bold uppercase tracking-wider text-[8px] text-muted-foreground">
                              {t("common.type")}
                            </th>
                            <th className="px-4 py-2 font-bold uppercase tracking-wider text-[8px] text-muted-foreground">
                              {t("loans.tracker.paid")}
                            </th>
                            <th className="px-4 py-2 font-bold uppercase tracking-wider text-[8px] text-emerald-600">
                              {t("loans.tracker.balance")}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {ledgerEntries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-emerald-500/5 transition-colors">
                              <td className="px-4 py-2 font-medium text-[10px] opacity-70">
                                {format(new Date(entry.created_at), "MMM d, HH:mm")}
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                    {entry.source.toLowerCase().includes("bank") ? (
                                      <Building2 className="w-2.5 h-2.5 text-emerald-600" />
                                    ) : (
                                      <Smartphone className="w-2.5 h-2.5 text-emerald-600" />
                                    )}
                                  </div>
                                  <span className="font-semibold uppercase tracking-tighter text-[8px]">
                                    {entry.source}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 rounded-full text-[7px] font-bold uppercase tracking-wider border",
                                    entry.payment_type === "automated"
                                      ? "bg-primary/10 text-primary border-primary/20"
                                      : "bg-slate-500/10 text-slate-500 border-slate-500/20",
                                  )}
                                >
                                  {entry.payment_type}
                                </span>
                              </td>
                              <td className="px-4 py-2 font-bold text-[10px] text-slate-950 dark:text-white tabular-nums">
                                KES {parseFloat(entry.amount).toLocaleString()}
                              </td>
                              <td className="px-4 py-2 font-bold text-[10px] text-emerald-600 tabular-nums">
                                KES {parseFloat(entry.remaining_balance).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                          {ledgerEntries.length === 0 && (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-4 py-8 text-center text-muted-foreground font-semibold italic text-[10px]"
                              >
                                {t("loans.tracker.no_activity")}
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
                        {t("common.status")}
                      </p>
                      <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-950 dark:text-white uppercase">
                        {t("loans.status.pending_title")}
                      </h2>
                      <p className="mt-4 text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300 max-w-2xl mx-auto">
                        {t("loans.status.pending_description", {
                          amount: (parseFloat(activeLoan.remaining_balance) || 0).toLocaleString(),
                        })}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <Card className="rounded-[2rem] border border-white/30 bg-white/90 shadow-2xl p-8 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-muted-foreground mb-3">
                          {t("loans.status.outstanding_balance")}
                        </p>
                        <p className="text-3xl sm:text-4xl font-bold text-slate-950 tabular-nums">
                          KES {(parseFloat(activeLoan.remaining_balance) || 0).toLocaleString()}
                        </p>
                        <p className="mt-2 text-xs sm:text-sm text-muted-foreground font-medium">
                          {t("loans.status.remaining_note")}
                        </p>
                      </Card>

                      <Card className="rounded-[2rem] border border-white/30 bg-emerald-500/10 shadow-2xl p-8 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-emerald-700 mb-3">
                          {t("loans.status.potential_boost")}
                        </p>
                        <p className="text-3xl sm:text-4xl font-bold text-emerald-700">
                          +{potentialLimitBoost}%
                        </p>
                        <p className="mt-2 text-xs sm:text-sm text-emerald-950/80 font-medium">
                          {t("loans.status.boost_note")}
                        </p>
                      </Card>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-2">
                      <Button
                        className="h-12 px-8 rounded-full bg-emerald-600 text-white font-bold shadow-xl hover:bg-emerald-700 transition-all"
                        onClick={() => setShowRepayPopup(true)}
                      >
                        {t("loans.status.pay_now_btn")}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-12 px-8 rounded-full border-white/30 text-slate-950 dark:text-white font-bold hover:bg-white/10 transition-all"
                        onClick={() => setActiveTab("tracker")}
                      >
                        {t("loans.status.view_tracker_btn")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <h2 className="text-xl font-bold text-slate-950 dark:text-white mb-3">
                      {t("loans.status.no_pending_title")}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      {t("loans.status.no_pending_desc")}
                    </p>
                    <Button
                      onClick={() => setActiveTab("request")}
                      className="rounded-full px-6 h-11 font-bold bg-emerald-600 hover:bg-emerald-700 transition-all"
                    >
                      {t("loans.status.request_btn")}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

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
              <DialogTitle className="text-lg font-bold text-slate-950 dark:text-white">
                {t("loans.repayment_modal.title")}
              </DialogTitle>
              <DialogDescription className="font-medium text-[11px] text-muted-foreground">
                {t("loans.repayment_modal.description")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-900/5 dark:bg-white/5 border border-white/5 text-center">
                <span className="text-[8px] font-semibold uppercase text-muted-foreground tracking-wider">
                  {t("loans.repayment_modal.total_outstanding")}
                </span>
                <p className="text-xl font-bold text-slate-950 dark:text-white tabular-nums">
                  KES{" "}
                  {activeLoan ? parseFloat(activeLoan.remaining_balance).toLocaleString() : "0.00"}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("loans.repayment_modal.payment_source")}
                </Label>
                <Select
                  value={repayProvider}
                  onValueChange={(val) => {
                    setRepayProvider(val);
                    setSourceIdentifier("");
                  }}
                >
                  <SelectTrigger className="h-10 rounded-lg bg-muted/10 border-white/10 font-semibold text-xs">
                    <SelectValue placeholder={t("loans.repayment_modal.payment_source")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-xl backdrop-blur-xl border-white/20 z-[100] max-h-[300px] overflow-y-auto">
                    <div className="px-3 py-1.5 text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                      <Smartphone className="w-2.5 h-2.5" /> {t("loans.categories.mobile")}
                    </div>
                    <SelectItem value="mpesa" className="font-medium text-xs">
                      M-Pesa
                    </SelectItem>
                    <SelectItem value="airtel" className="font-medium text-xs">
                      Airtel Money
                    </SelectItem>
                    <div className="px-3 py-1.5 text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1 border-t border-white/5 mt-1">
                      <Building2 className="w-2.5 h-2.5" /> {t("loans.categories.banks")}
                    </div>
                    <SelectItem value="kcb" className="font-medium text-xs">
                      KCB Group
                    </SelectItem>
                    <SelectItem value="equity" className="font-medium text-xs">
                      Equity Bank
                    </SelectItem>
                    <SelectItem value="ncba" className="font-medium text-xs">
                      NCBA Bank
                    </SelectItem>
                    <SelectItem value="absa" className="font-medium text-xs">
                      Absa Kenya
                    </SelectItem>
                    <SelectItem value="coop" className="font-medium text-xs">
                      Co-operative Bank
                    </SelectItem>
                    <SelectItem value="stanbic" className="font-medium text-xs">
                      Stanbic Bank
                    </SelectItem>
                    <SelectItem value="im" className="font-medium text-xs">
                      I&M Bank
                    </SelectItem>
                    <SelectItem value="dtb" className="font-medium text-xs">
                      Diamond Trust Bank
                    </SelectItem>
                    <SelectItem value="family" className="font-medium text-xs">
                      Family Bank Kenya
                    </SelectItem>
                    <div className="px-3 py-1.5 text-[8px] font-bold text-muted-foreground uppercase flex items-center gap-1 border-t border-white/5 mt-1">
                      <Wallet className="w-2.5 h-2.5" /> {t("loans.categories.vault")}
                    </div>
                    <SelectItem
                      value="vault_balance"
                      className="font-bold text-emerald-600 text-xs"
                    >
                      Vault Account
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {repayProvider && repayProvider !== "vault_balance" && (
                <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-300">
                  <Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {["mpesa", "airtel"].includes(repayProvider)
                      ? t("transactions.form.phone_number")
                      : t("transactions.form.account_number")}
                  </Label>
                  <div className="relative">
                    {["mpesa", "airtel"].includes(repayProvider) ? (
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <Input
                      placeholder={
                        ["mpesa", "airtel"].includes(repayProvider) ? "07123..." : "1234567..."
                      }
                      value={sourceIdentifier}
                      onChange={(e) => setSourceIdentifier(e.target.value)}
                      className="h-10 pl-9 rounded-lg bg-muted/5 border-white/10 font-medium text-xs text-slate-950 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("common.amount")} (KES)
                </Label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    className="h-10 pl-9 rounded-lg bg-muted/5 border-white/10 font-bold text-xs text-slate-950 dark:text-white tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-10 rounded-lg font-bold text-xs border-white/10"
                onClick={() => setShowRepayPopup(false)}
              >
                {t("common.back")}
              </Button>
              <Button
                className="flex-1 h-10 rounded-lg font-bold text-xs shadow-md bg-emerald-600 hover:bg-emerald-700"
                onClick={handleRepayment}
              >
                {t("loans.repayment_modal.process_btn")} <Check className="ml-1.5 w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* EXTENSION POPUP MODAL */}
      <Dialog open={showExtensionPopup} onOpenChange={setShowExtensionPopup}>
        <DialogContent className="max-w-sm rounded-2xl border-white/10 bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl p-0 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="relative p-5">
            <button
              onClick={() => setShowExtensionPopup(false)}
              className="absolute right-4 top-4 w-6 h-6 rounded-full bg-muted/20 flex items-center justify-center hover:bg-muted/40 transition-colors z-20"
            >
              <X className="w-3 h-3" />
            </button>

            <DialogHeader className="mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2 border border-primary/20">
                <RefreshCw className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-950 dark:text-white">
                Request Loan Extension
              </DialogTitle>
              <DialogDescription className="font-medium text-[11px] text-muted-foreground">
                Extend your repayment deadline by 30 days.
              </DialogDescription>
            </DialogHeader>

            {extensionAssessment && activeLoan && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/5 dark:bg-white/5 border border-white/5 text-center">
                    <span className="text-[8px] font-semibold uppercase text-muted-foreground tracking-wider">
                      Extension Penalty
                    </span>
                    <p className="text-base font-bold text-primary tabular-nums">
                      KES {extensionAssessment.extension_penalties.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/5 dark:bg-white/5 border border-white/5 text-center">
                    <span className="text-[8px] font-semibold uppercase text-muted-foreground tracking-wider">
                      New Total Due
                    </span>
                    <p className="text-base font-bold text-slate-950 dark:text-white tabular-nums">
                      KES {extensionAssessment.total_repayment_due.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-3 h-3 text-emerald-600" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                      New Deadline
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-950 dark:text-white">
                    {format(addMonths(new Date(activeLoan.due_date), 1), "MMMM d, yyyy")}
                  </p>
                  <p className="mt-1 text-[8px] text-muted-foreground leading-tight">
                    Every extension adds a 1% penalty (max 3%). Your credit score will remain
                    unaffected if extended before the deadline.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-10 rounded-lg font-bold text-xs border-white/10"
                onClick={() => setShowExtensionPopup(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-10 rounded-lg font-bold text-xs shadow-md bg-emerald-600 hover:bg-emerald-700"
                onClick={handleRequestExtension}
                disabled={extensionAssessment?.status === "error"}
              >
                Confirm Extension
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
