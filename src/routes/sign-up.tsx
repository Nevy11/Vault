import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, Database, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/sign-up")({
  component: SignUp,
  head: () => ({
    meta: [
      { title: "Vault — Create Your Account" },
      { name: "description", content: "Your secure, real-time wallet starts here. Create your Vault account in minutes." },
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
      <label className="text-sm text-foreground/90">
        {required && <span className="text-primary mr-1">*</span>}
        <span className="font-medium">{label}</span>
        {hint && <span className="text-muted-foreground ml-1.5 text-[13px]">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function SignUp() {
  const [agreed, setAgreed] = useState(false);

  return (
    <main className="min-h-screen w-full" style={{ background: "var(--gradient-bg)" }}>
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10">
        <div
          className="w-full rounded-2xl border border-border/60 bg-card/80 p-8 backdrop-blur-xl"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <Logo />
          <div className="mt-6 text-center">
            <h1 className="font-serif text-3xl text-foreground">Create Your Vault Account</h1>
            <p className="mt-1 text-sm text-muted-foreground">Your secure, real-time wallet starts here.</p>
          </div>

          <form className="mt-7 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <Field label="Full Legal Name" hint="as per your ID" required>
              <Input className="h-11 bg-input/60 border-border focus-visible:ring-primary" autoComplete="name" />
            </Field>
            <Field label="Email Address" hint="will be verified" required>
              <Input type="email" className="h-11 bg-input/60 border-border focus-visible:ring-primary" autoComplete="email" />
            </Field>
            <Field label="Phone Number" hint="for account notifications" required>
              <Input type="tel" className="h-11 bg-input/60 border-border focus-visible:ring-primary" autoComplete="tel" />
            </Field>
            <Field label="Secure PIN" hint="required for transactions" required>
              <div className="grid grid-cols-2 gap-3">
                <Input type="password" inputMode="numeric" maxLength={6} placeholder="PIN" className="h-11 bg-input/60 border-border focus-visible:ring-primary" />
                <Input type="password" inputMode="numeric" maxLength={6} placeholder="Confirm PIN" className="h-11 bg-input/60 border-border focus-visible:ring-primary" />
              </div>
            </Field>

            <ol className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <li className="flex-1">
                <div className="h-1 rounded-full bg-primary" />
                <p className="mt-2 text-foreground"><span className="font-medium">1.</span> Account Details</p>
              </li>
              <span className="text-muted-foreground/60">→</span>
              <li className="flex-1">
                <div className="h-1 rounded-full bg-border" />
                <p className="mt-2"><span className="font-medium">2.</span> KYC Verification</p>
                <p className="text-[11px] text-muted-foreground/80">(Smile Identity API)</p>
              </li>
              <span className="text-muted-foreground/60">→</span>
              <li className="flex-1">
                <div className="h-1 rounded-full bg-border" />
                <p className="mt-2"><span className="font-medium">3.</span> Success</p>
              </li>
            </ol>

            <label className="flex items-start gap-2.5 pt-2 text-sm text-foreground/90">
              <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(Boolean(v))} className="mt-0.5 border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
              <span>
                I agree to the <a href="#" className="text-primary underline-offset-2 hover:underline">Terms of Service</a> and <a href="#" className="text-primary underline-offset-2 hover:underline">Privacy Policy</a>.
              </span>
            </label>

            <Button
              type="submit"
              disabled={!agreed}
              className="h-12 w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              Create Your Account
            </Button>
          </form>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign In</Link>
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
