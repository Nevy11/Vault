import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Target, UserPlus } from "lucide-react";

interface InviteCardProps {
  invite: any;
  onAccept: (potId: string) => void;
  onDecline: (potId: string) => void;
}

export function InviteCard({ invite, onAccept, onDecline }: InviteCardProps) {
  const creator = (invite.pot as any)?.creator;

  return (
    <Card className="group/card rounded-3xl border border-emerald-500/20 bg-white/60 dark:bg-slate-900/60 shadow-xl hover:shadow-emerald-500/10 transition-all duration-500 backdrop-blur-md overflow-hidden">
      <CardHeader className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="h-12 w-12 border-2 border-emerald-500/20">
            <AvatarImage src={creator?.profile_photo_url} />
            <AvatarFallback className="bg-emerald-100 text-emerald-600 font-bold">
              {creator?.first_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600/60">
              Joint Savings Invite
            </p>
            <p className="text-sm font-bold">
              {creator?.first_name} {creator?.last_name}
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <CardTitle className="text-xl font-bold group-hover/card:text-emerald-600 transition-colors">
            {invite.pot?.title}
          </CardTitle>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-500/70">
              Description
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {invite.pot?.description || "A collective journey towards a shared goal."}
            </p>
          </div>
          <div className="flex items-center gap-2 py-2 border-y border-emerald-500/10">
            <Target className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
              KES {invite.pot?.target_amount.toLocaleString()} Target
            </span>
          </div>
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest animate-pulse">
            ✨ Better Together, Stronger Forever ✨
          </p>
        </div>
      </CardHeader>
      <CardFooter className="p-6 pt-0 flex gap-3">
        <Button
          className="flex-1 h-11 rounded-2xl text-xs font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          onClick={() => onAccept(invite.pot_id)}
        >
          Approve Invite
        </Button>
        <Button
          variant="ghost"
          className="h-11 px-4 rounded-2xl text-xs font-bold uppercase tracking-widest text-emerald-600/60 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
          onClick={() => onDecline(invite.pot_id)}
        >
          Decline
        </Button>
      </CardFooter>
    </Card>
  );
}

export function InvitesSection({
  invites,
  onAccept,
  onDecline,
}: {
  invites: any[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  if (invites.length === 0) return null;

  return (
    <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-emerald-600/10 via-emerald-500/5 to-transparent border border-emerald-500/20 backdrop-blur-2xl animate-in slide-in-from-top-6 duration-700 shadow-2xl relative overflow-hidden group mb-12">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -mr-32 -mt-32 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -ml-32 -mb-32" />

      <div className="relative flex items-center gap-4 mb-6">
        <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 transform group-hover:rotate-6 transition-transform">
          <UserPlus className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100">
            Strategic Alliances Pending
          </h3>
          <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium uppercase tracking-widest opacity-80">
            Invitations to collaborative protocols
          </p>
        </div>
      </div>
      <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {invites.map((invite) => (
          <InviteCard key={invite.id} invite={invite} onAccept={onAccept} onDecline={onDecline} />
        ))}
      </div>
    </div>
  );
}
