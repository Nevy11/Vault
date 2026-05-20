import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { Shield, Database, Layers, Eye, EyeOff, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TopNav } from "@/components/top-nav";

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
    <Link to="/" className="flex items-center justify-center gap-2 hover:opacity-80 transition-opacity">
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
        <path d="M6 6 L20 34 L34 6 L27 6 L20 22 L13 6 Z" fill="oklch(0.82 0.16 165)" />
        <circle cx="26" cy="14" r="3" fill="oklch(0.97 0.01 160)" opacity="0.85" />
      </svg>
      <span className="text-3xl font-serif tracking-tight text-foreground">Vault</span>
    </Link>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
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
  const [step, setStep] = useState<"signIn" | "verify">("signIn");
  const [status, setStatus] = useState<"idle" | "sending">("idle");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const handleSendCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendCode();
  };

  const sendCode = () => {
    setStatus("sending");
    setTimeout(() => {
      setStatus("idle");
      setStep("verify");
    }, 1200);
  };

  const handleVerify = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (code.length === 6) {
      navigate({ to: "/dashboard" });
    }
  };

  return (
    <main className="min-h-screen w-full" style={{ background: "var(--gradient-bg)" }}>
      <TopNav />
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10">
        <div
          className="w-full rounded-2xl border border-border/60 bg-card/80 p-8 backdrop-blur-xl"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <Logo />
          <div className="mt-6 text-center">
            <h1 className="font-serif text-3xl text-foreground">
              {step === "signIn" ? "Log In to Your Vault Account" : "Verify Your Identity"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === "signIn"
                ? "Enter your email and secure PIN to receive a sign-in code."
                : "We have sent a code to the email of the person. Enter your 6 digit code below."}
            </p>
          </div>

          {step === "signIn" ? (
            <form className="mt-7 space-y-4" onSubmit={handleSendCode}>
              <Field label="Email Address" hint="the account email" required>
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 bg-input/60 border-border focus-visible:ring-primary"
                />
              </Field>

              <Field label="Secure PIN" hint="required for access" required>
                <div className="relative">
                  <Input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
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
                <a href="#" className="inline-block mt-1 text-sm text-primary hover:underline">
                  Forgot PIN?
                </a>
              </Field>

              <div className="space-y-2">
                <Button
                  type="submit"
                  onClick={sendCode}
                  disabled={status === "sending"}
                  className="mt-2 h-12 w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {status === "sending" ? "Authenticating..." : "Send code"}
                </Button>
                {status === "sending" && (
                  <p className="text-center text-sm text-muted-foreground">
                    Authenticating until the code is sent to your email.
                  </p>
                )}
              </div>
            </form>
          ) : (
            <form className="mt-7 space-y-4" onSubmit={handleVerify}>
              <div className="space-y-1.5">
                <label className="text-sm text-foreground/90 flex items-center">
                  <span className="font-medium">Enter your 6 digit code</span>
                </label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  className="h-12 tracking-[0.45em] text-center bg-input/60 border-border focus-visible:ring-primary"
                />
              </div>

              <Button
                type="submit"
                className="mt-2 h-12 w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
              >
                Verify and continue
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Didn’t receive code?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setStep("signIn");
                    setStatus("idle");
                    setCode("");
                  }}
                  className="text-primary font-medium hover:underline"
                >
                  Resend Email
                </button>
              </p>
            </form>
          )}
        </div>

        {step === "signIn" && (
          <>
            <p className="mt-6 text-sm text-muted-foreground">
              New to Vault?{" "}
              <Link to="/sign-up" className="text-primary font-medium hover:underline">
                Create Your Account
              </Link>
            </p>

            <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
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
          </>
        )}
      </div>
    </main>
  );
}
