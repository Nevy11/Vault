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
  } = useJointSavings();

  const [activeTab, setActiveTab] = useState("overview");

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Form states
  const [newPotTitle, setNewPotTitle] = useState("");
  const [newPotDesc, setNewPotDesc] = useState("");
  const [newPotTarget, setNewPotTarget] = useState("");

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
    await createPot(newPotTitle, newPotDesc, parseFormattedNumber(newPotTarget));
    setActiveTab("overview");
    setNewPotTitle("");
    setNewPotDesc("");
    setNewPotTarget("");
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
        <p className="text-muted-foreground font-semibold">Loading Joint Savings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-center mb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList className="h-12 bg-white/20 dark:bg-slate-900/40 backdrop-blur-md p-1 rounded-2xl border border-white/20">
            <TabsTrigger
              value="overview"
              className="rounded-xl font-semibold transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="rounded-xl font-semibold transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              Activity
            </TabsTrigger>
            <TabsTrigger
              value="setup"
              className="rounded-xl font-semibold transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
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
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Shared Pots
              </span>
            </div>
            <div className="flex gap-3">
              {pots.map((p) => (
                <Button
                  key={p.id}
                  variant={selectedPot?.id === p.id ? "default" : "outline"}
                  className={cn(
                    "h-12 rounded-2xl font-semibold transition-all duration-500",
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
                className="h-12 px-4 rounded-2xl border-dashed border-primary/40 text-primary hover:bg-primary/10 hover:border-primary font-semibold transition-all duration-300"
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
                  <h3 className="text-lg font-semibold">New Pot Invitations</h3>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
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
                      <CardTitle className="text-base font-semibold">{invite.pot?.title}</CardTitle>
                      <CardDescription className="text-[10px] font-semibold uppercase tracking-widest">
                        Created by Admin
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="p-4 pt-0 flex gap-2">
                      <Button
                        className="flex-1 h-9 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600"
                        onClick={() => acceptInvite(invite.pot_id)}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="ghost"
                        className="flex-1 h-9 rounded-xl text-xs font-semibold"
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
            <div className="text-center py-20 bg-white/40 dark:bg-slate-900/40 rounded-[2rem] border border-white/20 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-[0.03] pointer-events-none">
                <svg viewBox="0 0 100 100" className="w-full h-full fill-primary">
                  <path d="M20,50 C20,30 40,30 50,50 C60,30 80,30 80,50 C80,70 50,90 50,90 C50,90 20,70 20,50" />
                </svg>
              </div>
              <div className="relative z-10">
                <div className="mb-8 relative inline-block">
                  <img
                    src="https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=200&h=200"
                    alt="Cooperative Savings"
                    className="w-32 h-32 rounded-full border-4 border-white shadow-2xl mx-auto object-cover"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-full shadow-lg">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <h2 className="text-3xl font-semibold mb-2">Joint Savings</h2>
                <p className="text-muted-foreground max-w-sm mx-auto mb-8 font-semibold italic">
                  "Kidole kimoja hakivunji chawa" <br />
                  (A single finger cannot kill a louse - One person alone cannot do it all)
                </p>
                <Button
                  className="h-14 rounded-2xl font-semibold px-10 shadow-2xl bg-primary text-lg transition-all hover:scale-105"
                  onClick={() => setActiveTab("setup")}
                >
                  Anza Akiba ya Pamoja (Start Joint Saving)
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
                      <CardTitle className="text-3xl font-semibold">{selectedPot.title}</CardTitle>
                      <CardDescription className="font-semibold mt-1">
                        {selectedPot.description}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                        Total Balance
                      </span>
                      <span className="text-3xl font-semibold text-emerald-600">
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
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          Progress towards goal
                        </p>
                        <p className="text-lg font-semibold">
                          KES {selectedPot.target_amount.toLocaleString()} Target
                        </p>
                      </div>
                      <span className="text-2xl font-semibold text-primary">
                        {Math.round((selectedPot.balance! / selectedPot.target_amount) * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={(selectedPot.balance! / selectedPot.target_amount) * 100}
                      className="h-4 rounded-full"
                    />
                  </div>

                  {/* Members Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" /> Members
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary font-semibold hover:bg-primary/10 rounded-xl"
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
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary border border-primary/20">
                            {member.profile?.first_name?.[0] || "?"}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">
                              {member.profile?.first_name} {member.profile?.last_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                              {member.profile?.kyc_tag}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[8px] font-semibold uppercase tracking-wider",
                                member.role === "admin"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
                              )}
                            >
                              {member.role}
                            </span>
                            {member.status === "invited" && (
                              <span className="text-[8px] font-semibold text-muted-foreground animate-pulse italic">
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
                      className="flex-1 h-14 rounded-2xl text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-xl"
                      onClick={() => setShowDepositModal(true)}
                    >
                      <ArrowUpRight className="w-5 h-5 mr-2" /> Deposit Funds
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-14 rounded-2xl text-lg font-semibold border-2"
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
                    <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground opacity-70">
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
                    <CardTitle className="text-xl font-semibold flex items-center gap-2">
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
                        <p className="text-xs font-semibold uppercase tracking-widest">
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
                                <p className="font-semibold text-sm">
                                  KES {req.amount.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
                                  Requested by {req.profile?.first_name}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[8px] font-semibold uppercase tracking-wider",
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
                                className="w-full h-10 rounded-xl font-semibold text-xs bg-amber-500 hover:bg-amber-600 text-white"
                                onClick={() => approveWithdrawal(req.id)}
                              >
                                Approve Withdrawal
                              </Button>
                            )}
                            {hasApproved && req.status === "pending" && (
                              <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold text-xs py-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
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
                    <CardTitle className="text-xl font-semibold flex items-center gap-2">
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
                              <p className="text-sm font-semibold truncate">
                                {contribution.profile?.first_name}{" "}
                                {contribution.type === "deposit" ? "deposited" : "withdrew"}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
                                {format(new Date(contribution.created_at), "MMM dd, hh:mm a")}
                              </p>
                            </div>
                            <p
                              className={cn(
                                "text-sm font-semibold",
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
              <CardTitle className="text-2xl font-semibold flex items-center gap-2">
                <History className="w-6 h-6 text-primary" /> Recent Activity
              </CardTitle>
              <CardDescription className="font-semibold mt-1">
                Registry of all capital movements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {contributions.length === 0 ? (
                  <div className="text-center py-20 opacity-50">
                    <History className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="font-semibold uppercase tracking-[0.2em]">
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
                        <p className="text-base font-semibold truncate">
                          {contribution.profile?.first_name}{" "}
                          {contribution.type === "deposit" ? "deposited" : "withdrew"}
                        </p>
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">
                          {format(new Date(contribution.created_at), "MMMM dd, yyyy • hh:mm a")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "text-lg font-semibold",
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
        </TabsContent>

        <TabsContent value="setup" className="animate-in slide-in-from-bottom-4 duration-500">
          <div className="max-w-2xl mx-auto">
            <Card className="rounded-[2rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl p-8 shadow-2xl">
              <div className="mb-8 flex items-center gap-4">
                <div className="w-14 h-14 rounded-3xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                  <Plus className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">Start a New Joint Saving</h2>
                  <p className="text-sm text-muted-foreground font-semibold">
                    Create a shared pot and invite your friends.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreatePot} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-widest ml-1">
                    Pot Title
                  </Label>
                  <Input
                    placeholder="e.g. Wedding Savings, Euro Trip"
                    value={newPotTitle}
                    onChange={(e) => setNewPotTitle(e.target.value)}
                    className="h-14 rounded-2xl bg-white/50 dark:bg-slate-900 border-none font-semibold text-lg px-6 shadow-sm"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-widest ml-1">
                    Target Amount (KES)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">
                      KES
                    </span>
                    <Input
                      placeholder="0.00"
                      value={newPotTarget}
                      onChange={(e) => setNewPotTarget(formatWithCommas(e.target.value))}
                      className="h-14 rounded-2xl bg-white/50 dark:bg-slate-900 border-none font-semibold text-lg pl-16 pr-6 shadow-sm tabular-nums"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-widest ml-1">
                    Description / Purpose
                  </Label>
                  <Input
                    placeholder="What are we saving for?"
                    value={newPotDesc}
                    onChange={(e) => setNewPotDesc(e.target.value)}
                    className="h-14 rounded-2xl bg-white/50 dark:bg-slate-900 border-none font-semibold text-lg px-6 shadow-sm"
                  />
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full h-16 rounded-[1.5rem] text-xl font-bold shadow-2xl bg-primary hover:scale-[1.02] transition-all"
                  >
                    Create Shared Pot
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
            <DialogTitle className="text-2xl font-semibold">Invite to Pot</DialogTitle>
            <DialogDescription className="font-semibold text-muted-foreground">
              Enter the KYC tag of the user you want to invite.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest">User Tag</Label>
              <div className="relative">
                <Input
                  placeholder="@username"
                  value={inviteTag}
                  onChange={(e) => setInviteTag(e.target.value)}
                  className="h-14 rounded-xl bg-slate-100 dark:bg-slate-900 border-none font-semibold pl-4"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full h-12 rounded-xl font-semibold shadow-xl"
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
            <DialogTitle className="text-2xl font-semibold">Add Funds to Pot</DialogTitle>
            <DialogDescription className="font-semibold text-muted-foreground">
              Amount will be deducted from your Vault wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2 text-center py-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-600 mb-2">
                Available Balance
              </p>
              <p className="text-3xl font-semibold text-emerald-700">
                KES {selectedPot?.balance?.toLocaleString() || "0"}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest">
                Amount (KES)
              </Label>
              <Input
                placeholder="0.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(formatWithCommas(e.target.value))}
                className="h-14 rounded-xl bg-slate-100 dark:bg-slate-900 border-none font-semibold text-xl text-center tabular-nums"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full h-12 rounded-xl font-semibold shadow-xl bg-emerald-600"
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
            <DialogTitle className="text-2xl font-semibold">Request Withdrawal</DialogTitle>
            <DialogDescription className="font-semibold text-muted-foreground">
              All other members must approve this before funds are released.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest">
                Amount (KES)
              </Label>
              <Input
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(formatWithCommas(e.target.value))}
                className="h-14 rounded-xl bg-slate-100 dark:bg-slate-900 border-none font-semibold text-xl text-center tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest">
                Reason / Memo
              </Label>
              <Input
                placeholder="e.g. Booking flights, Pay vendor"
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                className="h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border-none font-semibold"
              />
            </div>
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
              <XCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase leading-relaxed">
                A notification will be sent to all members. They must approve this within their own
                Joint Savings dashboard.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full h-12 rounded-xl font-semibold shadow-xl"
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
