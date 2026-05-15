import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  User,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  ScrollText,
  CheckCircle2,
  Info,
  ChevronRight,
  Settings as SettingsIcon,
  HelpCircle,
  Camera,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Vault OS" },
      { name: "description", content: "Configure your Vault OS account, security, and preferences." },
    ],
  }),
  component: SettingsPage,
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

function NavLink({ to, children, active }: { to: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      to={to}
      className={`relative pb-1 text-sm tracking-wide transition-colors ${
        active
          ? "text-foreground after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-px after:bg-primary"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

function SectionCard({
  icon: Icon,
  title,
  meta,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  meta?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-8 lg:p-10 shadow-[0_1px_0_0_oklch(1_0_0_/_0.03)_inset]">
      <header className="flex items-start justify-between gap-6 pb-6 mb-8 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-medium tracking-[0.18em] uppercase text-foreground">
              {title}
            </h2>
            {meta && (
              <p className="mt-1 text-xs text-muted-foreground/80">{meta}</p>
            )}
          </div>
        </div>
        {hint && (
          <span className="text-xs text-muted-foreground/70 max-w-[180px] text-right leading-relaxed">
            {hint}
          </span>
        )}
      </header>
      <div className="space-y-7">{children}</div>
    </section>
  );
}

function Row({
  label,
  children,
  description,
}: {
  label: string;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3 sm:gap-8 items-start">
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {description && (
          <div className="mt-1 text-xs text-muted-foreground/60 leading-relaxed">
            {description}
          </div>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  defaultOn,
}: {
  label: string;
  description?: string;
  defaultOn?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-1">
      <div className="min-w-0">
        <div className="text-sm text-foreground">{label}</div>
        {description && (
          <div className="mt-1 text-xs text-muted-foreground/70 leading-relaxed">
            {description}
          </div>
        )}
      </div>
      <Switch defaultChecked={defaultOn} />
    </div>
  );
}

function SettingsPage() {
  return (
    <TooltipProvider>
      <div
        className="min-h-screen text-foreground"
        style={{ background: "var(--gradient-bg)" }}
      >
        {/* Top nav */}
        <header className="border-b border-border/40 bg-background/40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-10">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Logo />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Vault OS - Unified digital wallet and financial management platform</p>
                </TooltipContent>
              </Tooltip>
              <nav className="flex items-center gap-7">
                <NavLink to="/dashboard">Dashboard</NavLink>
                <NavLink to="/transactions">Transact</NavLink>
                <NavLink to="/settings" active>Settings</NavLink>
                <NavLink to="/help">Help</NavLink>
              </nav>
            </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500" />
            <ThemeToggle />
            <button className="text-muted-foreground hover:text-foreground">
              <SettingsIcon className="w-4 h-4" />
            </button>
            <button className="text-muted-foreground hover:text-foreground">
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-8 lg:px-12 py-12 lg:py-16">
        {/* Header */}
        <div className="mb-12 lg:mb-16">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="mt-8 font-serif text-4xl lg:text-5xl tracking-tight">
            Settings <span className="text-muted-foreground/60">&</span> Configuration
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-xl leading-relaxed">
            Manage your profile, security posture, and personal preferences.
            Changes apply across all authorized devices.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
          {/* Account Profile */}
          <SectionCard
            icon={User}
            title="Account Profile & KYC"
            meta="Sources 98, 100"
          >
            <Row label="Profile Picture">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-sm text-muted-foreground">
                    Upload a profile picture to personalize your account
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Upload className="w-4 h-4" />
                      Upload Photo
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      Remove
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    JPG, PNG or GIF. Max size 5MB.
                  </div>
                </div>
              </div>
            </Row>
            <Row label="Verification Status">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Verified · Level 2
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <Info className="h-3.5 w-3.5" />
                  Required for large withdrawals
                </span>
              </div>
            </Row>
            <Row label="Full Name">
              <Input defaultValue="Alex Johnson" className="bg-input/40 border-border/60 h-11" />
            </Row>
            <Row label="KYC Tag" description="Used for peer transfers">
              <Input defaultValue="@alexj_vault" className="bg-input/40 border-border/60 h-11 font-mono" />
            </Row>
          </SectionCard>

          {/* Security Center */}
          <SectionCard
            icon={ShieldCheck}
            title="Security Center"
            meta="Sources 92, 100, 102"
            hint="Required for large withdrawals"
          >
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground/70 mb-3">
                Security Alert Feed
              </div>
              <ul className="space-y-2.5">
                <li className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    Unusual login location <span className="text-muted-foreground">(Kenya)</span>
                  </span>
                  <span className="text-xs text-muted-foreground">2h ago</span>
                </li>
                <li className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    New device authorized
                  </span>
                  <span className="text-xs text-muted-foreground">6h ago</span>
                </li>
              </ul>
            </div>

            <div className="border-t border-border/40 pt-6 space-y-5">
              <ToggleRow
                label="Face ID / Biometric Login"
                description="Use device biometrics to unlock the vault."
                defaultOn
              />
              <ToggleRow
                label="Authorized Devices"
                description="Currently active: alexj_phone, alexj_laptop"
                defaultOn
              />
            </div>

            <div className="border-t border-border/40 pt-6 space-y-3">
              <button className="w-full flex items-center justify-between text-sm text-foreground hover:text-primary transition-colors py-2">
                <span className="flex items-center gap-3">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  Device Management
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button className="w-full flex items-center justify-between text-sm text-foreground hover:text-primary transition-colors py-2">
                <span className="flex items-center gap-3">
                  <ScrollText className="h-4 w-4 text-muted-foreground" />
                  Session History & Activity Logs
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </SectionCard>

          {/* Preferences */}
          <SectionCard
            icon={SlidersHorizontal}
            title="Preferences"
            meta="Sources 15, 95"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Theme</label>
                <select className="w-full h-11 rounded-md border border-border/60 bg-input/40 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  <option>Dark</option>
                  <option>Light</option>
                  <option>System</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Language</label>
                <select className="w-full h-11 rounded-md border border-border/60 bg-input/40 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  <option>English (US)</option>
                  <option>Spanish (ES)</option>
                  <option>French (FR)</option>
                </select>
              </div>
            </div>

            <div className="border-t border-border/40 pt-6">
              <div className="text-xs uppercase tracking-wider text-muted-foreground/70 mb-4">
                Notification Center
              </div>
              <div className="space-y-4">
                <ToggleRow label="Transfer received" defaultOn />
                <ToggleRow label="Account login" />
                <ToggleRow label="Transfer sent" defaultOn />
                <ToggleRow label="Security alerts" defaultOn />
              </div>
            </div>
          </SectionCard>

          {/* Activity */}
          <SectionCard
            icon={ScrollText}
            title="Recent Activity"
            meta="Source 92, 102"
          >
            <ul className="divide-y divide-border/40">
              {[
                { date: "May 20 · 14:02", text: "Login from alexj_laptop", source: "102" },
                { date: "May 19 · 10:15", text: "PIN changed", source: "92" },
                { date: "May 18 · 09:40", text: "Device authorized: alexj_phone", source: "92" },
                { date: "May 17 · 16:22", text: "Withdrawal approved · $2,400", source: "100" },
              ].map((item, i) => (
                <li key={i} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div>
                    <div className="text-sm text-foreground">{item.text}</div>
                    <div className="mt-1 text-xs text-muted-foreground/70">{item.date}</div>
                  </div>
                  <span className="text-xs text-muted-foreground/60 font-mono">
                    src/{item.source}
                  </span>
                </li>
              ))}
            </ul>
            <button className="w-full text-center text-xs text-primary hover:text-primary/80 pt-2 transition-colors">
              View full activity log →
            </button>
          </SectionCard>
        </div>

        {/* Footer actions */}
        <div className="mt-12 lg:mt-16 flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border/40">
          <div className="text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Vault OS synced — all ledger records current
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-muted-foreground">
              Discard
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-6">
              Apply & Save Changes
            </Button>
          </div>
        </div>
      </main>
    </div>
    </TooltipProvider>
  );
}
