import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

interface MembersListProps {
  members: any[];
  onInvite: () => void;
}

export function MembersList({ members, onInvite }: MembersListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Syndicate Members</h3>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-xl text-primary font-bold uppercase tracking-widest hover:bg-primary/10"
          onClick={onInvite}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Invite
        </Button>
      </div>
      <div className="flex flex-wrap gap-4">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-white/20"
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
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {member.role}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
