import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WithdrawalRequestsProps {
  requests: any[];
  profile: any;
  onApprove: (id: string) => void;
}

export function WithdrawalRequests({ requests, profile, onApprove }: WithdrawalRequestsProps) {
  return (
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
            <p className="text-xs font-medium uppercase tracking-widest">No pending requests</p>
          </div>
        ) : (
          requests.map((req) => {
            const hasApproved = req.approvals?.some((a: any) => a.user_id === profile?.id);
            const isRequester = req.requester_id === profile?.id;

            return (
              <div
                key={req.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">KES {req.amount.toLocaleString()}</p>
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
                    onClick={() => onApprove(req.id)}
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
  );
}
