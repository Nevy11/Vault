import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import { Shield, Database, Layers, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TopNav } from "@/components/top-nav";
import { supabase } from "@/api/supabase";
import { toast } from "sonner";
import { hashPin } from "@/lib/utils";
import { getDeviceName } from "@/lib/device-detection";
import { Logo } from "@/components/logo";
import { profileSignal } from "@/lib/profile-signal";

import { z } from "zod";

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
  amount: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: (search) => loginSearchSchema.parse(search),
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Vault — Log In" },
      { name: "description", content: "Log in to your secure Vault wallet account." },
    ],
  }),
});

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
  const { redirect } = Route.useSearch();
  const [showPin, setShowPin] = useState(false);
  const [step, setStep] = useState<"signIn" | "verify">("signIn");
  const [status, setStatus] = useState<"idle" | "sending" | "verifying">("idle");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: number;
    if (resendCooldown > 0) {
      timer = window.setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const handleSendCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (resendCooldown > 0) {
      toast.error(`Please wait ${resendCooldown}s before requesting a new code.`);
      return;
    }

    if (!email || !pin) {
      toast.error("Please enter both email and PIN");
      return;
    }

    if (pin.length !== 6) {
      toast.error("PIN must be 6 digits");
      return;
    }

    setStatus("sending");
    try {
      const normalizedEmail = email.trim().toLowerCase();
      // 1. Check if user exists in our profiles table first
      const { data: profile, error: profileCheckError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (profileCheckError) throw profileCheckError;

      if (!profile) {
        throw new Error("No account found with this email. Please sign up.");
      }

      // 2. If profile exists, send OTP (explicitly avoiding redirect URL to force token flow)
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        if (error.status === 429) {
          setResendCooldown(60);
          throw new Error("Email rate limit exceeded. Please wait 60 seconds.");
        }
        if (error.message.includes("User not found")) {
          throw new Error("No account found with this email. Please sign up.");
        }
        throw error;
      }

      toast.success("Verification code sent to your email");
      setStep("verify");
      setResendCooldown(60);
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Failed to send code");
    } finally {
      setStatus("idle");
    }
  };

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (code.length === 6) {
      setStatus("verifying");
      try {
        const normalizedEmail = email.trim().toLowerCase();
        // 1. Verify OTP using 'email' type for 6-digit token verification
        const {
          data: { user },
          error: verifyError,
        } = await supabase.auth.verifyOtp({
          email: normalizedEmail,
          token: code,
          type: "email",
        });

        if (verifyError) throw verifyError;

        await processAuthenticatedUser(user);
      } catch (error: any) {
        console.error("Verification error:", error);
        toast.error(error.message || "Verification failed");
        setStatus("idle");
      }
    }
  };

  const processAuthenticatedUser = async (user: any) => {
    if (!user) throw new Error("No user found after verification");

    try {
      // 2. Fetch profile to check PIN and prepopulate global state
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error("Could not retrieve account profile");
      }

      // 3. Hash entered PIN and compare
      const hashedPin = await hashPin(pin);
      if (profile.pin_hash === hashedPin) {
        // Pre-populate profile signal so dashboard is ready instantly
        profileSignal.set(profile);

        // 4. Record device login
        const deviceName = getDeviceName();
        try {
          await supabase.from("user_devices").upsert(
            {
              user_id: user.id,
              device_name: deviceName,
              last_login: new Date().toISOString(),
              is_active: true,
            },
            { onConflict: "user_id, device_name" },
          );

          // 5. Record activity log
          await supabase.from("activity_logs").insert({
            user_id: user.id,
            action_type: "login",
            device_info: deviceName,
            location: "Kenya", // This would ideally come from a GeoIP service
            nationality: "Kenyan",
          });
        } catch (deviceError) {
          console.error("Failed to record device/activity:", deviceError);
        }

        toast.success("Login successful!");

        if (redirect) {
          // Use window.location.href for absolute redirects or navigate for relative ones
          if (redirect.startsWith("http")) {
            window.location.href = redirect;
          } else {
            navigate({ to: redirect as any });
          }
        } else {
          navigate({ to: "/dashboard" });
        }
      } else {
        // If PIN mismatch, sign out the user
        await supabase.auth.signOut();
        toast.error("Incorrect PIN. Please try again.");
        setStep("signIn");
        setStatus("idle");
      }
    } catch (error: any) {
      console.error("Profile check error:", error);
      toast.error(error.message || "Failed to verify PIN");
      setStatus("idle");
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
                : `We have sent a code to ${email}. Enter your 6 digit code below.`}
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
                  required
                />
              </Field>

              <Field label="Secure PIN" hint="required for access" required>
                <div className="relative">
                  <Input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
                    className="h-11 bg-input/60 border-border focus-visible:ring-primary pr-10"
                    required
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
                  disabled={status === "sending"}
                  className="mt-2 h-12 w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {status === "sending" ? "Sending code..." : "Send code"}
                </Button>
                {status === "sending" && (
                  <p className="text-center text-sm text-muted-foreground animate-pulse">
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
                  className="h-12 tracking-[0.45em] text-center bg-input/60 border-border focus-visible:ring-primary font-bold text-lg"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={status === "verifying" || code.length !== 6}
                className="mt-2 h-12 w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {status === "verifying" ? "Verifying..." : "Verify and continue"}
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
