import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Shield,
  Database,
  Layers,
  ArrowRight,
  Wallet,
  Send,
  LineChart,
  Lock,
  Sparkles,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Vault — A secure, real-time wallet for the modern world" },
      {
        name: "description",
        content:
          "Vault is a bank-grade digital wallet for sending, depositing, and managing money across borders — secure, instant, and beautifully simple.",
      },
      { property: "og:title", content: "Vault — Money, secured." },
      {
        property: "og:description",
        content: "Send, deposit, and manage money in real time with bank-grade security.",
      },
    ],
  }),
});

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
        <path d="M6 6 L20 34 L34 6 L27 6 L20 22 L13 6 Z" fill="oklch(0.45 0.16 165)" />
        <circle cx="26" cy="14" r="3" fill="oklch(0.65 0.14 165)" opacity="0.85" />
      </svg>
      <span className="text-2xl font-serif tracking-tight text-foreground">Vault</span>
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#security" className="hover:text-foreground transition-colors">Security</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="text-sm font-medium text-foreground hover:text-primary transition-colors px-3">
            Sign In
          </Link>
          <Button asChild className="h-9 bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/sign-up">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden" style={{ background: "var(--gradient-bg)" }}>
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pb-32 md:pt-28">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Now with instant cross-border transfers
            </span>
            <h1 className="mt-6 font-serif text-5xl leading-[1.05] tracking-tight text-foreground md:text-6xl">
              Money, <span className="text-primary">secured.</span>
              <br />
              Movement, <span className="italic">instant.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              Vault is the modern wallet for sending, depositing, and managing money in real time —
              with the security of a bank and the simplicity of a tap.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 bg-primary px-6 text-primary-foreground hover:bg-primary/90">
                <Link to="/sign-up">
                  Create your Vault <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6">
                <Link to="/login">I already have an account</Link>
              </Button>
            </div>

            <ul className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" /> Bank-grade security</li>
              <li className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-primary" /> Data integrity</li>
              <li className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-primary" /> Atomic transactions</li>
            </ul>
          </div>

          <div className="relative">
            <div
              className="rounded-3xl border border-border/60 bg-card/80 p-6 backdrop-blur-xl"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Balance</p>
                  <p className="mt-1 font-serif text-4xl text-foreground">$24,830.<span className="text-muted-foreground">42</span></p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">+ 4.2%</span>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2">
                {[
                  { label: "Send", icon: Send },
                  { label: "Deposit", icon: Wallet },
                  { label: "Invest", icon: LineChart },
                ].map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-4 text-xs text-foreground transition-colors hover:bg-primary/5"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-3">
                {[
                  { name: "Aisha Bello", note: "Cross-border • NGN", amount: "+ $420.00" },
                  { name: "Stripe payout", note: "Deposit • USD", amount: "+ $1,250.00" },
                  { name: "Coffee subscription", note: "Auto-pay • USD", amount: "− $14.99" },
                ].map((row) => (
                  <div
                    key={row.name}
                    className="flex items-center justify-between rounded-xl border border-border/40 bg-background/30 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.note}</p>
                    </div>
                    <span className={row.amount.startsWith("−") ? "text-sm text-muted-foreground" : "text-sm font-medium text-primary"}>
                      {row.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-primary/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-6 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: Send,
      title: "Send anywhere, instantly",
      desc: "Move money across borders in seconds — to bank accounts, mobile money, or other Vault users.",
    },
    {
      icon: Wallet,
      title: "One wallet, many rails",
      desc: "Stripe, Flutterwave, ACH, and more. Deposit and withdraw with the rail that fits.",
    },
    {
      icon: Lock,
      title: "End-to-end security",
      desc: "Biometric unlock, device binding, and a recovery phrase you fully control.",
    },
    {
      icon: Globe,
      title: "Truly multi-currency",
      desc: "Hold and convert USD, EUR, NGN, GHS and more — at honest, transparent rates.",
    },
    {
      icon: LineChart,
      title: "Insights that matter",
      desc: "Real-time balances, spending trends, and recurring activity in one elegant view.",
    },
    {
      icon: Shield,
      title: "Atomic by design",
      desc: "Every transaction either fully succeeds or fully reverses. No silent failures.",
    },
  ];

  return (
    <section id="features" className="bg-background py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Features</p>
          <h2 className="mt-3 font-serif text-4xl text-foreground">
            Everything you need. Nothing you don't.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Vault is built around the moments that matter: sending, receiving, and seeing exactly
            where your money is — at any time.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-medium text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Security() {
  const points = [
    "AES-256 encryption at rest, TLS 1.3 in transit",
    "Biometric and PIN-based access controls",
    "SOC 2 Type II aligned operational controls",
    "Atomic ledger — every cent reconciled in real time",
    "Recovery phrase, fully owned and held by you",
  ];

  return (
    <section id="security" className="border-y border-border bg-card/40 py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Security</p>
          <h2 className="mt-3 font-serif text-4xl text-foreground">
            A vault, not a wallet.
          </h2>
          <p className="mt-4 text-muted-foreground">
            We treat your money like the bank does — and your privacy like the bank should. Every
            layer of Vault is engineered for safety, transparency, and your control.
          </p>
          <ul className="mt-8 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm text-foreground/90">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="relative rounded-3xl border border-border/60 bg-background p-8"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Vault is locked</p>
              <p className="text-xs text-muted-foreground">Use Face ID or your secure PIN</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-10 rounded-md border border-border bg-muted/30"
              />
            ))}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "↵"].map((k, i) => (
              <button
                key={i}
                className="h-12 rounded-xl border border-border bg-card text-foreground hover:bg-primary/5 disabled:opacity-0"
                disabled={k === ""}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    {
      name: "Personal",
      price: "Free",
      desc: "For everyday spending, sending, and saving.",
      features: ["Unlimited transfers within Vault", "2 free withdrawals/month", "Multi-currency wallet"],
      cta: "Open a Vault",
      featured: false,
    },
    {
      name: "Plus",
      price: "$6/mo",
      desc: "For frequent senders and global earners.",
      features: ["Unlimited withdrawals", "Better FX rates", "Priority support", "Spending insights"],
      cta: "Try Plus free",
      featured: true,
    },
    {
      name: "Business",
      price: "Custom",
      desc: "For teams moving money at scale.",
      features: ["Multi-user access", "API & webhooks", "Dedicated rails", "SLA & compliance support"],
      cta: "Talk to us",
      featured: false,
    },
  ];

  return (
    <section id="pricing" className="bg-background py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Pricing</p>
          <h2 className="mt-3 font-serif text-4xl text-foreground">Simple, honest, transparent.</h2>
          <p className="mt-4 text-muted-foreground">No hidden fees. No surprise FX spreads. Pick the plan that fits how you move money.</p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={
                "rounded-2xl border p-7 " +
                (t.featured
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card")
              }
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-medium text-foreground">{t.name}</h3>
                {t.featured && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary-foreground">Popular</span>
                )}
              </div>
              <p className="mt-3 font-serif text-3xl text-foreground">{t.price}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
              <ul className="mt-6 space-y-2">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground/90">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={
                  "mt-7 h-11 w-full " +
                  (t.featured
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-foreground text-background hover:bg-foreground/90")
                }
              >
                <Link to="/sign-up">{t.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    {
      q: "Is Vault a bank?",
      a: "Vault is a regulated digital wallet. Funds are held with partner banks under strict custody rules.",
    },
    {
      q: "Which countries do you support?",
      a: "We currently support 30+ countries across Africa, Europe, and North America, with more rolling out monthly.",
    },
    {
      q: "How fast are transfers?",
      a: "Transfers between Vault users are instant. External transfers settle in seconds to a few minutes depending on the rail.",
    },
    {
      q: "What happens if I lose my device?",
      a: "Your account is protected by PIN, biometrics, and a recovery phrase. You can recover access on a new device safely.",
    },
  ];

  return (
    <section id="faq" className="border-t border-border bg-card/40 py-24">
      <div className="mx-auto max-w-3xl px-6">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">FAQ</p>
        <h2 className="mt-3 font-serif text-4xl text-foreground">Good questions, honest answers.</h2>

        <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-background">
          {faqs.map(({ q, a }) => (
            <details key={q} className="group p-6 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between text-foreground">
                <span className="font-medium">{q}</span>
                <span className="text-primary transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="relative overflow-hidden bg-background py-24">
      <div
        className="mx-auto max-w-5xl rounded-3xl border border-border px-6 py-16 text-center"
        style={{ background: "var(--gradient-bg)", boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="mx-auto max-w-2xl font-serif text-4xl text-foreground md:text-5xl">
          Your money deserves a Vault.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Open an account in under two minutes. No paperwork, no waiting rooms.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="h-12 bg-primary px-6 text-primary-foreground hover:bg-primary/90">
            <Link to="/sign-up">
              Create your Vault <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-6">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-background py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
        <Logo />
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Vault. All rights reserved.</p>
        <div className="flex items-center gap-5 text-xs text-muted-foreground">
          <a href="#" className="hover:text-foreground">Terms</a>
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Contact</a>
        </div>
      </div>
    </footer>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <Hero />
      <Features />
      <Security />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}