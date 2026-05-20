import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, Camera, UserCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopNav } from "@/components/top-nav";

export const Route = createFileRoute("/kyc")({
  component: KYCPage,
  head: () => ({
    meta: [
      { title: "Vault — KYC Verification" },
      {
        name: "description",
        content: "Verify your identity to secure your Vault account.",
      },
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

function KYCPage() {
  const [step, setStep] = useState<"intro" | "processing">("intro");
  const navigate = useNavigate();

  const handleStartKYC = () => {
    setStep("processing");
    setTimeout(() => {
      navigate({ to: "/dashboard" });
    }, 2500);
  };

  return (
    <main className="min-h-screen w-full" style={{ background: "var(--gradient-bg)" }}>
      <TopNav />
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10">
        <div
          className="w-full rounded-2xl border border-border/60 bg-card/80 p-8 backdrop-blur-xl"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="text-center">
            <h1 className="font-serif text-3xl text-foreground">
              {step === "intro" ? "Verify Your Identity" : "Processing Verification"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === "intro"
                ? "To comply with banking regulations, we need to verify your ID."
                : "Our automated system (Smile Identity) is verifying your details..."}
            </p>
          </div>

          <ol className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
            <li className="flex-1">
              <div className="h-1 rounded-full bg-primary/40" />
              <p className="mt-2 text-muted-foreground/60">
                <span className="font-medium">1.</span> Account Details
              </p>
            </li>
            <span className="text-muted-foreground/60">→</span>
            <li className="flex-1">
              <div className="h-1 rounded-full bg-primary" />
              <p className="mt-2 text-foreground font-medium">
                <span className="font-medium">2.</span> KYC Verification
              </p>
              <p className="text-[11px] text-muted-foreground/80">(Smile Identity API)</p>
            </li>
            <span className="text-muted-foreground/60">→</span>
            <li className="flex-1">
              <div className="h-1 rounded-full bg-border" />
              <p className="mt-2">
                <span className="font-medium">3.</span> Success
              </p>
            </li>
          </ol>

          {step === "intro" ? (
            <div className="mt-10 space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Camera className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Government Issued ID</h3>
                    <p className="text-xs text-muted-foreground">Passport, Driver's License or National ID</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Selfie Verification</h3>
                    <p className="text-xs text-muted-foreground">A quick 3D face scan to confirm it's you</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                <div className="flex gap-3">
                  <Shield className="h-5 w-5 text-primary shrink-0" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Your data is encrypted and used only for identity verification. We never share your biometric data with third parties.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleStartKYC}
                className="h-12 w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
              >
                Start Verification <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="mt-12 flex flex-col items-center justify-center py-8">
              <div className="relative h-20 w-20">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>
              <p className="mt-6 text-sm text-center text-muted-foreground animate-pulse">
                Analyzing documents and performing liveness check...
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
