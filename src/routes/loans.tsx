import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
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
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  "5": 5,
  "7": 6,
  "9": 7,
  "12": 9,
};

type OnboardingData = {
  full_name: string;
  id_number: string;
  kra_pin: string;
  date_of_birth: string;
  nationality: string;
  home_address: string;
  phone_number: string;
  email: string;
};

type DetailedLoanData = {
  next_of_kin_name: string;
  next_of_kin_phone: string;
  next_of_kin_relationship: string;
  employment_status: string;
  monthly_income: number;
  active_credit_obligations: string;
  detailed_use: string;
  agree_to_terms: boolean;
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
    full_name: profile?.full_name || (profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : ""),
    id_number: profile?.id_number || "",
    kra_pin: profile?.kra_pin || "",
    date_of_birth: profile?.date_of_birth || "",
    nationality: profile?.nationality || "",
    home_address: profile?.home_address || "",
    phone_number: profile?.phone_number || "",
    email: profile?.email || "",
  });

  const questions = [
    {
      id: "full_name",
      label: "Full Name (as it appears on official documents)",
      description: "Must match your ID or Passport exactly.",
      type: "text",
    },
    {
      id: "id_number",
      label: "National ID Number or Passport Number",
      description: "Government issued identification.",
      type: "text",
    },
    {
      id: "kra_pin",
      label: "KRA PIN",
      description: "Kenya Revenue Authority Personal Identification Number.",
      type: "text",
    },
    {
      id: "date_of_birth",
      label: "Date of Birth",
      description: "Your official date of birth.",
      type: "date",
    },
    {
      id: "nationality",
      label: "Nationality",
      description: "Your country of citizenship.",
      type: "text",
    },
    {
      id: "home_address",
      label: "Current Residential Address (County/Town)",
      description: "Where you currently live (e.g., Nairobi, Kilimani).",
      type: "text",
    },
    {
      id: "phone_number",
      label: "Primary Phone Number",
      description: "Your active contact phone number.",
      type: "text",
    },
    {
      id: "email",
      label: "Primary Email Address",
      description: "Your active contact email address.",
      type: "email",
    },
  ];

  const current = questions[step] || {};

  const handleNext = () => {
    if (!current.id) return;
    const value = data[current.id as keyof OnboardingData];
    if (value === undefined || value === "") {
      toast.error("Please provide a valid answer.");
      return;
    }
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else if (step === questions.length - 1) {
      setStep(questions.length); // Final review
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
          <p className="text-xs text-muted-foreground font-medium">Please confirm your details are accurate.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-slate-900/5 dark:bg-white/5 border border-white/10 shadow-inner">
          {questions.map((q) => (
            <div key={q.id} className="space-y-1">
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{q.label}</span>
              <p className="text-sm font-bold text-slate-950 dark:text-white truncate">
                {data[q.id as keyof OnboardingData]}
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
          <p className="text-xs text-muted-foreground font-medium">
            {current.description}
          </p>
        </div>

        <div className="relative">
          <Input
            type={current.type}
            value={data[current.id as keyof OnboardingData] || ""}
            onChange={(e) => setData(prev => ({ ...prev, [current.id!]: e.target.value }))}
            placeholder="Enter details..."
            className="h-14 text-xl font-bold rounded-2xl bg-white/40 dark:bg-slate-900/40 border-white/10 focus:ring-emerald-500/20"
            autoFocus
          />
        </div>
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
  const [profile, refreshProfile] = useProfileSignal();

  const membershipMonths = useMemo(() => {
    if (!profile?.created_at) return 0;
    return Math.max(0, Math.floor((new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)));
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

  const [showAmountForm, setShowAmountForm] = useState(false);
  const [assessment, setAssessment] = useState<any>(null);
  const [extensionAssessment, setExtensionAssessment] = useState<any>(null);
  const [showExtensionPopup, setShowExtensionPopup] = useState(false);

  const isKycExpired = useMemo(() => {
    if (!profile?.kyc_verified_at) return false;
    const verifiedDate = new Date(profile.kyc_verified_at);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return verifiedDate < oneYearAgo;
  }, [profile?.kyc_verified_at]);

  const isProfileComplete = useMemo(() => {
    const hasStatus = profile?.kyc_status === "verified";
    const hasRequiredFields = !!(
      profile?.full_name &&
      profile?.id_number &&
      profile?.kra_pin &&
      profile?.date_of_birth &&
      profile?.nationality &&
      profile?.home_address &&
      profile?.phone_number &&
      profile?.email
    );
    return hasStatus && hasRequiredFields && !isKycExpired;
  }, [profile, isKycExpired]);

  const [detailedData, setDetailedData] = useState<DetailedLoanData>({
    next_of_kin_name: "",
    next_of_kin_phone: "",
    next_of_kin_relationship: "Spouse",
    employment_status: "",
    monthly_income: 0,
    active_credit_obligations: "",
    detailed_use: "",
    agree_to_terms: false,
  });

  useEffect(() => {
    const checkExpiry = async () => {
      if (profile?.id && profile?.kyc_status === "verified" && isKycExpired) {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .update({
              kyc_status: "unverified",
              kyc_verified_at: null
            })
            .eq("id", profile.id)
            .select("*")
            .single();
          if (error) throw error;
          if (data) refreshProfile(data);
          toast.info("Your annual verification has expired. Please verify your details again.");
        } catch (err) {
          console.error("Error resetting expired KYC:", err);
        }
      }
    };
    checkExpiry();
  }, [profile?.id, profile?.kyc_status, isKycExpired, refreshProfile]);

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
    } catch (error: any) {
      console.error("Error fetching loan data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoanData();
  }, [profile?.id]);

  useEffect(() => {
    const fetchAssessment = async () => {
      if (!profile?.id || !loanAmount || isNaN(parseFloat(loanAmount))) return;
      try {
        const { data, error } = await supabase.rpc("calculate_loan_assessment", {
          p_requested_amount: parseFloat(loanAmount),
          p_requested_period_months: parseInt(period),
        });
        if (error) throw error;
        setAssessment(data);
      } catch (err) {
        console.error("Assessment error:", err);
      }
    };
    fetchAssessment();
  }, [profile?.id, loanAmount, period]);

  // Redirect to tracker tab if there is an active loan on page load
  useEffect(() => {
    if (activeLoan && activeTab === "request") {
      setActiveTab("tracker");
    }
  }, [activeLoan]);

  const handleOnboardingComplete = async (onboardingData: OnboardingData) => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: onboardingData.full_name,
          id_number: onboardingData.id_number,
          kra_pin: onboardingData.kra_pin,
          date_of_birth: onboardingData.date_of_birth || null,
          nationality: onboardingData.nationality,
          home_address: onboardingData.home_address,
          phone_number: onboardingData.phone_number,
          email: onboardingData.email,
          kyc_status: "verified",
          kyc_verified_at: new Date().toISOString()
        })
        .eq("id", profile.id)
        .select("*")
        .single();

      if (error) throw error;
      toast.success("Demographics Verified!", { description: "You can now proceed with your loan application." });
      if (data) refreshProfile(data);
    } catch (err: any) {
      toast.error("Failed to verify demographics", { description: err.message });
    }
  };

  const confirmLoanDisbursement = async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase.rpc("disburse_loan", {
        p_amount: parseFloat(loanAmount),
        p_interest_rate: assessment?.base_interest || INTEREST_RATES[period],
        p_repayment_period: parseInt(period),
        p_detailed_use: detailedData.detailed_use,
        p_employment_status: detailedData.employment_status,
        p_monthly_income: detailedData.monthly_income,
        p_active_credit_obligations: detailedData.active_credit_obligations,
        p_next_of_kin_name: detailedData.next_of_kin_name,
        p_next_of_kin_phone: detailedData.next_of_kin_phone
      });

      if (error) throw error;

      if (data.success) {
        toast.success(t("loans.toasts.approved"), {
          description: `Loan of KES ${parseFloat(loanAmount).toLocaleString()} disbursed successfully.`,
        });
        await fetchLoanData();
        setActiveTab("tracker");
        setShowAmountForm(false);
        setDetailedData(prev => ({
          ...prev,
          detailed_use: "",
          employment_status: "",
          monthly_income: 0,
          active_credit_obligations: "",
          next_of_kin_name: "",
          next_of_kin_phone: ""
        }));
        setLoanAmount("");
        
        // Fetch updated profile to refresh client state
        const { data: updatedProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", profile.id)
          .maybeSingle();
        if (updatedProfile) refreshProfile(updatedProfile);
      } else {
        toast.error(t("loans.toasts.failed"), { description: data.message });
      }
    } catch (err: any) {
      toast.error(t("common.error"), { description: err.message });
    }
  };

  const handleRequestExtension = async () => {
    if (!activeLoan) return;
    try {
      const newDueDate = addMonths(new Date(activeLoan.due_date), 1);
      const { error } = await supabase
        .from("loans")
        .update({
          due_date: newDueDate.toISOString(),
          status: 'active'
        })
        .eq("id", activeLoan.id);

      if (error) throw error;
      toast.success("Loan Extended!");
      await fetchLoanData();
      setShowExtensionPopup(false);
    } catch (err: any) {
      toast.error("Extension Failed", { description: err.message });
    }
  };

  const handleRepayment = async () => {
    if (!repayAmount || !repayProvider || !activeLoan) return;
    try {
      const { data, error } = await supabase.rpc("repay_loan", {
        p_loan_id: activeLoan.id,
        p_amount: parseFloat(repayAmount),
        p_source: repayProvider,
        p_payment_type: "manual",
      });
      if (error) throw error;
      if (data.success) {
        toast.success("Repayment Success!");
        await fetchLoanData();
        setShowRepayPopup(false);
        if (data.new_balance === 0) setActiveTab("success");
      }
    } catch (err: any) {
      toast.error("Repayment Failed", { description: err.message });
    }
  };

  return (
    <AppShell>
      <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-fixed opacity-10"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=2070&auto=format&fit=crop")' }}
        />
        
        <main className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-in fade-in duration-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 hover:bg-white/20" onClick={() => window.history.back()}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-4xl font-bold tracking-tight mb-2 text-slate-950 dark:text-white">
                  {t("loans.title")}
                </h1>
                <p className="text-muted-foreground flex items-center gap-2 font-medium text-xs sm:text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  {t("loans.subtitle")}
                </p>
              </div>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList className="grid grid-cols-3 w-full md:w-auto h-12 bg-white/20 dark:bg-slate-900/40 backdrop-blur-md p-1 rounded-2xl border border-white/20">
                <TabsTrigger value="request" className="rounded-xl font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-[10px] sm:text-sm">
                  {t("loans.tabs.request")}
                </TabsTrigger>
                <TabsTrigger value="tracker" className="rounded-xl font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-[10px] sm:text-sm">
                  {t("loans.tabs.tracker")}
                </TabsTrigger>
                <TabsTrigger value="success" className="rounded-xl font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-[10px] sm:text-sm">
                  {t("loans.tabs.status")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsContent value="request" className="focus-visible:outline-none animate-in fade-in duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-6">
                  {activeLoan ? (
                    <Card className="rounded-2xl border border-destructive/20 bg-destructive/5 dark:bg-destructive/10 backdrop-blur-xl p-8 shadow-lg text-center space-y-6 animate-in fade-in duration-500">
                      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mx-auto border border-destructive/20 animate-pulse">
                        <AlertCircle className="w-8 h-8" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-slate-950 dark:text-white">Outstanding Loan</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                          You have an outstanding active loan. Vault enforces a limit of one active loan at a time. Please repay your current outstanding balance to apply for a new loan.
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 max-w-xs mx-auto text-xs font-bold text-destructive">
                        LIMIT OF ONE ACTIVE LOAN UNTIL PAID
                      </div>
                      <Button onClick={() => setActiveTab("tracker")} className="rounded-xl px-6 h-11 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                        View Active Loan Tracker
                      </Button>
                    </Card>
                  ) : !isProfileComplete ? (
                    <Card className="rounded-2xl border border-white/10 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl p-0 shadow-lg overflow-hidden animate-in slide-in-from-top-4 duration-500">
                      <div className="p-4 border-b border-white/10 bg-emerald-500/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                          <h3 className="text-xs font-bold uppercase tracking-wider">Demographics Verification</h3>
                        </div>
                        <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[8px] font-bold">
                          REQUIRED ONCE
                        </div>
                      </div>
                      <div className="p-8">
                        <LoanAssistant onComplete={handleOnboardingComplete} profile={profile} />
                      </div>
                    </Card>
                  ) : !showAmountForm ? (
                    <Card className="rounded-2xl border border-white/10 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl p-0 shadow-lg overflow-hidden animate-in slide-in-from-right-4 duration-500">
                      <div className="p-4 border-b border-white/10 bg-emerald-500/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Send className="w-4 h-4 text-emerald-600" />
                          <h3 className="text-xs font-bold uppercase tracking-wider">Loan Application Form</h3>
                        </div>
                        <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[8px] font-bold">
                          STEP 1: DETAILS
                        </div>
                      </div>
                      <div className="p-8 space-y-8">
                        {/* SECTION 1: NEXT OF KIN */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 px-1">
                            <UserCheck className="w-4 h-4 text-emerald-600" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em]">I. Next of Kin Contacts</h3>
                          </div>
                          <div className="p-6 rounded-2xl bg-slate-500/5 border border-white/5 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Next of Kin Name</Label>
                                <Input 
                                  placeholder="Full Legal Name" 
                                  value={detailedData.next_of_kin_name} 
                                  onChange={(e) => setDetailedData(prev => ({ ...prev, next_of_kin_name: e.target.value }))} 
                                  className="h-12 rounded-xl bg-white/50 dark:bg-slate-900/50 border-white/10" 
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Next of Kin Phone</Label>
                                <Input 
                                  placeholder="07XX XXX XXX" 
                                  value={detailedData.next_of_kin_phone} 
                                  onChange={(e) => setDetailedData(prev => ({ ...prev, next_of_kin_phone: e.target.value }))} 
                                  className="h-12 rounded-xl bg-white/50 dark:bg-slate-900/50 border-white/10" 
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Relationship to Applicant</Label>
                              <Select 
                                value={detailedData.next_of_kin_relationship} 
                                onValueChange={(val) => setDetailedData(prev => ({ ...prev, next_of_kin_relationship: val }))}
                              >
                                <SelectTrigger className="h-12 rounded-xl bg-white/50 dark:bg-slate-900/50 border-white/10">
                                  <SelectValue placeholder="Select Relationship" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Spouse">Spouse</SelectItem>
                                  <SelectItem value="Parent">Parent</SelectItem>
                                  <SelectItem value="Sibling">Sibling</SelectItem>
                                  <SelectItem value="Child">Child</SelectItem>
                                  <SelectItem value="Other">Other Relative</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* SECTION 2: EMPLOYMENT & FINANCIAL STATUS */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 px-1">
                            <Building2 className="w-4 h-4 text-emerald-600" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em]">II. Employment & Income</h3>
                          </div>
                          <div className="p-6 rounded-2xl bg-slate-500/5 border border-white/5 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Current Employment Terms</Label>
                                <Select 
                                  value={detailedData.employment_status} 
                                  onValueChange={(val) => setDetailedData(prev => ({ ...prev, employment_status: val }))}
                                >
                                  <SelectTrigger className="h-12 rounded-xl bg-white/50 dark:bg-slate-900/50 border-white/10">
                                    <SelectValue placeholder="Select Terms" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Permanent">Permanent</SelectItem>
                                    <SelectItem value="Contract">Contract</SelectItem>
                                    <SelectItem value="Self-employed">Self-employed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Net Monthly Income (KES)</Label>
                                <Input 
                                  type="number"
                                  placeholder="Net Monthly Income" 
                                  value={detailedData.monthly_income || ""} 
                                  onChange={(e) => setDetailedData(prev => ({ ...prev, monthly_income: parseFloat(e.target.value) || 0 }))} 
                                  className="h-12 rounded-xl bg-white/50 dark:bg-slate-900/50 border-white/10" 
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Credit Obligations & Outstanding Balances</Label>
                              <textarea 
                                placeholder="Describe existing loans, credit cards, and outstanding balances (if none, write 'None')..." 
                                value={detailedData.active_credit_obligations} 
                                onChange={(e) => setDetailedData(prev => ({ ...prev, active_credit_obligations: e.target.value }))} 
                                className="w-full min-h-[80px] p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-white/10 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm font-medium" 
                              />
                            </div>
                          </div>
                        </div>

                        {/* SECTION 3: PURPOSE */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 px-1">
                            <Send className="w-4 h-4 text-emerald-600" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em]">III. Loan Purpose</h3>
                          </div>
                          <div className="p-6 rounded-2xl bg-slate-500/5 border border-white/5">
                            <Label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 block">Purpose of the Loan</Label>
                            <textarea 
                              placeholder="Please describe how you plan to use these funds..." 
                              value={detailedData.detailed_use} 
                              onChange={(e) => setDetailedData(prev => ({ ...prev, detailed_use: e.target.value }))} 
                              className="w-full min-h-[100px] p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-white/10 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm font-medium leading-relaxed" 
                            />
                          </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-4">
                          <input 
                            type="checkbox" 
                            id="agree_terms" 
                            checked={detailedData.agree_to_terms} 
                            onChange={(e) => setDetailedData(prev => ({ ...prev, agree_to_terms: e.target.checked }))} 
                            className="mt-1 w-5 h-5 rounded-lg border-emerald-500/30 text-emerald-600" 
                          />
                          <Label htmlFor="agree_terms" className="text-[11px] font-bold leading-normal cursor-pointer text-slate-700 dark:text-slate-300">
                            I hereby declare that all information provided is true and accurate. I authorize Vault to verify these details.
                          </Label>
                        </div>

                        <Button 
                          className="w-full h-14 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 shadow-xl uppercase tracking-widest text-xs group" 
                          disabled={
                            !detailedData.next_of_kin_name || 
                            !detailedData.next_of_kin_phone || 
                            !detailedData.employment_status || 
                            !detailedData.monthly_income || 
                            !detailedData.active_credit_obligations || 
                            !detailedData.detailed_use || 
                            !detailedData.agree_to_terms
                          } 
                          onClick={() => setShowAmountForm(true)}
                        >
                          Proceed to Amount Selection <ArrowUpRight className="ml-2 w-5 h-5 group-hover:scale-110 transition-transform" />
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <Card className="rounded-2xl border border-white/10 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl p-8 shadow-lg animate-in slide-in-from-right-4 duration-500">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-emerald-600" />
                          <h3 className="text-xs font-bold uppercase tracking-wider">Amount & Disbursement</h3>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 px-2.5 rounded-lg text-[10px] font-bold" onClick={() => setShowAmountForm(false)}>
                          <ArrowLeft className="w-3 h-3 mr-1.5" /> Back
                        </Button>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-1.5">
                          <Label className="text-[8px] font-semibold uppercase tracking-wider opacity-80">Loan Amount</Label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-medium">KES</span>
                            <Input type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="0.00" className="h-14 pl-12 text-2xl font-black rounded-2xl" required />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1.5">
                            <Label className="text-[8px] font-semibold uppercase tracking-wider opacity-80">Period</Label>
                            <Select value={period} onValueChange={setPeriod}>
                              <SelectTrigger className="h-12 rounded-2xl font-bold"><SelectValue placeholder="Period" /></SelectTrigger>
                              <SelectContent>
                                {Object.keys(INTEREST_RATES).map(k => <SelectItem key={k} value={k}>{k} Months ({INTEREST_RATES[k]}%)</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[8px] font-semibold uppercase tracking-wider opacity-80">Repayment Due</Label>
                            <div className="h-12 flex items-center px-4 rounded-2xl bg-white/20 border border-dashed font-bold text-xs">
                              <Calendar className="w-4 h-4 mr-2 text-emerald-500" /> {format(addMonths(new Date(), parseInt(period)), "MMM d, yyyy")}
                            </div>
                          </div>
                        </div>
                        <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 grid grid-cols-2 gap-4">
                          <div className="space-y-0.5"><span className="text-[7px] uppercase font-black">Principal</span><p className="font-black text-xs">KES {(parseFloat(loanAmount) || 0).toLocaleString()}</p></div>
                          <div className="space-y-0.5"><span className="text-[7px] uppercase font-black">Interest</span><p className="font-black text-emerald-500 text-xs">{INTEREST_RATES[period]}%</p></div>
                          <div className="space-y-0.5 col-span-2"><span className="text-[7px] uppercase font-black">Total Due</span><p className="font-black text-sm text-emerald-600">KES {((parseFloat(loanAmount) || 0) * (1 + INTEREST_RATES[period]/100)).toLocaleString()}</p></div>
                        </div>
                        <Button className="w-full h-14 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 shadow-xl uppercase group" disabled={parseFloat(loanAmount) <= 0 || !!activeLoan} onClick={confirmLoanDisbursement}>
                          Confirm & Disburse Funds <Check className="ml-2 w-6 h-6 group-hover:scale-110" />
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>

                <div className="space-y-4">
                  <Card className="rounded-2xl border border-white/20 bg-white/70 dark:bg-slate-950/60 backdrop-blur-xl p-4 shadow-md">
                    <CardHeader className="p-0 mb-4">
                      <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600" /><CardTitle className="text-[11px] font-bold uppercase">Limit Guard™</CardTitle></div>
                    </CardHeader>
                    <CardContent className="space-y-3 p-0">
                      <div className="flex justify-between items-center text-[10px] font-medium"><span>Membership</span><span className={cn(membershipMonths >= 9 ? "text-emerald-600" : "text-muted-foreground")}>{membershipMonths} / 9 Months</span></div>
                      <div className="flex justify-between items-center text-[10px] font-medium"><span>Profile Status</span><span className={cn(isProfileComplete ? "text-emerald-600" : "text-muted-foreground")}>{isProfileComplete ? "VERIFIED" : "INCOMPLETE"}</span></div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tracker" className="focus-visible:outline-none animate-in fade-in duration-500">
              {activeLoan ? (
                <Card className="rounded-2xl border border-white/10 bg-white/80 dark:bg-slate-950/70 p-8 shadow-lg">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-xl font-bold">Active Loan</h3>
                      <p className="text-xs text-muted-foreground font-medium">ID: {activeLoan.id.slice(0,8).toUpperCase()}</p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20">{activeLoan.status.toUpperCase()}</div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-8">
                    <div><span className="text-[8px] uppercase font-bold text-muted-foreground">Original</span><p className="text-xl font-bold">KES {parseFloat(activeLoan.amount).toLocaleString()}</p></div>
                    <div><span className="text-[8px] uppercase font-bold text-muted-foreground">Remaining</span><p className="text-xl font-bold text-destructive">KES {parseFloat(activeLoan.remaining_balance).toLocaleString()}</p></div>
                    <div><span className="text-[8px] uppercase font-bold text-muted-foreground">Due Date</span><p className="text-xl font-bold">{format(new Date(activeLoan.due_date), "MMM d, yyyy")}</p></div>
                  </div>
                  <div className="flex gap-4">
                    <Button className="flex-1 h-12 rounded-xl font-bold" onClick={() => setShowRepayPopup(true)}>Repay Now</Button>
                    <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setShowExtensionPopup(true)}>Request Extension</Button>
                  </div>
                </Card>
              ) : (
                <div className="text-center py-20">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-bold">No Active Loans</h3>
                  <Button onClick={() => setActiveTab("request")} className="mt-4 rounded-xl px-8 h-11 font-bold bg-emerald-600 text-white">Apply Now</Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="success" className="focus-visible:outline-none text-center py-20 animate-in zoom-in-95 duration-500">
               <div className="relative inline-block mb-6">
                 <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl scale-125 animate-pulse" />
                 <div className="relative w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-lg mx-auto">
                   <Sparkles className="w-12 h-12" />
                 </div>
               </div>
               <h2 className="text-3xl font-black mb-2 text-slate-950 dark:text-white">No Outstanding Balance!</h2>
               <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-6 uppercase tracking-wider">Your credit profile is in excellent standing</p>
               
               <div className="max-w-md mx-auto p-6 rounded-2xl bg-card border border-white/10 dark:bg-slate-950/40 backdrop-blur-md mb-8 shadow-inner">
                 <p className="text-sm italic text-muted-foreground font-serif leading-relaxed">
                   "A satisfied debt is the best asset. Good credit is wealth that doesn't depreciate; it is built on consistency and honor."
                 </p>
                 <div className="h-px bg-white/10 my-4" />
                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Vault Wise Credit Tip</p>
               </div>

               <Button onClick={() => setActiveTab("request")} className="rounded-2xl px-10 h-13 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/10">
                 Request New Loan
               </Button>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* MODALS */}
      <Dialog open={showRepayPopup} onOpenChange={setShowRepayPopup}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader><DialogTitle>Loan Repayment</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <Input type="number" placeholder="Amount to repay" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} className="h-12 rounded-xl" />
            <Select value={repayProvider} onValueChange={setRepayProvider}>
              <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Payment Method" /></SelectTrigger>
              <SelectContent><SelectItem value="vault_balance">Vault Balance</SelectItem></SelectContent>
            </Select>
            <Button className="w-full h-12 rounded-xl font-bold bg-emerald-600" onClick={handleRepayment}>Confirm Repayment</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showExtensionPopup} onOpenChange={setShowExtensionPopup}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader><DialogTitle>Request Extension</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4 text-center">
            <p className="text-sm font-medium">Extend your loan by 30 days for a small processing fee.</p>
            <Button className="w-full h-12 rounded-xl font-bold bg-emerald-600" onClick={handleRequestExtension}>Confirm Extension</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
