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
      <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden">
        {/* Full-Bleed Background Image (Fixed, Center-Cropped, Muted) */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-fixed"
          style={{ 
            backgroundImage: 'url("https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=2070&auto=format&fit=crop")',
            opacity: 0.15
          }}
        />
        {/* Subtle Dark Overlay for extra readability */}
        <div className="absolute inset-0 z-0 bg-background/20" />

        <main className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Unified Finance Header */}
          <div className="mb-12 text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 drop-shadow-sm">Finance & Credit Hub</h1>
            <p className="text-lg text-muted-foreground font-medium leading-relaxed">
              Manage your long-term wealth and access instant liquidity. Vault's automated ledger rules 
              ensure your financial growth is rewarded and your credit is always available.
            </p>
          </div>

          {/* Unified Side-by-Side Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16 items-stretch">
            
            {/* SAVINGS SECTION (LEFT) - Glassmorphism */}
            <div className="flex flex-col h-full rounded-[2.5rem] border border-white/20 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl transition-all hover:shadow-primary/10 group">
              {/* Stylized Header */}
              <div className="h-40 w-full relative overflow-hidden bg-slate-900/40">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/40 via-transparent to-primary/20 z-10" />
                <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-primary/20 blur-3xl rounded-[100%] translate-y-1/2" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center z-20">
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-primary blur-xl opacity-20 animate-pulse" />
                      <PiggyBank className="w-12 h-12 text-primary relative group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="mt-2 flex flex-col items-center">
                      <span className="text-primary font-bold text-[10px] tracking-[0.4em] uppercase">Wealth Vault</span>
                      <div className="h-px w-12 bg-primary/30 mt-1" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 flex-1 flex flex-col">
                <h2 className="text-3xl font-bold mb-4">Target Savings</h2>
                
                <div className="space-y-4 flex-1">
                  <p className="text-base text-foreground/80 font-medium leading-relaxed">
                    Set financial goals and let Vault handle the rest. 
                    Enjoy a <span className="text-primary font-bold">2% interest reward</span> for 
                    hitting your targets on time.
                  </p>
                  
                  <ul className="space-y-3">
                    {[
                      { icon: Target, text: "Set Goal Titles & Deadlines" },
                      { icon: LockIcon, text: "Cryptographic Fund Locking" },
                      { icon: TrendingUp, text: "2% Completion Reward" },
                      { icon: Wallet, text: "Automated Funding Sources" },
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-xs font-bold text-foreground/90">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shadow-sm">
                          <item.icon className="w-3.5 h-3.5 text-primary" />
                        </div>
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  <Button size="lg" className="w-full rounded-2xl h-14 text-base font-bold shadow-xl shadow-primary/20 transition-all active:scale-95" asChild>
                    <Link to="/savings" search={{ tab: "setup" }}>
                      Setup Savings Goal <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                  </Button>
                </div>
              </div>
              
              <div className="bg-primary/5 py-4 border-t border-primary/10">
                <p className="text-[10px] text-center text-primary/80 font-bold uppercase tracking-widest">
                  Safe. Secure. High-Yield.
                </p>
              </div>
            </div>

            {/* LOANS SECTION (RIGHT) - Glassmorphism */}
            <div className="flex flex-col h-full rounded-[2.5rem] border border-white/20 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl transition-all hover:shadow-emerald-500/10 group">
              {/* Header */}
              <div className="h-40 w-full bg-slate-900/40 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/40 via-transparent to-emerald-500/20 z-10" />
                <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center z-20">
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 animate-pulse" />
                      <Landmark className="w-12 h-12 text-emerald-500 relative group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="mt-2 flex flex-col items-center">
                      <span className="text-emerald-500 font-bold text-[10px] tracking-[0.4em] uppercase">Credit Line</span>
                      <div className="h-px w-12 bg-emerald-500/30 mt-1" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 flex-1 flex flex-col">
                <h2 className="text-3xl font-bold mb-4 text-foreground">Instant Credit</h2>
                
                <div className="space-y-4 flex-1">
                  <p className="text-base text-foreground/80 font-medium leading-relaxed">
                    Access credit limits up to <span className="text-emerald-500 font-bold">50% of your balance</span>. 
                    No paperwork, instant disbursement based on your history.
                  </p>
                  
                  <ul className="space-y-3">
                    {[
                      { icon: ShieldCheck, text: "Age-Based Eligibility (&#62; 6 Years)" },
                      { icon: Wallet, text: "Min. Avg. Deposits (&#62; KES 2,000)" },
                      { icon: TrendingUp, text: "Dynamic Credit Limit Growth" },
                      { icon: History, text: "Seamless Repayment Tracker" },
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-xs font-bold text-foreground/90">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center shadow-sm">
                          <item.icon className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  <Button size="lg" className="w-full rounded-2xl h-14 text-base font-bold shadow-xl shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-95" asChild>
                    <Link to="/loans">
                      Request Instant Loan <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                  </Button>
                </div>
              </div>
              
              <div className="bg-emerald-500/5 py-4 border-t border-emerald-500/10">
                <p className="text-[10px] text-center text-emerald-600 font-bold uppercase tracking-widest">
                  Fast. Fair. Algorithmic.
                </p>
              </div>
            </div>

          </div>

          {/* Global Policies Section - Glassmorphism */}
          <div className="rounded-[2.5rem] border border-white/20 bg-white/50 dark:bg-slate-900/40 p-8 sm:p-12 backdrop-blur-lg shadow-xl">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold">Vault Financial Integrity Policies</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-12">
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-foreground">Interest Rules</h4>
                <p className="text-sm text-foreground/70 font-medium leading-relaxed">
                  2% bonus credited to your main ledger if target is achieved by the deadline. 
                  Completion is verified by the core ledger engine within 24 hours of target hit.
                </p>
              </div>
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-foreground">Lock Enforcement</h4>
                <p className="text-sm text-foreground/70 font-medium leading-relaxed">
                  Funds are cryptographically locked until the user-defined date. 
                  Early withdrawal is strictly disabled to protect your financial discipline.
                </p>
              </div>
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-foreground">Lending Guard</h4>
                <p className="text-sm text-foreground/70 font-medium leading-relaxed">
                  Requires account age &#62; 6 years and average deposits &#62; KES 2,000. 
                  Limits are strictly capped at 50% of your 90-day median frequent balance.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AppShell>
  );
}
