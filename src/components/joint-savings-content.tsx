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
            </div>
          </div>
        )}

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
  );
}
