import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/app-shell";
import { useJointSavings } from "@/hooks/use-joint-savings";
import { useProfile } from "@/hooks/use-profile";
import { PotHeader } from "./joint-savings/PotHeader";
import { InvitesSection } from "./joint-savings/InviteCard";
import { PotDetails } from "./joint-savings/PotDetails";
import { MembersList } from "./joint-savings/MembersList";
import { ActivityFeed } from "./joint-savings/ActivityFeed";
import { CreatePotForm } from "./joint-savings/CreatePotForm";
import { InviteMemberModal } from "./joint-savings/InviteMemberModal";
import { FinancialActionModal } from "./joint-savings/FinancialActionModal";
import { WithdrawalRequests } from "./joint-savings/WithdrawalRequests";
import { Card, CardHeader } from "@/components/ui/card";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/api/supabase";

export default function JointSavingsContent() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const {
    pots,
    selectedPotId,
    setSelectedPotId,
    selectedPot,
    members,
    contributions,
    requests,
    invites,
    loading,
    createPot,
    inviteMember,
    deposit,
    requestWithdrawal,
    approveWithdrawal,
    acceptInvite,
    declineInvite,
  } = useJointSavings();

  const [activeTab, setActiveTab] = useState<"pots" | "setup">("pots");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  const handleCreatePot = async (data: {
    title: string;
    description: string;
    target_amount: number;
  }) => {
    await createPot(data.title, data.description, data.target_amount);
    setActiveTab("pots");
  };

  if (activeTab === "setup") {
    return (
      <AppShell>
        <main className="max-w-4xl mx-auto px-6 py-12">
          <Card className="rounded-[3rem] border border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl p-12 shadow-2xl">
            <CardHeader className="p-0 mb-10">
              <h1 className="text-4xl font-medium tracking-tighter text-slate-950 dark:text-white uppercase">
                Initialize Chama Protocol
              </h1>
              <p className="text-muted-foreground mt-2 font-medium italic">
                Strategic wealth creation begins with a shared vision.
              </p>
            </CardHeader>
            <CreatePotForm onSubmit={handleCreatePot} onCancel={() => setActiveTab("pots")} />
          </Card>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        <PotHeader
          pots={pots}
          selectedPotId={selectedPotId}
          onSelectPot={setSelectedPotId}
          onNewPot={() => setActiveTab("setup")}
        />

        <InvitesSection invites={invites} onAccept={acceptInvite} onDecline={declineInvite} />

        {!selectedPot ? (
          <div className="text-center py-20 bg-white/40 dark:bg-slate-900/40 rounded-[3rem] border border-white/20 backdrop-blur-xl relative overflow-hidden group">
            <div className="relative z-10 space-y-8">
              <div className="relative inline-block">
                <img
                  src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80&w=400&h=400"
                  alt="Partnership Excellence"
                  className="w-48 h-48 rounded-full shadow-2xl mx-auto object-cover border-4 border-white/50"
                />
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-3 rounded-full shadow-2xl">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-medium tracking-tighter uppercase">
                  Joint Strategic Reserve
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto text-lg italic italic">
                  "Alone we can do so little; together we can do so much."
                </p>
              </div>
              <Button
                className="h-14 rounded-2xl font-medium px-12 shadow-2xl bg-primary text-xl"
                onClick={() => setActiveTab("setup")}
              >
                Start Your Joint Savings (Chama)
              </Button>
            </div>
          </div>
<<<<<<< HEAD

          {/* Invites Section */}
          {invites.length > 0 && (
            <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-600/10 via-emerald-500/5 to-transparent border border-indigo-500/20 backdrop-blur-2xl animate-in slide-in-from-top-6 duration-700 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full -mr-32 -mt-32 animate-pulse" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -ml-32 -mb-32" />

              <div className="relative flex items-center gap-4 mb-6">
                <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 transform group-hover:rotate-6 transition-transform">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-indigo-950 dark:text-indigo-100">
                    Strategic Alliances Pending
                  </h3>
                  <p className="text-sm text-indigo-700 dark:text-indigo-400 font-medium uppercase tracking-widest opacity-80">
                    Invitations to collaborative protocols
                  </p>
                </div>
              </div>
              <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {invites.map((invite) => (
                  <Card
                    key={invite.id}
                    className="group/card rounded-3xl border border-indigo-500/20 bg-white/60 dark:bg-slate-900/60 shadow-xl hover:shadow-indigo-500/10 transition-all duration-500 backdrop-blur-md overflow-hidden"
                  >
                    <CardHeader className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <Avatar className="h-12 w-12 border-2 border-indigo-500/20">
                          <AvatarImage src={(invite.pot as any)?.creator?.profile_photo_url} />
                          <AvatarFallback className="bg-indigo-100 text-indigo-600 font-bold">
                            {(invite.pot as any)?.creator?.first_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600/60">
                            Protocol Invitation
                          </p>
                          <p className="text-sm font-bold">
                            {(invite.pot as any)?.creator?.first_name}{" "}
                            {(invite.pot as any)?.creator?.last_name}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <CardTitle className="text-xl font-bold group-hover/card:text-indigo-600 transition-colors">
                          {invite.pot?.title}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground leading-relaxed italic">
                          "
                          {invite.pot?.description || "A collective journey towards a shared goal."}
                          "
                        </p>
                        <div className="flex items-center gap-2 py-2 border-y border-indigo-500/10">
                          <Target className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm font-bold text-indigo-950 dark:text-indigo-100">
                            KES {invite.pot?.target_amount.toLocaleString()} Target
                          </span>
                        </div>
                        <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-widest animate-pulse">
                          ✨ Better Together, Stronger Forever ✨
                        </p>
                      </div>
                    </CardHeader>
                    <CardFooter className="p-6 pt-0 flex gap-3">
                      <Button
                        className="flex-1 h-11 rounded-2xl text-xs font-medium uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                        onClick={() => acceptInvite(invite.pot_id)}
                      >
                        Join Alliance
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-11 px-4 rounded-2xl text-xs font-medium uppercase tracking-widest text-indigo-600/60 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
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
              <Card className="lg:col-span-2 rounded-[2rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl overflow-hidden shadow-2xl relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-6 left-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 z-10"
                  onClick={() => handleSetSelectedPotId(null)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <CardHeader className="pb-2 pt-16 px-8">
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
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-normal">
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
                              <span className="text-[8px] font-normal text-muted-foreground animate-pulse italic">
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
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 leading-relaxed animate-in fade-in zoom-in duration-1000">
                      "{jointQuotes[quoteIndex].en}"
                    </p>
                    <p className="mt-2 text-sm font-medium italic text-slate-500 dark:text-slate-400 opacity-90">
                      {jointQuotes[quoteIndex].sw}
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
                                <p className="text-[10px] text-muted-foreground font-normal uppercase tracking-widest">
                                  Requested by {req.profile?.first_name}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[8px] font-medium uppercase tracking-wider",
                                  req.status === "executed"
                                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                    : "bg-amber-100 text-amber-700 border border-amber-200",
                                )}
                              >
                                {req.status === "executed" ? "Approved & Credited" : req.status}
                              </span>
                            </div>
                            <p className="text-xs italic text-muted-foreground">
                              "{req.reason || "No reason provided"}"
                            </p>

                            {req.status === "pending" && !isRequester && !hasApproved && (
                              <Button
                                className="w-full h-10 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                                onClick={() => approveWithdrawal(req.id)}
                              >
                                Approve Withdrawal
                              </Button>
                            )}
                            {hasApproved && req.status === "pending" && (
                              <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-xs py-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                <CheckCircle2 className="w-4 h-4" /> You Approved
                              </div>
                            )}
                            {req.status === "executed" && (
                              <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-[10px] py-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
                                <ShieldCheck className="w-4 h-4" /> Funds Credited to Wallet
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
                                {contribution.type === "deposit"
                                  ? "Deposit from "
                                  : "Withdrawal by "}
                                <span className="text-primary">
                                  {contribution.profile?.first_name}{" "}
                                  {contribution.profile?.last_name}
                                </span>
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                                  {format(new Date(contribution.created_at), "MMM dd, hh:mm a")}
                                </p>
                                {contribution.balance_after && (
                                  <p className="text-[10px] text-emerald-600/80 font-bold uppercase tracking-widest">
                                    • Balance: KES {contribution.balance_after.toLocaleString()}
                                  </p>
                                )}
                              </div>
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

        <TabsContent value="activity" className="space-y-8 animate-in fade-in duration-500">
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
                          {contribution.type === "deposit" ? "Deposit from " : "Withdrawal by "}
                          <span className="text-primary">
                            {contribution.profile?.first_name} {contribution.profile?.last_name}
                          </span>
                        </p>
                        <div className="flex items-center gap-3">
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                            {format(new Date(contribution.created_at), "MMMM dd, yyyy • hh:mm a")}
                          </p>
                          {contribution.balance_after && (
                            <p className="text-xs text-primary/70 font-bold uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">
                              New Pot Balance: KES {contribution.balance_after.toLocaleString()}
                            </p>
                          )}
                        </div>
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
          <div className="max-w-2xl mx-auto relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -left-16 top-6 rounded-full hover:bg-white/20 hidden lg:flex"
              onClick={() => setActiveTab("overview")}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <Card className="rounded-[2rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl p-8 shadow-2xl">
              <div className="mb-8 flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => setActiveTab("overview")}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
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
                    Invite Alliance Members
                  </Label>
                  <div className="relative" ref={searchRef}>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 animate-in zoom-in-95 duration-200"
                        >
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={user.profile_photo_url} />
                            <AvatarFallback className="text-[8px]">
                              {user.first_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">
                            {user.first_name} {user.last_name}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleUserSelection(user)}
                            className="p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="relative group">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        placeholder="Search by name or @tag..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="h-12 rounded-2xl bg-white/50 dark:bg-slate-900 border-none font-medium text-lg pl-16 pr-6 shadow-sm focus:ring-2 ring-primary/20 transition-all"
                      />
                      {isSearching && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Search Results Dropdown */}
                    {userSearchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 rounded-2xl border border-border/40 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-2">
                          {userSearchResults.map((user) => {
                            const isSelected = selectedUsers.some((u) => u.id === user.id);
                            return (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => toggleUserSelection(user)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 transition-colors group"
                              >
                                <Avatar className="h-10 w-10 border border-border/40">
                                  <AvatarImage src={user.profile_photo_url} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {user.first_name?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-left">
                                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                    {user.first_name} {user.last_name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                                    {user.kyc_tag}
                                  </p>
                                </div>
                                {isSelected && (
                                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <Check className="w-4 h-4" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground ml-2 font-medium uppercase tracking-wider opacity-60">
                    Search and select users to invite them to this protocol.
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
      <Dialog
        open={showInviteModal}
        onOpenChange={(open) => {
          setShowInviteModal(open);
          if (!open) {
            setSelectedInvitedUser(null);
            setInviteTag("");
            setUserSearchTerm("");
            setUserSearchResults([]);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-[2rem] border border-white/30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl shadow-2xl p-0 overflow-hidden">
          <div className="p-8 space-y-6">
            <DialogHeader>
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
                <UserPlus className="w-6 h-6" />
              </div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                Invite to Protocol
              </DialogTitle>
              <DialogDescription className="font-medium text-muted-foreground">
                Search and select a user to join this collective reserve.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="relative" ref={searchRef}>
                {invitedUser ? (
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 animate-in zoom-in-95 duration-300">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                      <AvatarImage src={invitedUser.profile_photo_url} />
                      <AvatarFallback className="bg-indigo-600 text-white font-bold">
                        {invitedUser.first_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-indigo-950 dark:text-indigo-100">
                        {invitedUser.first_name} {invitedUser.last_name}
                      </p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest">
                        {invitedUser.kyc_tag}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedInvitedUser(null);
                        setInviteTag("");
                      }}
                      className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-indigo-600" />
                    </button>
                  </div>
                ) : (
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-indigo-600 transition-colors" />
                    <Input
                      placeholder="Search by name or @tag..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-900 border-none font-medium text-lg pl-12 pr-4 shadow-inner focus:ring-2 ring-indigo-500/20 transition-all"
                    />
                    {isSearching && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      </div>
                    )}
                  </div>
                )}

                {/* Search Results Dropdown */}
                {!invitedUser && userSearchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2">
                      {userSearchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => selectInvitedUser(user)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-colors group"
                        >
                          <Avatar className="h-10 w-10 border border-border/40">
                            <AvatarImage src={user.profile_photo_url} />
                            <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs font-bold">
                              {user.first_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-bold text-foreground group-hover:text-indigo-600 transition-colors">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                              {user.kyc_tag}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-indigo-600 transform group-hover:translate-x-1 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Button
              className="w-full h-14 rounded-2xl text-base font-bold uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/20 disabled:opacity-50 disabled:grayscale transition-all"
              onClick={handleInvite}
              disabled={!invitedUser}
            >
              Send Secure Invite
            </Button>
          </div>
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
              <Label className="text-xs font-medium uppercase tracking-widest">Amount (KES)</Label>
              <Input
                placeholder="0.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(formatWithCommas(e.target.value))}
                className="h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border-none font-medium text-xl text-center tabular-nums"
              />
=======
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-in fade-in duration-700">
            <div className="lg:col-span-2 space-y-8">
              <PotDetails
                pot={selectedPot}
                onBack={() => setSelectedPotId(null)}
                onInvite={() => setIsInviteModalOpen(true)}
                onDeposit={() => setIsDepositModalOpen(true)}
                onWithdraw={() => setIsWithdrawModalOpen(true)}
              />
              <WithdrawalRequests
                requests={requests}
                profile={profile}
                onApprove={approveWithdrawal}
              />
              <Card className="rounded-[2rem] border border-white/30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl p-8 shadow-xl">
                <ActivityFeed activities={contributions} />
              </Card>
            </div>
            <div className="space-y-8">
              <Card className="rounded-[2rem] border border-white/30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl p-8 shadow-xl">
                <MembersList members={members} onInvite={() => setIsInviteModalOpen(true)} />
              </Card>
>>>>>>> 64a7ebf35aaeb41fe4a449a1a3e8b2f63ede57ca
            </div>
          </div>
        )}

<<<<<<< HEAD
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
              <Label className="text-xs font-medium uppercase tracking-widest">Amount (KES)</Label>
              <Input
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(formatWithCommas(e.target.value))}
                className="h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border-none font-medium text-xl text-center tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-widest">Reason / Memo</Label>
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
=======
        <InviteMemberModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          onInvite={async (userId) => {
            const { data } = await supabase
              .from("profiles")
              .select("kyc_tag")
              .eq("id", userId)
              .single();
            if (data?.kyc_tag) await inviteMember(selectedPotId!, data.kyc_tag);
          }}
          currentUser={profile}
        />

        <FinancialActionModal
          isOpen={isDepositModalOpen}
          onClose={() => setIsDepositModalOpen(false)}
          onSubmit={async (amount) => {
            if (selectedPotId) await deposit(selectedPotId, amount);
          }}
          title="Consolidate Funds"
          description={`Deposit into ${selectedPot?.title} to strengthen the collective reserve.`}
          actionLabel="Execute Deposit"
        />

        <FinancialActionModal
          isOpen={isWithdrawModalOpen}
          onClose={() => setIsWithdrawModalOpen(false)}
          onSubmit={async (amount) => {
            if (selectedPotId)
              await requestWithdrawal(selectedPotId, amount, "Strategic Payout Request");
          }}
          title="Strategic Payout"
          description="Request a disbursement from the shared treasury. This requires member consensus."
          actionLabel="Initiate Request"
        />
      </main>
    </AppShell>
>>>>>>> 64a7ebf35aaeb41fe4a449a1a3e8b2f63ede57ca
  );
}
