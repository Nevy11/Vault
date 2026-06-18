import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, UserPlus, Target } from "lucide-react";

interface PotDetailsProps {
  pot: any;
  onBack: () => void;
  onInvite: () => void;
  onDeposit: () => void;
  onWithdraw: () => void;
}

export function PotDetails({ pot, onBack, onInvite, onDeposit, onWithdraw }: PotDetailsProps) {
  const progress = Math.round((pot.balance / pot.target_amount) * 100);

  return (
    <Card className="lg:col-span-2 rounded-[2rem] border border-white/30 bg-white/85 dark:bg-slate-950/80 backdrop-blur-2xl overflow-hidden shadow-2xl relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-6 left-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 z-10"
        onClick={onBack}
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <CardHeader className="pb-2 pt-16 px-8">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-medium">{pot.title}</CardTitle>
            <CardDescription className="font-medium mt-1">{pot.description}</CardDescription>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground mb-1">
              Total Balance
            </span>
            <span className="text-2xl font-medium text-emerald-600">
              KES {pot.balance?.toLocaleString()}
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
              <p className="text-lg font-medium">KES {pot.target_amount.toLocaleString()} Target</p>
            </div>
            <span className="text-2xl font-medium text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3 rounded-full" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            className="h-14 rounded-2xl bg-primary text-white font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
            onClick={onDeposit}
          >
            Deposit Funds
          </Button>
          <Button
            variant="outline"
            className="h-14 rounded-2xl border-2 border-primary/20 text-primary font-bold uppercase tracking-widest hover:bg-primary/5 hover:border-primary/40 transition-all"
            onClick={onWithdraw}
          >
            Request Payout
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
