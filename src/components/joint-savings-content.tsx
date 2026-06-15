import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Users,
  Plus,
  Target,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
  UserPlus,
  Info,
  ChevronRight,
  PiggyBank,
  History,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useJointSavings } from "@/hooks/use-joint-savings";
import { formatWithCommas, parseFormattedNumber } from "@/lib/utils";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useProfileSignal } from "@/lib/profile-signal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function JointSavingsContent() {
  const { t } = useTranslation();
  const [profile] = useProfileSignal();
  const {
    pots,
    selectedPot,
    setSelectedPotId,
    members,
    contributions,
    requests,
    loading,
    createPot,
    inviteMember,
    deposit,
    requestWithdrawal,
    approveWithdrawal,
    invites,
    acceptInvite,
    declineInvite,
  } = useJointSavings();

  const [activeTab, setActiveTab] = useState("overview");

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Form states
  const [newPotTitle, setNewPotTitle] = useState("");
  const [newPotDesc, setNewPotDesc] = useState("");
  const [newPotTarget, setNewPotTarget] = useState("");
  const [initialMembers, setInitialMembers] = useState("");

  const [inviteTag, setInviteTag] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("");

  const jointQuotes = [
    { en: "Two hearts, one nest", sw: "Mioyo miwili, kiota kimoja" },
    { en: "Saving together, growing together", sw: "Kuweka akiba pamoja, kukuwa pamoja" },
    { en: "Unity is strength", sw: "Umoja ni nguvu" },
    { en: "Little by little fills the pot", sw: "Haba na haba hujaza kibaba" },
    { en: "Our dream, our future", sw: "Ndoto yetu, maisha yetu" },
    { en: "A Joint Saving built on trust", sw: "Akiba ya pamoja iliyojengwa kwa uaminifu" },
    { en: "Together we reach the goal", sw: "Pamoja tunafika lengo" },
  ];

  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % jointQuotes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [jointQuotes.length]);

  const handleCreatePot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPotTitle || !newPotTarget) return;
    const memberTags = initialMembers
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== "");
    await createPot(newPotTitle, newPotDesc, parseFormattedNumber(newPotTarget), memberTags);
    setActiveTab("overview");
    setNewPotTitle("");
    setNewPotDesc("");
    setNewPotTarget("");
    setInitialMembers("");
  };

  const handleInvite = async () => {
    if (!selectedPot || !inviteTag) return;
    await inviteMember(selectedPot.id, inviteTag);
    setShowInviteModal(false);
    setInviteTag("");
  };

  const handleDeposit = async () => {
    if (!selectedPot || !depositAmount) return;
    await deposit(selectedPot.id, parseFormattedNumber(depositAmount));
    setShowDepositModal(false);
    setDepositAmount("");
  };

  const handleWithdrawRequest = async () => {
    if (!selectedPot || !withdrawAmount) return;
    await requestWithdrawal(selectedPot.id, parseFormattedNumber(withdrawAmount), withdrawReason);
    setShowWithdrawModal(false);
    setWithdrawAmount("");
    setWithdrawReason("");
  };

  if (loading && pots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Loading Joint Savings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-center mb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList className="h-11 bg-white/20 dark:bg-slate-900/40 backdrop-blur-md p-1 rounded-2xl border border-white/20">
            <TabsTrigger
              value="overview"
              className="rounded-xl font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="rounded-xl font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              Activity
            </TabsTrigger>
            <TabsTrigger
              value="setup"
              className="rounded-xl font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              New Pot
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsContent value="overview" className="space-y-8 animate-in fade-in duration-500">
          {/* Pots Selection Bar */}
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 shadow-xl overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 px-4 border-r border-white/20 shrink-0">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Shared Pots
              </span>
            </div>
            <div className="flex gap-3">
              {pots.map((p) => (
                <Button
                  key={p.id}
                  variant={selectedPot?.id === p.id ? "default" : "outline"}
                  className={cn(
                    "h-11 rounded-2xl font-medium transition-all duration-500",
                    selectedPot?.id === p.id
                      ? "px-6 bg-primary text-primary-foreground shadow-2xl scale-105"
                      : "bg-white/50 dark:bg-slate-800/50",
                  )}
                  onClick={() => setSelectedPotId(p.id)}
                >
                  {p.title}
                </Button>
              ))}
              <Button
                variant="outline"
                className="h-11 px-4 rounded-2xl border-dashed border-primary/40 text-primary hover:bg-primary/10 hover:border-primary font-medium transition-all duration-300"
                onClick={() => setActiveTab("setup")}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Pot
              </Button>
            </div>
          </div>

          {/* Invites Section */}
          {invites.length > 0 && (
            <div className="p-6 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 backdrop-blur-xl animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-amber-500 text-white shadow-lg">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">New Pot Invitations</h3>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    You have been invited to join shared savings pots.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {invites.map((invite) => (
                  <Card
                    key={invite.id}
                    className="rounded-2xl border-amber-500/30 bg-white/80 dark:bg-slate-900/80 shadow-xl"
                  >
                    <CardHeader className="p-4">
                      <CardTitle className="text-base font-medium">{invite.pot?.title}</CardTitle>
                      <CardDescription className="text-[10px] font-medium uppercase tracking-widest">
                        Created by Admin
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="p-4 pt-0 flex gap-2">
                      <Button
                        className="flex-1 h-9 rounded-xl text-xs font-medium bg-amber-500 hover:bg-amber-600"
                        onClick={() => acceptInvite(invite.pot_id)}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="ghost"
                        className="flex-1 h-9 rounded-xl text-xs font-medium"
                        onClick={() => declineInvite(invite.pot_id)}
                      >
                        Ignore
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {!selectedPot ? (
            <div className="text-center py-20 bg-white/40 dark:bg-slate-900/40 rounded-[3rem] border border-white/20 backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-[0.03] pointer-events-none transition-transform duration-[10s] group-hover:scale-110">
                <svg viewBox="0 0 100 100" className="w-full h-full fill-primary">
                  <path d="M20,50 C20,30 40,30 50,50 C60,30 80,30 80,50 C80,70 50,90 50,90 C50,90 20,70 20,50" />
                </svg>
              </div>
              <div className="relative z-10 space-y-8">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                  <img
                    src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80&w=400&h=400"
                    alt="Partnership Excellence"
                    className="w-48 h-48 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.2)] mx-auto object-cover object-center border-4 border-white/50 dark:border-slate-800/50 relative z-10"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-3 rounded-full shadow-2xl z-20 border-4 border-white dark:border-slate-900 transform group-hover:rotate-12 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-medium tracking-tighter text-slate-950 dark:text-white uppercase">
                    Joint Strategic Reserve
                  </h2>
                  <p className="text-muted-foreground max-w-lg mx-auto text-lg font-medium italic leading-relaxed">
                    "Alone we can do so little; together we can do so much."
                  </p>
                </div>
                <Button
                  className="h-14 rounded-2xl font-medium px-12 shadow-2xl bg-primary text-xl transition-all hover:scale-105 active:scale-95"
                  onClick={() => setActiveTab("setup")}
                >
                  Start Your Joint Savings (Chama)
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Main Pot View */}
              <Card className="lg:col-span-2 rounded-[2rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl overflow-hidden shadow-2xl">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-medium">{selectedPot.title}</CardTitle>
                      <CardDescription className="font-medium mt-1">
                        {selectedPot.description}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground mb-1">
                        Total Balance
                      </span>
                      <span className="text-2xl font-medium text-emerald-600">
                        KES {selectedPot.balance?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Progress and Target */}
                  <div className="p-6 rounded-3xl bg-slate-100 dark:bg-slate-900 shadow-inner space-y-4">
                    <div className="flex justify-between items-end mb-2">
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                          Progress towards goal
                        </p>
                        <p className="text-lg font-medium">
                          KES {selectedPot.target_amount.toLocaleString()} Target
                        </p>
                      </div>
                      <span className="text-2xl font-medium text-primary">
                        {Math.round((selectedPot.balance! / selectedPot.target_amount) * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={(selectedPot.balance! / selectedPot.target_amount) * 100}
                      className="h-3 rounded-full"
                    />
                  </div>

                  {/* Members Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" /> Members
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary font-medium hover:bg-primary/10 rounded-xl"
                        onClick={() => setShowInviteModal(true)}
                      >
                        <UserPlus className="w-4 h-4 mr-2" /> Invite Member
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-white/20 flex items-center gap-4 transition-all hover:shadow-lg"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary border border-primary/20">
                            {member.profile?.first_name?.[0] || "?"}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {member.profile?.first_name} {member.profile?.last_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                              {member.status === "active"
                                ? `Member since ${format(new Date(member.joined_at || member.created_at), "MMM dd")}`
                                : `Invited ${format(new Date(member.created_at), "MMM dd")}`}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[8px] font-medium uppercase tracking-wider",
                                member.role === "admin"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
                              )}
                            >
                              {member.role}
                            </span>
                            {member.status === "invited" && (
                              <span className="text-[8px] font-medium text-muted-foreground animate-pulse italic">
                                Pending...
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Button
                      className="flex-1 h-12 rounded-2xl text-base font-medium bg-emerald-600 hover:bg-emerald-700 shadow-xl"
                      onClick={() => setShowDepositModal(true)}
                    >
                      <ArrowUpRight className="w-5 h-5 mr-2" /> Deposit Funds
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-12 rounded-2xl text-base font-medium border-2"
                      onClick={() => setShowWithdrawModal(true)}
                    >
                      <ArrowDownLeft className="w-5 h-5 mr-2" /> Request Withdrawal
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sidebar items */}
              <div className="space-y-8">
                {/* Romantic/Cooperative Quote Display */}
                <div className="p-6 rounded-[2rem] bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 backdrop-blur-xl text-center relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                  <Sparkles className="w-8 h-8 text-primary mx-auto mb-3 opacity-50" />
                  <div className="min-h-[80px] flex flex-col justify-center transition-all duration-1000">
                    <p className="text-xl font-serif italic text-primary dark:text-primary-foreground leading-relaxed animate-in fade-in zoom-in duration-1000">
                      "{jointQuotes[quoteIndex].sw}"
                    </p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-widest text-muted-foreground opacity-70">
                      {jointQuotes[quoteIndex].en}
                    </p>
                  </div>
                  <div className="mt-4 flex justify-center gap-1.5">
                    {jointQuotes.map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full transition-all duration-500",
                          i === quoteIndex ? "bg-primary w-4" : "bg-primary/20",
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Withdrawal Requests */}
                <Card className="rounded-[2rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl overflow-hidden shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-medium flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-amber-500" /> Approvals Needed
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Withdrawals require approval from all members
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {requests.length === 0 ? (
                      <div className="text-center py-10 opacity-50">
                        <Clock className="w-10 h-10 mx-auto mb-2" />
                        <p className="text-xs font-medium uppercase tracking-widest">
                          No pending requests
                        </p>
                      </div>
                    ) : (
                      requests.map((req) => {
                        const hasApproved = req.approvals?.some((a) => a.user_id === profile?.id);
                        const isRequester = req.requester_id === profile?.id;

                        return (
                          <div
                            key={req.id}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-sm">
                                  KES {req.amount.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                                  Requested by {req.profile?.first_name}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[8px] font-medium uppercase tracking-wider",
                                  req.status === "executed"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700",
                                )}
                              >
                                {req.status}
                              </span>
                            </div>
                            <p className="text-xs italic text-muted-foreground">
                              "{req.reason || "No reason provided"}"
                            </p>

                            {req.status === "pending" && !isRequester && !hasApproved && (
                              <Button
                                className="w-full h-10 rounded-xl font-medium text-xs bg-amber-500 hover:bg-amber-600 text-white"
                                onClick={() => approveWithdrawal(req.id)}
                              >
                                Approve Withdrawal
                              </Button>
                            )}
                            {hasApproved && req.status === "pending" && (
                              <div className="flex items-center justify-center gap-2 text-emerald-600 font-medium text-xs py-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
                                <CheckCircle2 className="w-4 h-4" /> You Approved
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                {/* Recent Contributions */}
                <Card className="rounded-[2rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl overflow-hidden shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-medium flex items-center gap-2">
                      <History className="w-5 h-5 text-primary" /> Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-0">
                    <div className="max-h-[300px] overflow-y-auto no-scrollbar px-6">
                      <div className="space-y-6">
                        {contributions.map((contribution) => (
                          <div key={contribution.id} className="flex items-start gap-4">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                contribution.type === "deposit"
                                  ? "bg-emerald-100 text-emerald-600"
                                  : "bg-red-100 text-red-600",
                              )}
                            >
                              {contribution.type === "deposit" ? (
                                <ArrowUpRight className="w-4 h-4" />
                              ) : (
                                <ArrowDownLeft className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {contribution.profile?.first_name}{" "}
                                {contribution.type === "deposit" ? "deposited" : "withdrew"}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                                {format(new Date(contribution.created_at), "MMM dd, hh:mm a")}
                              </p>
                            </div>
                            <p
                              className={cn(
                                "text-sm font-medium",
                                contribution.type === "deposit"
                                  ? "text-emerald-600"
                                  : "text-red-600",
                              )}
                            >
                              {contribution.type === "deposit" ? "+" : "-"}KES{" "}
                              {contribution.amount.toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="animate-in fade-in duration-500">
          <Card className="rounded-[2rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl overflow-hidden shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl font-medium flex items-center gap-2">
                <History className="w-6 h-6 text-primary" /> Recent Activity
              </CardTitle>
              <CardDescription className="font-medium mt-1">
                Registry of all capital movements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {contributions.length === 0 ? (
                  <div className="text-center py-20 opacity-50">
                    <History className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="font-medium uppercase tracking-[0.2em]">
                      No activity recorded yet
                    </p>
                  </div>
                ) : (
                  contributions.map((contribution) => (
                    <div
                      key={contribution.id}
                      className="flex items-center gap-4 p-4 rounded-2xl hover:bg-primary/5 transition-colors border border-transparent hover:border-primary/10"
                    >
                      <div
                        className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                          contribution.type === "deposit"
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-red-100 text-red-600",
                        )}
                      >
                        {contribution.type === "deposit" ? (
                          <ArrowUpRight className="w-6 h-6" />
                        ) : (
                          <ArrowDownLeft className="w-6 h-6" />
                        )}
                      </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-medium truncate">
                            {contribution.profile?.first_name}{" "}
                            {contribution.type === "deposit" ? "deposited" : "withdrew"}
                          </p>
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                            {format(new Date(contribution.created_at), "MMMM dd, yyyy • hh:mm a")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={cn(
                              "text-lg font-medium",
                              contribution.type === "deposit" ? "text-emerald-600" : "text-red-600",
                            )}
                          >
                            {contribution.type === "deposit" ? "+" : "-"}KES{" "}
                            {contribution.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl overflow-hidden shadow-2xl">
              <CardHeader>
                <CardTitle className="text-2xl font-medium flex items-center gap-2">
                  <Target className="w-6 h-6 text-primary" /> Active Protocols Registry
                </CardTitle>
                <CardDescription className="font-medium mt-1">
                  Comprehensive log of your joint ventures
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/40 bg-muted/20">
                        <th className="px-6 py-4 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                          Pot Title
                        </th>
                        <th className="px-6 py-4 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                          Target Amount
                        </th>
                        <th className="px-6 py-4 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground text-right">
                          Initiated Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {pots.map((p) => (
                        <tr
                          key={p.id}
                          className="hover:bg-primary/5 transition-colors cursor-pointer group"
                          onClick={() => {
                            setSelectedPotId(p.id);
                            setActiveTab("overview");
                          }}
                        >
                          <td className="px-6 py-5">
                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                              {p.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                              {p.description}
                            </p>
                          </td>
                          <td className="px-6 py-5">
                            <span className="text-sm font-medium text-emerald-600">
                              KES {p.target_amount.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className="text-[11px] text-muted-foreground font-medium">
                              {format(new Date(p.created_at), "MMM dd, yyyy")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="setup" className="animate-in slide-in-from-bottom-4 duration-500">
          <div className="max-w-2xl mx-auto">
            <Card className="rounded-[2rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl p-8 shadow-2xl">
              <div className="mb-8 flex items-center gap-4">
                <div className="w-12 h-12 rounded-3xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold uppercase tracking-tight text-slate-950 dark:text-white">
                    Initialize Shared Protocol
                  </h2>
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60">
                    Architect a collective capital pool for mutual growth.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreatePot} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-widest ml-1">
                    Protocol Title
                  </Label>
                  <Input
                    placeholder="e.g. Real Estate Venture, Holiday Fund"
                    value={newPotTitle}
                    onChange={(e) => setNewPotTitle(e.target.value)}
                    className="h-12 rounded-2xl bg-white/50 dark:bg-slate-900 border-none font-medium text-lg px-6 shadow-sm"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-widest ml-1">
                    Aggregate Target (KES)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-medium text-muted-foreground">
                      KES
                    </span>
                    <Input
                      placeholder="0.00"
                      value={newPotTarget}
                      onChange={(e) => setNewPotTarget(formatWithCommas(e.target.value))}
                      className="h-12 rounded-2xl bg-white/50 dark:bg-slate-900 border-none font-medium text-lg pl-16 pr-6 shadow-sm tabular-nums"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-widest ml-1">
                    Strategic Description
                  </Label>
                  <Input
                    placeholder="Define the primary objective of this capital pool..."
                    value={newPotDesc}
                    onChange={(e) => setNewPotDesc(e.target.value)}
                    className="h-12 rounded-2xl bg-white/50 dark:bg-slate-900 border-none font-medium text-lg px-6 shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-widest ml-1">
                    Invite Alliance Members (KYC Tags)
                  </Label>
                  <div className="relative group">
                    <UserPlus className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      placeholder="e.g. @james, @mary (comma separated)"
                      value={initialMembers}
                      onChange={(e) => setInitialMembers(e.target.value)}
                      className="h-12 rounded-2xl bg-white/50 dark:bg-slate-900 border-none font-medium text-lg pl-16 pr-6 shadow-sm focus:ring-2 ring-primary/20 transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground ml-2 font-medium uppercase tracking-wider opacity-60">
                    Members will receive an invitation to join this pot immediately.
                  </p>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full h-14 rounded-[1.5rem] text-xl font-semibold shadow-2xl bg-primary hover:scale-[1.02] transition-all"
                  >
                    Deploy Joint Protocol
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODALS */}

      {/* Invite Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="max-w-md rounded-2xl border border-white/30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-medium">Invite to Pot</DialogTitle>
            <DialogDescription className="font-medium text-muted-foreground">
              Enter the KYC tag of the user you want to invite.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-widest">User Tag</Label>
              <div className="relative">
                <Input
                  placeholder="@username"
                  value={inviteTag}
                  onChange={(e) => setInviteTag(e.target.value)}
                  className="h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border-none font-medium pl-4"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full h-12 rounded-xl font-medium shadow-xl"
              onClick={handleInvite}
            >
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deposit Modal */}
      <Dialog open={showDepositModal} onOpenChange={setShowDepositModal}>
        <DialogContent className="max-w-md rounded-2xl border border-white/30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-medium">Add Funds to Pot</DialogTitle>
            <DialogDescription className="font-medium text-muted-foreground">
              Amount will be deducted from your Vault wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2 text-center py-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-emerald-600 mb-2">
                Available Balance
              </p>
              <p className="text-3xl font-medium text-emerald-700">
                KES {selectedPot?.balance?.toLocaleString() || "0"}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-widest">
                Amount (KES)
              </Label>
              <Input
                placeholder="0.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(formatWithCommas(e.target.value))}
                className="h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border-none font-medium text-xl text-center tabular-nums"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full h-12 rounded-xl font-medium shadow-xl bg-emerald-600"
              onClick={handleDeposit}
            >
              Confirm Deposit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Modal */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent className="max-w-md rounded-2xl border border-white/30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-medium">Request Withdrawal</DialogTitle>
            <DialogDescription className="font-medium text-muted-foreground">
              All other members must approve this before funds are released.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-widest">
                Amount (KES)
              </Label>
              <Input
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(formatWithCommas(e.target.value))}
                className="h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border-none font-medium text-xl text-center tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-widest">
                Reason / Memo
              </Label>
              <Input
                placeholder="e.g. Booking flights, Pay vendor"
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                className="h-11 rounded-xl bg-slate-100 dark:bg-slate-900 border-none font-medium"
              />
            </div>
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
              <XCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400 uppercase leading-relaxed">
                A notification will be sent to all members. They must approve this within their own
                Joint Savings dashboard.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full h-12 rounded-xl font-medium shadow-xl"
              onClick={handleWithdrawRequest}
            >
              Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
