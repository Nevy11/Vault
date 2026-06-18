import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Loader2, UserPlus, ArrowRight } from "lucide-react";
import { supabase } from "@/api/supabase";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (userId: string) => Promise<void>;
  currentUser: any;
}

export function InviteMemberModal({
  isOpen,
  onClose,
  onInvite,
  currentUser,
}: InviteMemberModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, kyc_tag, profile_photo_url")
        .or(`first_name.ilike.%${searchQuery}%,kyc_tag.ilike.%${searchQuery}%`)
        .neq("id", currentUser?.id)
        .limit(5);

      if (!error && data) {
        setSearchResults(data);
      }
      setIsSearching(false);
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, currentUser?.id]);

  const handleInvite = async (userId: string) => {
    setIsInviting(true);
    try {
      await onInvite(userId);
      setSearchQuery("");
      setSearchResults([]);
      onClose();
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] border-white/20 bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl shadow-2xl">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
            <UserPlus className="w-8 h-8" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">
            Expand Your Syndicate
          </DialogTitle>
          <DialogDescription className="text-center">
            Collaborative wealth requires trusted partners. Invite a member by their name or @tag.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by first name or @tag..."
              className="pl-11 h-12 rounded-xl border-2 border-primary/10 focus:border-primary/40"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin">
            {isSearching ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-border/40 group hover:border-primary/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-800">
                      <AvatarImage src={user.profile_photo_url} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {user.first_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-bold">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">{user.kyc_tag}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-lg h-9 font-bold uppercase tracking-widest text-[10px]"
                    onClick={() => handleInvite(user.id)}
                    disabled={isInviting}
                  >
                    {isInviting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Invite"}
                  </Button>
                </div>
              ))
            ) : searchQuery.length >= 2 ? (
              <p className="text-center py-8 text-sm text-muted-foreground italic">
                No members found matching your criteria.
              </p>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="w-full rounded-xl" onClick={onClose}>
            Close Protocol
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
