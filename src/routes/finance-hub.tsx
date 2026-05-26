import { createFileRoute, Link } from "@tanstack/react-router";
import { PiggyBank, Landmark, ShieldCheck, ArrowRight, TrendingUp, Sparkles, Target, Wallet, History, AlertCircle, Lock as LockIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/finance-hub")({
  component: FinanceHubPage,
});

function FinanceHubPage() {
  return (
    <AppShell>
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Unified Finance Header */}
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">Finance & Credit Hub</h1>
          <p className="text-lg text-muted-foreground/80 leading-relaxed">
            Manage your long-term wealth and access instant liquidity. Vault's automated ledger rules 
            ensure your financial growth is rewarded and your credit is always available.
          </p>
        </div>

        {/* Unified Side-by-Side Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16 items-stretch">
          
          {/* SAVINGS SECTION (LEFT) */}
          <div className="flex flex-col h-full rounded-[2.5rem] border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent overflow-hidden shadow-2xl transition-all hover:shadow-primary/5 group">
            <div className="p-8 sm:p-12 flex-1 flex flex-col">
              <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-8 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-500">
                <PiggyBank className="w-8 h-8" />
              </div>
              
              <h2 className="text-4xl font-bold mb-6">Target Savings</h2>
              
              <div className="space-y-6 flex-1">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Set specific financial goals and let Vault handle the rest. 
                  Enjoy a <span className="text-primary font-bold">2% interest reward</span> for 
                  hitting your targets on time.
                </p>
                
                <ul className="space-y-4">
                  {[
                    { icon: Target, text: "Set Goal Titles & Deadlines" },
                    { icon: LockIcon, text: "Cryptographic Fund Locking" },
                    { icon: TrendingUp, text: "2% Completion Reward" },
                    { icon: Wallet, text: "Automated Funding Sources" },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-primary" />
                      </div>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-12">
                <Button size="lg" className="w-full rounded-2xl h-16 text-lg font-bold shadow-xl shadow-primary/20 transition-all active:scale-95" asChild>
                  <Link to="/savings" search={{ tab: "setup" }}>
                    Setup Savings Goal <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
              </div>
            </div>
            
            <div className="bg-primary/10 p-6 border-t border-primary/10">
              <p className="text-xs text-center text-primary/80 font-bold uppercase tracking-widest">
                Safe. Secure. High-Yield.
              </p>
            </div>
          </div>

          {/* LOANS SECTION (RIGHT) */}
          <div className="flex flex-col h-full rounded-[2.5rem] border border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-transparent overflow-hidden shadow-2xl transition-all hover:shadow-emerald-500/5 group">
            <div className="p-8 sm:p-12 flex-1 flex flex-col">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                <Landmark className="w-8 h-8" />
              </div>
              
              <h2 className="text-4xl font-bold mb-6 text-foreground">Instant Credit</h2>
              
              <div className="space-y-6 flex-1">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Access credit limits up to <span className="text-emerald-500 font-bold">50% of your median balance</span>. 
                  No paperwork, instant disbursement based on your ledger history.
                </p>
                
                <ul className="space-y-4">
                  {[
                    { icon: ShieldCheck, text: "Age-Based Eligibility (&#62; 6 Years)" },
                    { icon: TrendingUp, text: "Dynamic Credit Limit Growth" },
                    { icon: AlertCircle, text: "Weekly Outstanding Alerts" },
                    { icon: History, text: "Seamless Repayment Tracker" },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium text-foreground/80">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-emerald-500" />
                      </div>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-12">
                <Button size="lg" className="w-full rounded-2xl h-16 text-lg font-bold shadow-xl shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-95" asChild>
                  <Link to="/loans">
                    Request Instant Loan <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
              </div>
            </div>
            
            <div className="bg-emerald-500/10 p-6 border-t border-emerald-500/10">
              <p className="text-xs text-center text-emerald-600 font-bold uppercase tracking-widest">
                Fast. Fair. Algorithmic.
              </p>
            </div>
          </div>

        </div>

        {/* Global Policies Section */}
        <div className="rounded-[2.5rem] border border-border/40 bg-muted/20 p-8 sm:p-12 backdrop-blur-md">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold">Vault Financial Integrity Policies</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-12">
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-foreground">Interest Rules</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                2% bonus credited to your main ledger if target is achieved by the deadline. 
                Completion is verified by the core ledger engine within 24 hours of target hit.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-foreground">Lock Enforcement</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Funds are cryptographically locked until the user-defined date. 
                Early withdrawal is strictly disabled to protect your financial discipline.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-foreground">Lending Guard</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Requires account age &#62; 6 years and average deposits &#62; KES 2,000. 
                Limits are strictly capped at 50% of your 90-day median frequent balance.
              </p>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
