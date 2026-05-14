import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  ShieldCheck,
  HelpCircle,
  Settings as SettingsIcon,
  Phone,
  MessageSquare,
  Mail,
  ChevronDown,
  Send,
  LifeBuoy,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & Support — Vault OS" },
      { name: "description", content: "Get help, browse FAQs, and contact Vault OS support." },
    ],
  }),
  component: HelpPage,
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
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-8 lg:p-10 shadow-[0_1px_0_0_oklch(1_0_0_/_0.03)_inset]">
      <header className="flex items-center gap-3 pb-6 mb-8 border-b border-border/40">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-medium tracking-[0.18em] uppercase text-foreground">
            {title}
          </h2>
          {meta && <p className="mt-1 text-xs text-muted-foreground/80">{meta}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

const channels = [
  {
    id: "call",
    icon: Phone,
    title: "Request a Call",
    detail: "+1 (800) Vault·OS",
    note: "Avg. wait: under 2 minutes",
  },
  {
    id: "chat",
    icon: MessageSquare,
    title: "24/7 Live Chat",
    detail: "Chat with a Vault specialist",
    note: "Online now",
  },
  {
    id: "email",
    icon: Mail,
    title: "Email Support",
    detail: "support@vault.os",
    note: "Replies within 4 hours",
  },
];

const faqs = [
  {
    q: "How do I reset my Vault PIN securely?",
    a: "Go to Settings → Security Center → reset PIN. You'll be asked for biometric verification and a one-time code sent to your authorized device.",
  },
  {
    q: "Are there any hidden fees for P2P transfers?",
    a: "No. Vault OS is a zero-hidden-fee platform. The only fee shown at checkout is the network/exchange fee, which is itemized before you confirm.",
  },
  {
    q: "Why is my withdrawal to a bank delayed?",
    a: "Bank withdrawals are subject to your destination bank's processing window — typically 1–3 business days. Verify your KYC level for higher daily limits.",
  },
  {
    q: "How can I view my session history and logs?",
    a: "Open Settings → Security Center → Session History. You'll see every login, device, and action in chronological order.",
  },
  {
    q: "What does KYC Level 2 unlock?",
    a: "Level 2 unlocks large withdrawals, international transfers, and higher peer-transfer limits. Verify your government ID under Account Profile.",
  },
];

function HelpPage() {
  const [selectedChannel, setSelectedChannel] = useState("call");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [agreed, setAgreed] = useState(false);

  return (
    <div
      className="min-h-screen text-foreground"
      style={{ background: "var(--gradient-bg)" }}
    >
      {/* Top nav */}
      <header className="border-b border-border/40 bg-background/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Logo />
            <nav className="flex items-center gap-7">
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/transactions">Transact</NavLink>
              <NavLink to="/settings">Settings</NavLink>
              <NavLink to="/help" active>Help</NavLink>
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
          <div className="mt-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h1 className="font-serif text-4xl lg:text-5xl tracking-tight">
                Help <span className="text-muted-foreground/60">&</span> Support
              </h1>
              <p className="mt-3 text-sm text-muted-foreground max-w-xl leading-relaxed">
                We're here around the clock. Pick a channel, browse common
                questions, or send us a message — a real human will respond.
              </p>
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search help articles…"
                className="pl-10 h-11 bg-card/40 border-border/60"
              />
            </div>
          </div>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-8 lg:gap-10">
          {/* Left column */}
          <div className="space-y-8 lg:space-y-10">
            <SectionCard icon={ShieldCheck} title="Direct Contact Channels" meta="Choose your preferred support path">
              <div className="space-y-3">
                {channels.map((c) => {
                  const Icon = c.icon;
                  const active = selectedChannel === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedChannel(c.id)}
                      className={`w-full flex items-center gap-4 rounded-xl border px-5 py-4 text-left transition-all ${
                        active
                          ? "border-primary/50 bg-primary/5 shadow-[0_0_0_1px_oklch(0.82_0.16_165_/_0.2)]"
                          : "border-border/40 bg-input/20 hover:border-border hover:bg-input/40"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                          active ? "border-primary" : "border-muted-foreground/40"
                        }`}
                      >
                        {active && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{c.title}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground truncate">
                          {c.detail}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                          {c.note}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard icon={LifeBuoy} title="Frequently Asked Questions" meta="Tap a question to expand">
              <div className="space-y-3">
                {faqs.map((f, i) => {
                  const open = openFaq === i;
                  return (
                    <div
                      key={i}
                      className={`rounded-xl border transition-colors ${
                        open ? "border-primary/30 bg-primary/[0.03]" : "border-border/40 bg-input/20"
                      }`}
                    >
                      <button
                        onClick={() => setOpenFaq(open ? null : i)}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                      >
                        <span className="text-sm text-foreground">{f.q}</span>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            open ? "rotate-180 text-primary" : ""
                          }`}
                        />
                      </button>
                      {open && (
                        <div className="px-5 pb-5 -mt-1 text-sm text-muted-foreground leading-relaxed">
                          {f.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>

          {/* Right column — Contact form */}
          <SectionCard icon={Mail} title="Direct Contact Form" meta="Typical response within 4 hours">
            <form className="space-y-7" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">First name</label>
                  <Input placeholder="Alex" className="h-11 bg-input/40 border-border/60" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Last name</label>
                  <Input placeholder="Johnson" className="h-11 bg-input/40 border-border/60" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">Email address</label>
                <Input
                  type="email"
                  placeholder="alex@example.com"
                  className="h-11 bg-input/40 border-border/60"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm text-muted-foreground">Your message</label>
                  <span className="text-xs text-muted-foreground/60">0 / 1000</span>
                </div>
                <textarea
                  rows={6}
                  placeholder="Describe your issue in detail. The more context you share, the faster we can help."
                  className="w-full rounded-md border border-border/60 bg-input/40 px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border/60 bg-input/40 accent-primary"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  I agree to Vault's{" "}
                  <span className="text-primary hover:underline">Terms & Conditions</span> and{" "}
                  <span className="text-primary hover:underline">Privacy Policy</span>.
                </span>
              </label>

              <Button
                type="submit"
                disabled={!agreed}
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed gap-2"
              >
                <Send className="h-4 w-4" />
                Submit message
              </Button>
            </form>
          </SectionCard>
        </div>

        {/* Footer */}
        <div className="mt-12 lg:mt-16 pt-8 border-t border-border/40 text-center">
          <p className="text-xs text-muted-foreground">
            Need urgent help? Call our 24/7 line at{" "}
            <span className="text-foreground">+1 (800) Vault·OS</span>
          </p>
        </div>
      </main>
    </div>
  );
}
