import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Shield,
  Database,
  Layers,
  ArrowRight,
  Wallet,
  Send,
  LineChart,
  Lock as LockIcon,
  Sparkles,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopNav } from "@/components/top-nav";
import { Logo } from "@/components/logo";
import { useEffect } from "react";
import { useProfile } from "@/hooks/use-profile";

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

function Nav() {
  return <TopNav />;
}

function Hero() {
  return (
    <section className="relative overflow-hidden" style={{ background: "var(--gradient-bg)" }}>
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 pb-20 pt-16 sm:pb-28 sm:pt-20 md:pb-32 md:pt-28">
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
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                asChild
                size="lg"
                className="h-12 bg-primary px-6 text-primary-foreground hover:bg-primary/90"
              >
                <Link to="/sign-up">
                  Create your Vault <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6">
                <Link to="/login">I already have an account</Link>
              </Button>
            </div>

            <ul className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" /> Bank-grade security
              </li>
              <li className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-primary" /> Data integrity
              </li>
              <li className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" /> Atomic transactions
              </li>
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-xl sm:max-w-2xl lg:max-w-none">
            <div
              className="rounded-3xl border border-border/60 bg-card/80 p-6 backdrop-blur-xl"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Total Balance
                  </p>
                  <p className="mt-1 font-serif text-4xl text-foreground">
                    $24,830.<span className="text-muted-foreground">42</span>
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  + 4.2%
                </span>
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
                    <span
                      className={
                        row.amount.startsWith("−")
                          ? "text-sm text-muted-foreground"
                          : "text-sm font-medium text-primary"
                      }
                    >
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
      icon: LockIcon,
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
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
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
      <div className="mx-auto grid max-w-screen-2xl gap-12 px-4 sm:px-6 lg:px-8 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Security</p>
          <h2 className="mt-3 font-serif text-4xl text-foreground">A vault, not a wallet.</h2>
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
              <LockIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Vault is locked</p>
              <p className="text-xs text-muted-foreground">Use Face ID or your secure PIN</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded-md border border-border bg-muted/30" />
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

function AdvisorSection() {
  return (
    <section id="advisor" className="bg-background py-24 overflow-hidden">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Finance
            </div>
            <h2 className="mt-6 font-serif text-4xl leading-tight text-foreground md:text-5xl lg:text-6xl">
              Meet your personal <span className="text-primary italic">AI Advisor.</span>
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Vault AI isn't just a chatbot. It's a proactive strategist that monitors your
              spending, optimizes your savings, and helps you make smarter financial decisions in
              real-time.
            </p>

            <div className="mt-10 space-y-6">
              {[
                {
                  title: "Smart Insights",
                  desc: "Automatically categorizes spending and suggests optimizations.",
                  icon: LineChart,
                },
                {
                  title: "Proactive Planning",
                  desc: "Helps you set and reach financial goals with tailored advice.",
                  icon: Sparkles,
                },
                {
                  title: "Secure & Private",
                  desc: "Your data is encrypted and used only to power your insights.",
                  icon: Shield,
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card border border-border/60 text-primary shadow-sm">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Button
                asChild
                size="lg"
                className="h-12 bg-primary px-8 text-primary-foreground hover:bg-primary/90"
              >
                <Link to="/sign-up">Consult the Advisor</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8">
                <Link to="/login">View Demo</Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            {/* Premium Mock Chat Interface */}
            <div className="relative mx-auto w-full max-w-[440px] rounded-[2.5rem] border-[8px] border-card bg-background p-3 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
              <div className="overflow-hidden rounded-[1.8rem] bg-zinc-50 dark:bg-zinc-950 p-4 min-h-[500px] flex flex-col">
                {/* Chat Header */}
                <div className="flex items-center gap-3 border-b border-border/40 pb-4 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Vault Advisor</p>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                      Active strategist
                    </p>
                  </div>
                </div>

                {/* Chat Bubbles */}
                <div className="space-y-4 flex-1">
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-white dark:bg-zinc-900 border border-border/60 p-3 text-sm shadow-sm">
                      <p className="text-foreground">
                        Hi there! I've noticed you've spent 15% more on dining this month. Would you
                        like to see a breakdown?
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-primary p-3 text-sm text-white shadow-md">
                      <p>Yes, please show me the breakdown.</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-tl-none bg-white dark:bg-zinc-900 border border-border/60 p-3 text-sm shadow-sm">
                      <div className="space-y-2">
                        <p className="font-bold text-primary">Monthly Insight</p>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary w-[75%]" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          You've spent $420 on dining. If you reduce this by 20%, you could save
                          $84/mo.
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary">
                            Set Budget
                          </span>
                          <span className="px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary">
                            Compare Months
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat Input Mock */}
                <div className="mt-auto pt-4 border-t border-border/40">
                  <div className="h-10 w-full rounded-full bg-card border border-border/60 px-4 flex items-center justify-between text-muted-foreground">
                    <span className="text-xs">Ask me anything...</span>
                    <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-white">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative blobs */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
          </div>
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
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">FAQ</p>
        <h2 className="mt-3 font-serif text-4xl text-foreground">
          Good questions, honest answers.
        </h2>

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
        className="mx-auto max-w-screen-2xl rounded-3xl border border-border px-4 sm:px-6 py-14 sm:py-16 text-center"
        style={{ background: "var(--gradient-bg)", boxShadow: "var(--shadow-card)" }}
      >
        <h2 className="mx-auto max-w-2xl font-serif text-4xl text-foreground md:text-5xl">
          Your money deserves a Vault.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Open an account in under two minutes. No paperwork, no waiting rooms.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="h-12 bg-primary px-6 text-primary-foreground hover:bg-primary/90"
          >
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
      <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 md:flex-row">
        <Logo />
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Vault. All rights reserved.
        </p>
        <div className="flex items-center gap-5 text-xs text-muted-foreground">
          <a href="#" className="hover:text-foreground">
            Terms
          </a>
          <a href="#" className="hover:text-foreground">
            Privacy
          </a>
          <a href="#" className="hover:text-foreground">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}

function LandingPage() {
  const { profile, isLoading } = useProfile();
  const navigate = useNavigate();

  // Immediately check localStorage for an active Supabase session token.
  // This runs synchronously on render so we can block the landing page
  // from flashing before the async profile query resolves.
  const hasSession = typeof window !== "undefined" && Object.keys(localStorage).some(
    (key) => key.startsWith("sb-") && key.endsWith("-auth-token")
  );

  useEffect(() => {
    if (!isLoading && profile) {
      navigate({ to: "/dashboard" });
    }
  }, [profile, isLoading, navigate]);

  // If a session token exists (logged-in user), always show the spinner —
  // never flash the landing page. The redirect fires as soon as profile loads.
  if (hasSession || profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-xs font-mono tracking-wider uppercase">Loading your Vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <Hero />
      <Features />
      <Security />
      <AdvisorSection />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}
