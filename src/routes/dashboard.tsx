import { createFileRoute, Link } from "@tanstack/react-router";
import {
  UserPlus,
  Lock,
  MoreVertical,
  Plus,
  Settings,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Vault OS" },
      { name: "description", content: "Unified portfolio balance and transactions across your finance accounts." },
    ],
  }),
  component: DashboardPage,
});

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <path d="M6 6 L16 26 L26 6" stroke="oklch(0.82 0.16 165)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-serif text-xl tracking-tight">
        Vault <span className="text-muted-foreground font-sans text-sm">OS</span>
      </span>
    </div>
  );
}

function NavLink({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button
      className={`relative pb-1 text-sm transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
      {active && <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-primary rounded-full" />}
    </button>
  );
}

function AccountBadge({
  icon,
  name,
  type,
  amount,
  updated,
  primary,
}: {
  icon: React.ReactNode;
  name: string;
  type: string;
  amount: string;
  updated?: string;
  primary?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-card/60 border border-border/50 p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-primary">
            {icon}
          </div>
          <div>
            <div className="text-sm font-medium">{name}</div>
            <div className="text-xs text-muted-foreground">{type}</div>
          </div>
        </div>
        {primary ? (
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Lock className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <div className="mt-4 text-3xl font-semibold text-primary">{amount}</div>
      {primary ? (
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1">Send</Button>
          <Button size="sm" className="flex-1">Deposit</Button>
        </div>
      ) : (
        <div className="mt-6 text-xs text-muted-foreground text-right">{updated}</div>
      )}
    </div>
  );
}

function Avatar({ initial, color }: { initial: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <div className={`w-11 h-11 rounded-full ${color} flex items-center justify-center text-white font-medium`}>
          {initial}
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary border-2 border-card" />
      </div>
      <span className="text-xs text-muted-foreground">{initial}.</span>
    </div>
  );
}

function QuickSend({ avatars, withAdd }: { avatars: { initial: string; color: string; name: string }[]; withAdd?: boolean }) {
  return (
    <div className="rounded-2xl bg-card/40 border border-border/40 p-4">
      <div className="text-sm text-muted-foreground mb-3">Quick Send (P2P)</div>
      <div className="flex items-center gap-4">
        {withAdd && (
          <button className="w-11 h-11 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground">
            <Plus className="w-4 h-4" />
          </button>
        )}
        {avatars.map((a) => (
          <div key={a.name} className="flex flex-col items-center gap-1">
            <div className="relative">
              <div className={`w-11 h-11 rounded-full ${a.color} flex items-center justify-center text-white font-medium`}>
                {a.initial}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary border-2 border-card" />
            </div>
            <span className="text-xs text-muted-foreground">{a.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NetWorthChart() {
  return (
    <div className="rounded-2xl bg-card/40 border border-border/40 p-4">
      <div className="text-sm font-medium mb-3">Net Worth Over Time</div>
      <div className="relative h-28">
        <div className="absolute left-0 top-0 text-[10px] text-muted-foreground">35K</div>
        <div className="absolute left-0 bottom-4 text-[10px] text-muted-foreground">0</div>
        <svg viewBox="0 0 300 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.82 0.16 165)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="oklch(0.82 0.16 165)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,80 L40,70 L80,75 L120,55 L160,45 L200,35 L240,25 L300,10 L300,100 L0,100 Z" fill="url(#chartFill)" />
          <path d="M0,80 L40,70 L80,75 L120,55 L160,45 L200,35 L240,25 L300,10" stroke="oklch(0.82 0.16 165)" strokeWidth="2" fill="none" />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-muted-foreground px-6">
          <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span>
        </div>
      </div>
    </div>
  );
}

const filters = ["All", "Vault", "Chase", "BofA", "Revolut", "Mobile Money"];

const transactions = [
  { tag: "P2P", icon: "V", color: "bg-primary/20 text-primary", title: "P2P Transfer to Maria C.", time: "Just now", amount: "+$850.00", note: "Internal Vault P2P", positive: true },
  { tag: "PP", icon: "C", color: "bg-blue-500/20 text-blue-300", title: "Chase Bank Checkings: Direct Deposit", time: "2 hours ago", amount: "+$2,500.00", note: "[Status: Cleared]  ·  Standard ACH", positive: true },
  { tag: "W", icon: "B", color: "bg-red-500/20 text-red-300", title: "Bank of America Savings: Withdrawal to M-Pesa", time: "2 hours ago", amount: "-$100.00", note: "M-Pesa API", positive: false },
  { tag: "P2P", icon: "V", color: "bg-primary/20 text-primary", title: "P2P Transfer from John L.", time: "Yesterday", amount: "+$159.00", note: "Internal Vault P2P", positive: true },
];

function DashboardPage() {
  return (
    <div className="min-h-screen text-foreground" style={{ background: "var(--gradient-bg)" }}>
      {/* Top nav */}
      <header className="border-b border-border/40 bg-background/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Logo />
            <nav className="flex items-center gap-7">
              <NavLink active>Dashboard</NavLink>
              <NavLink>Transact</NavLink>
              <NavLink>Settings</NavLink>
              <NavLink>Help</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500" />
            <button className="text-muted-foreground hover:text-foreground"><Settings className="w-4 h-4" /></button>
            <button className="text-muted-foreground hover:text-foreground"><HelpCircle className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-4xl font-light tracking-tight">Unified Portfolio Balance</h1>
          <p className="text-sm text-muted-foreground mt-1">Integrates a renew Accounts of multiple finance accounts.</p>
        </div>

        {/* Total net worth */}
        <div className="rounded-2xl bg-card/30 border border-border/40 p-6 mb-4 backdrop-blur-sm flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Total Net Worth</div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-5xl font-light">$14,230.15</span>
              <span className="text-xs px-2 py-1 rounded-full bg-primary/15 text-primary">+ 5.25%</span>
            </div>
          </div>
          <Button className="gap-2">
            <UserPlus className="w-4 h-4" /> Add External Account
          </Button>
        </div>

        {/* Accounts grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <AccountBadge
            primary
            icon={<svg width="16" height="16" viewBox="0 0 32 32"><path d="M6 6 L16 26 L26 6" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" /></svg>}
            name="Vault: Digital Wallet OS"
            type="Verified Account"
            amount="$2,450.75"
          />
          <AccountBadge
            icon={<div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">C</div>}
            name="Chase Bank Checkings"
            type="External account"
            amount="$5,120.00"
            updated="Updated: 5:35 AM"
          />
          <AccountBadge
            icon={<div className="w-full h-full rounded-full bg-red-600 flex items-center justify-center text-white text-xs">B</div>}
            name="Bank of America Savings"
            type="External account"
            amount="$6,660.00"
            updated="Updated: 5:35 AM"
          />
        </div>

        {/* Quick send + chart */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <QuickSend
            avatars={[
              { initial: "M", color: "bg-emerald-500", name: "Maria C" },
              { initial: "J", color: "bg-blue-500", name: "John L" },
              { initial: "L", color: "bg-pink-500", name: "Lisa M" },
              { initial: "A", color: "bg-red-500", name: "Ben A" },
            ]}
          />
          <QuickSend
            withAdd
            avatars={[
              { initial: "M", color: "bg-emerald-500", name: "Maria C" },
              { initial: "J", color: "bg-blue-500", name: "John L" },
            ]}
          />
          <NetWorthChart />
        </div>

        {/* Transactions */}
        <div className="rounded-2xl bg-card/30 border border-border/40 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-wrap gap-2">
              {filters.map((f, i) => (
                <button
                  key={f}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    i === 0
                      ? "border-primary text-primary"
                      : "border-border/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <RefreshCw className="w-3 h-3" /> Data Synced 2m ago
            </div>
          </div>

          <ul className="divide-y divide-border/40">
            {transactions.map((t, i) => (
              <li key={i} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] uppercase w-9 text-center text-muted-foreground">{t.tag}</span>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${t.color}`}>
                    {t.icon}
                  </div>
                  <div>
                    <div className="text-sm">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.time}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${t.positive ? "text-primary" : "text-destructive"}`}>{t.amount}</div>
                  <div className="text-xs text-muted-foreground">{t.note}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground">Sign out</Link>
        </div>
      </main>
    </div>
  );
}