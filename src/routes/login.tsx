import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, Database, Layers, Eye, EyeOff, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Vault — Log In" },
      { name: "description", content: "Log in to your secure Vault wallet account." },
    ],
  }),
});

function Logo() {
  return (
    <div className="flex items-center justify-center gap-2">
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
        <path d="M6 6 L20 34 L34 6 L27 6 L20 22 L13 6 Z" fill="oklch(0.82 0.16 165)" />
        <circle cx="26" cy="14" r="3" fill="oklch(0.97 0.01 160)" opacity="0.85" />
      </svg>
      <span className="text-3xl font-serif tracking-tight text-foreground">Vault</span>
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-foreground/90 flex items-center">
        {required && <span className="text-primary mr-1">*</span>}
        <span className="font-medium">{label}</span>
        {hint && <span className="text-muted-foreground ml-1.5 text-[13px]">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function LoginPage() {
  const [showPin, setShowPin] = useState(false);
  const navigate = useNavigate();

  return (
    <main className="min-h-screen w-full" style={{ background: "var(--gradient-bg)" }}>
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10">
        <div
          className="w-full rounded-2xl border border-border/60 bg-card/80 p-8 backdrop-blur-xl"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <Logo />
          <div className="mt-6 text-center">
            <h1 className="font-serif text-3xl text-foreground">Log In to Your Vault Account</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter your credentials to access your secure wallet.</p>
          </div>

          <form
            className="mt-7 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/dashboard" });
            }}
          >
            <Field label="Email Address" hint="the account email" required>
              <Input type="email" autoComplete="email" className="h-11 bg-input/60 border-border focus-visible:ring-primary" />
            </Field>

            <Field label="Secure PIN" hint="required for access" required>
              <div className="relative">
                <Input
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  className="h-11 bg-input/60 border-border focus-visible:ring-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPin((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPin ? "Hide PIN" : "Show PIN"}
                >
                  {showPin ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
              <a href="#" className="inline-block mt-1 text-sm text-primary hover:underline">Forgot PIN?</a>
            </Field>

            <Field label="Recovery Phrase" hint="backup method" required>
              <div className="flex items-center gap-2">
                <Input className="h-11 bg-input/60 border-border focus-visible:ring-primary" />
                <Info className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </Field>

            <Button
              type="submit"
              className="mt-2 h-12 w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
            >
              Continue to Dashboard
            </Button>
          </form>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          New to Vault? <Link to="/sign-up" className="text-primary font-medium hover:underline">Create Your Account</Link>
        </p>

        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" /> Bank-grade security</li>
          <li className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-primary" /> Data integrity</li>
          <li className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-primary" /> Atomic transactions</li>
        </ul>
      </div>
    </main>
  );
}