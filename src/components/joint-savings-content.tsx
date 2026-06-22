import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useJointSavings } from "@/hooks/use-joint-savings";
import { useProfile } from "@/hooks/use-profile";
import { InvitesSection } from "./joint-savings/InviteCard";
import { PotDetails } from "./joint-savings/PotDetails";
import { MembersList } from "./joint-savings/MembersList";
import { ActivityFeed } from "./joint-savings/ActivityFeed";
import { CreatePotForm } from "./joint-savings/CreatePotForm";
import { InviteMemberModal } from "./joint-savings/InviteMemberModal";
import { FinancialActionModal } from "./joint-savings/FinancialActionModal";
import { WithdrawalRequests } from "./joint-savings/WithdrawalRequests";
import { Card, CardHeader } from "@/components/ui/card";
import { Users, Plus, Handshake, TrendingUp, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

  // ── Setup / Create Pot view ───────────────────────────────────────────────
  if (activeTab === "setup") {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-in fade-in duration-500">
        <Card className="rounded-[2.5rem] border border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl p-6 sm:p-10 shadow-2xl">
          <CardHeader className="p-0 mb-8">
            <h2 className="text-3xl sm:text-4xl font-medium tracking-tighter text-slate-950 dark:text-white uppercase">
              Initialize Chama Protocol
            </h2>
            <p className="text-muted-foreground mt-2 font-medium italic">
              Strategic wealth creation begins with a shared vision.
            </p>
          </CardHeader>
          <CreatePotForm onSubmit={handleCreatePot} onCancel={() => setActiveTab("pots")} />
        </Card>
      </div>
    );
  }

  // ── Main / Pots view ──────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">

      {/* Pending invites */}
      <InvitesSection invites={invites} onAccept={acceptInvite} onDecline={declineInvite} />

      {/* No pot selected — centered card hero */}
      {!selectedPot ? (
        <div className="max-w-3xl mx-auto">
          <div className="w-full bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl border border-white/30 rounded-2xl p-8 shadow-xl relative overflow-hidden">

            {/* Subtle glow */}
            <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-primary/15 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center gap-6">

              {/* Image */}
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80&w=300&h=300"
                  alt="Partnership Excellence"
                  className="w-32 h-32 rounded-full object-cover shadow-lg border-2 border-white/60 mx-auto"
                />
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-2 rounded-full shadow-lg">
                  <Users className="w-4 h-4" />
                </div>
              </div>

              {/* Title & quote */}
              <div className="space-y-1.5">
                <p className="text-[9px] uppercase tracking-[0.35em] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Collective Wealth
                </p>
                <h2 className="text-2xl font-semibold tracking-tight uppercase leading-tight text-slate-950 dark:text-white">
                  Joint Strategic Reserve
                </h2>
                <p className="text-sm text-muted-foreground italic">
                  "Alone we can do so little; together we can do so much."
                </p>
              </div>

              {/* Feature grid — 3 equal columns */}
              <div className="grid grid-cols-3 gap-3 w-full">
                {[
                  { Icon: Handshake, label: "Collective Trust", desc: "Transparent governance" },
                  { Icon: TrendingUp, label: "Shared Growth",   desc: "Combined savings power" },
                  { Icon: Trophy,    label: "Unity Finance",    desc: "Strength in numbers"    },
                ].map(({ Icon, label, desc }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-2 bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/40 rounded-xl px-3 py-4 shadow-sm"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">{label}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{desc}</p>
                  </div>
                ))}
              </div>

              {/* Existing pots */}
              {pots.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center w-full">
                  <p className="w-full text-[10px] uppercase tracking-widest text-muted-foreground">Your Pots</p>
                  {pots.map((p) => (
                    <Button
                      key={p.id}
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl font-medium bg-white/60 dark:bg-slate-800/60 hover:bg-primary/10 hover:border-primary transition-all duration-300"
                      onClick={() => setSelectedPotId(p.id)}
                    >
                      {p.title}
                    </Button>
                  ))}
                </div>
              )}

              {/* CTA */}
              <div className="w-full space-y-1.5">
                <Button
                  className="h-12 w-full rounded-xl font-semibold shadow-lg bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => setActiveTab("setup")}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Start Your Joint Savings (Chama)
                </Button>
                <p className="text-[10px] text-slate-400">Free to create · No hidden fees</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Pot selected — detail grid */
        <div className="space-y-6">
          {/* Pot selector strip */}
          <div className="flex flex-wrap items-center gap-2">
            {pots.map((p) => (
              <Button
                key={p.id}
                variant={selectedPotId === p.id ? "default" : "outline"}
                className={cn(
                  "h-10 rounded-2xl font-medium transition-all duration-300",
                  selectedPotId === p.id
                    ? "px-6 bg-primary text-primary-foreground shadow-lg scale-105"
                    : "bg-white/50 dark:bg-slate-800/50",
                )}
                onClick={() => setSelectedPotId(p.id)}
              >
                {p.title}
              </Button>
            ))}
            <Button
              variant="outline"
              className="h-10 px-4 rounded-2xl border-dashed border-primary/40 text-primary hover:bg-primary/10 hover:border-primary font-medium transition-all duration-300"
              onClick={() => setActiveTab("setup")}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Pot
            </Button>
          </div>

          {/* Detail layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-700">
            <div className="lg:col-span-2 space-y-6">
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
              <Card className="rounded-[2rem] border border-white/30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl p-6 sm:p-8 shadow-xl">
                <ActivityFeed activities={contributions} />
              </Card>
            </div>
            <div>
              <Card className="rounded-[2rem] border border-white/30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl p-6 sm:p-8 shadow-xl">
                <MembersList members={members} onInvite={() => setIsInviteModalOpen(true)} />
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
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
    </div>
  );
}
