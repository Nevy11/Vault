import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search,
  Lock,
  Settings,
  HelpCircle,
  Info,
  Check,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — Vault OS" },
      {
        name: "description",
        content: "Send money, deposit funds, and withdraw across your Vault accounts.",
      },
    ],
  }),
  component: TransactionsPage,
});

type Mode = "send" | "deposit" | "withdraw";

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <path
          d="M6 6 L16 26 L26 6"
          stroke="oklch(0.82 0.16 165)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-serif text-xl tracking-tight">
        Vault <span className="text-muted-foreground font-sans text-sm">OS</span>
      </span>
    </div>
  );
}

function NavLink({
  children,
  active,
  to,
}: {
  children: React.ReactNode;
  active?: boolean;
  to?: string;
}) {
  const cls = `relative pb-1 text-sm transition-colors ${
    active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
  }`;
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
        {active && (
          <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-primary rounded-full" />
        )}
      </Link>
    );
  }
  return (
    <button className={cls}>
      {children}
      {active && (
        <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-primary rounded-full" />
      )}
    </button>
  );
}

function WalletCard() {
  return (
    <div className="rounded-2xl border border-primary/40 bg-card/40 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Vault USD Wallet
        </div>
        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="mt-3 text-3xl font-light text-primary">$12,450.75</div>
    </div>
  );
}

const contacts = [
  { initial: "M", color: "bg-emerald-500", name: "Maria A.", sub: "+1 (555) 123-457" },
  { initial: "M", color: "bg-blue-500", name: "Maria B.", sub: "+1 minutes 457" },
  { initial: "J", color: "bg-pink-500", name: "John N.", sub: "+1 (555) 123-457" },
  { initial: "M", color: "bg-purple-500", name: "Maria C.", sub: "25 minutes ago" },
  { initial: "J", color: "bg-amber-500", name: "John L.", sub: "27 minutes ago" },
  { initial: "L", color: "bg-rose-500", name: "Lisa M.", sub: "23 minutes ago" },
  { initial: "B", color: "bg-teal-500", name: "Ben A.", sub: "25 minutes ago" },
];

function SendPanel() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      <div className="space-y-4">
        <WalletCard />
        <div className="rounded-2xl border border-border/50 bg-card/30 p-5">
          <label className="text-xs text-muted-foreground">Send Amount</label>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-border/60 px-3 py-2">
            <span className="text-muted-foreground">$</span>
            <input
              className="flex-1 bg-transparent text-lg outline-none"
              placeholder=""
            />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Real-time balance polling active (Source 17).
          </p>
        </div>
        <Button className="w-full">Send Funds</Button>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/30 p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Select Recipient
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-9 bg-background/40" />
        </div>
        <div className="text-xs text-muted-foreground mb-2">Quick-Filters</div>
        <div className="flex gap-2 mb-4">
          {["Vault", "Bank", "Mobile Money"].map((f, i) => (
            <button
              key={f}
              className={`px-3 py-1 rounded-full text-xs border ${
                i === 0
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border/60 text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground mb-2">
          Vault Contacts (recents list)
        </div>
        <ul className="divide-y divide-border/40 max-h-[360px] overflow-y-auto pr-1">
          {contacts.map((c) => (
            <li key={c.name} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full ${c.color} flex items-center justify-center text-white text-sm font-medium`}
                >
                  {c.initial}
                </div>
                <div>
                  <div className="text-sm">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">{c.sub}</div>
                </div>
              </div>
              <span className="text-xs text-primary">+$0.00</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DepositPanel() {
  const [method, setMethod] = useState("stripe");
  const methods = [
    {
      id: "stripe",
      title: "Visa/Mastercard (via Stripe)",
      sub: "Card **** 1234",
      fee: "Fee: $0.00 (Vault Covered)",
    },
    {
      id: "flutterwave",
      title: "Flutterwave",
      sub: "Mobile Money / USSD",
      fee: "Fee: External",
    },
    {
      id: "ach",
      title: "Connected Chase Account (ACH)",
      sub: "Standard ACH Transfer",
      fee: "",
    },
  ];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      <div className="space-y-4">
        <WalletCard />
        <div className="rounded-2xl border border-border/50 bg-card/30 p-5">
          <label className="text-xs text-muted-foreground">Deposit Amount</label>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-border/60 px-3 py-2">
            <span className="text-muted-foreground">$</span>
            <input
              className="flex-1 bg-transparent text-lg outline-none"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/30 p-5 flex flex-col">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
          Select Payment Method
        </div>
        <div className="space-y-3 flex-1">
          {methods.map((m) => {
            const active = method === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`w-full text-left rounded-xl border p-4 transition-colors ${
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border/60 hover:border-border"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center ${
                      active ? "bg-primary border-primary" : "border-border"
                    }`}
                  >
                    {active && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{m.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{m.sub}</div>
                    {m.fee && (
                      <div className="text-xs text-muted-foreground mt-0.5">{m.fee}</div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Info className="w-3 h-3" /> Integer cent precision applied (Source 20).
        </div>
        <Button className="mt-4 w-full">Deposit Funds</Button>
      </div>
    </div>
  );
}

function WithdrawPanel() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      <div className="space-y-4">
        <WalletCard />
        <div className="rounded-2xl border border-border/50 bg-card/30 p-5">
          <label className="text-xs text-muted-foreground">Withdrawal Amount</label>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-border/60 px-3 py-2">
            <span className="text-muted-foreground">$</span>
            <input
              className="flex-1 bg-transparent text-lg outline-none"
              placeholder=""
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/30 p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Select Recipient
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-4">
          <span>[ Vault Contacts ]</span>
          <span className="text-primary">[ Bank Accounts ]</span>
          <span>[ Mobile Money ]</span>
        </div>

        <ul className="space-y-3 mb-5">
          <li className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white text-xs">
              B
            </div>
            <div>
              <div className="text-sm font-medium">Bank of America</div>
              <div className="text-[11px] text-muted-foreground">(Source 88)</div>
            </div>
          </li>
          <li className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
              C
            </div>
            <div>
              <div className="text-sm font-medium">Chase Bank</div>
              <div className="text-[11px] text-muted-foreground">(Source 88)</div>
            </div>
          </li>
        </ul>

        <div className="flex justify-between text-xs text-muted-foreground border-t border-border/40 pt-3">
          <span>Exchange Rate (USD/KES):</span>
          <span className="text-foreground">130.00</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Equivalent:</span>
          <span className="text-foreground">KES 0.00</span>
        </div>

        <div className="mt-5 rounded-xl border border-border/60 p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Account Verification Required
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Verification needed for large bank transfers. (Source 23/81 84).
          </p>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">PIN</span>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className="w-2 h-2 rounded-full bg-primary" />
                ))}
              </div>
            </div>
            <button className="w-8 h-8 rounded-md border border-border/60 flex items-center justify-center text-muted-foreground">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Info className="w-3 h-3" /> Verify account or select method
        </div>
        <Button className="mt-3 w-full" disabled>
          Withdraw Funds
        </Button>
      </div>
    </div>
  );
}

function TransactionsPage() {
  const [mode, setMode] = useState<Mode>("send");

  const tabs: { id: Mode; label: string }[] = [
    { id: "send", label: "Send Money" },
    { id: "deposit", label: "Deposit" },
    { id: "withdraw", label: "Withdraw" },
  ];

  const titles: Record<Mode, string> = {
    send: "Unified Transaction Page",
    deposit: "Deposit Funds",
    withdraw: "Withdrawal",
  };

  return (
    <div className="min-h-screen text-foreground" style={{ background: "var(--gradient-bg)" }}>
      <header className="border-b border-border/40 bg-background/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Logo />
            <nav className="flex items-center gap-7">
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/transactions" active>Transact</NavLink>
              <NavLink to="/settings">Settings</NavLink>
              <NavLink to="/help">Help</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500" />
            <ThemeToggle />
            <button className="text-muted-foreground hover:text-foreground">
              <Settings className="w-4 h-4" />
            </button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground" aria-label="About Vault OS">
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  Vault seamlessly aggregates your balance using leading financial service connectors, making your entire financial snapshot instantly visible securely in one place. Integration is handled by robust external APIs for a native experience.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-full border border-border/50 bg-card/40 p-1 backdrop-blur-sm">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setMode(t.id)}
                className={`px-5 py-2 rounded-full text-sm transition-colors ${
                  mode === t.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-light tracking-tight">{titles[mode]}</h1>
          {mode === "send" && (
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-9 bg-card/40" />
            </div>
          )}
        </div>

        {mode === "send" && <SendPanel />}
        {mode === "deposit" && <DepositPanel />}
        {mode === "withdraw" && <WithdrawPanel />}
      </main>
    </div>
  );
}
