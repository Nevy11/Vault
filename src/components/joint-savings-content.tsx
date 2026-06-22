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
import { Users, Plus } from "lucide-react";
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

      {/* No pot selected — centered hero */}
      {!selectedPot ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <div className="w-full max-w-lg space-y-8 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 rounded-[3rem] px-6 sm:px-14 py-14 shadow-2xl">

            {/* Hero image */}
            <div className="relative inline-block mx-auto">
              <img
                src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80&w=400&h=400"
                alt="Partnership Excellence"
                className="w-36 h-36 sm:w-48 sm:h-48 rounded-full shadow-2xl mx-auto object-cover border-4 border-white/50"
              />
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2.5 rounded-full shadow-2xl">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-medium tracking-tighter uppercase">
                Joint Strategic Reserve
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg italic leading-relaxed">
                "Alone we can do so little; together we can do so much."
              </p>
            </div>

            {/* Existing pots selector (if any) */}
            {pots.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {pots.map((p) => (
                  <Button
                    key={p.id}
                    variant="outline"
                    className="h-10 rounded-2xl font-medium bg-white/50 dark:bg-slate-800/50 hover:bg-primary/10 hover:border-primary transition-all duration-300"
                    onClick={() => setSelectedPotId(p.id)}
                  >
                    {p.title}
                  </Button>
                ))}
              </div>
            )}

            {/* CTA */}
            <Button
              className="h-12 sm:h-14 w-full rounded-2xl font-medium px-8 shadow-2xl bg-primary text-base sm:text-lg"
              onClick={() => setActiveTab("setup")}
            >
              <Plus className="w-5 h-5 mr-2" />
              Start Your Joint Savings (Chama)
            </Button>
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
