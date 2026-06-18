import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface ActivityFeedProps {
  activities: any[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Activity Protocol</h3>
      <ScrollArea className="h-[300px] rounded-2xl border border-white/20 bg-slate-50/50 dark:bg-slate-900/50 p-4">
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground opacity-50">
              <p className="text-sm font-medium italic">No transactions recorded yet.</p>
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/20"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      activity.type === "deposit"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-amber-500/10 text-amber-600"
                    }`}
                  >
                    {activity.type === "deposit" ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold">
                      {activity.profile?.first_name}{" "}
                      {activity.type === "deposit" ? "deposited" : "requested payout"}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                      {format(new Date(activity.created_at), "MMM dd, h:mm a")}
                    </p>
                  </div>
                </div>
                <p
                  className={`text-sm font-bold ${
                    activity.type === "deposit" ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  KES {activity.amount.toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
