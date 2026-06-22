import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";

interface MembersListProps {
  members: any[];
  onInvite: () => void;
}

export function MembersList({ members, onInvite }: MembersListProps) {
  const { profile } = useProfile();

  // Find the current user's membership details to check their role
  const currentUserMember = members.find((m) => m.user_id === profile?.id);
  const isAdmin = currentUserMember?.role === "admin";

  // Filter members based on user's role:
  // - Admin can see active and pending (invited) members.
  // - Regular members can only see active (joined) members.
  const visibleMembers = members.filter((m) => {
    if (isAdmin) {
      return m.status === "active" || m.status === "invited";
    }
    return m.status === "active";
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Syndicate Members</h3>
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-primary font-bold uppercase tracking-widest hover:bg-primary/10"
            onClick={onInvite}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-4">
        {visibleMembers.map((member) => (
          <div
            key={member.id}
            className={`flex items-center gap-3 p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-white/20 ${member.status === "invited" ? "opacity-60 border-dashed" : ""}`}
          >
            <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-800">
              <AvatarImage src={member.profile?.profile_photo_url} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {member.profile?.first_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-bold">
                {member.profile?.first_name} {member.profile?.last_name}
              </p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <span>{member.role}</span>
                {member.status === "invited" && (
                  <span className="text-[9px] text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded-full uppercase tracking-normal">
                    Pending
                  </span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
