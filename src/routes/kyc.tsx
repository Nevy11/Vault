import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import {
  CheckCircle2,
  Shield,
  Camera,
  ArrowLeft,
  RefreshCw,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopNav } from "@/components/top-nav";
import { Logo } from "@/components/logo";
import { toast } from "sonner";
import { supabase } from "@/api/supabase";
import { useProfileSignal } from "@/lib/profile-signal";

// 1. TanStack Router Configuration
export const Route = createFileRoute("/kyc")({
  component: KYCPage,
  head: () => {
    return {
      meta: [
        { title: i18n.t("kyc.meta_title") },
        {
          name: "description",
          content: i18n.t("kyc.meta_description"),
        },
      ],
    };
  },
});

// 2. Helper Components
function Confetti() {
  const [confetti] = useState<
    Array<{ id: number; x: number; y: number; delay: number; duration: number }>
  >(
    [...Array(50)].map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 1,
    })),
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-2 h-2 rounded-full"
          style={{
            left: `${piece.x}%`,
            top: `-10px`,
            background: ["#fbbf24", "#10b981", "#3b82f6", "#f59e0b", "#ec4899"][piece.id % 5],
            animation: `fall ${piece.duration}s linear ${piece.delay}s forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotateZ(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// 3. Main Page Component
function KYCPage() {
  const { t } = useTranslation();
  const [profile] = useProfileSignal();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const search = useSearch({ from: "/kyc" }) as { status?: string };

  const handleStartVerification = async () => {
    if (!profile?.id) {
      toast.error("User session not found. Please log in again.");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Initializing Stripe Identity session...");
      const { data, error } = await supabase.functions.invoke("stripe-identity", {
        body: {
          user_id: profile.id,
        },
      });

      if (error) throw error;
      if (data?.url) {
        // Redirect to Stripe Identity hosted flow
        window.location.href = data.url;
      } else {
        throw new Error("No verification URL returned");
      }
    } catch (err: any) {
      console.error("KYC Error:", err);
      toast.error(err.message || "Failed to start verification. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExploreWallet = () => {
    navigate({ to: "/dashboard" });
  };

  // Determine current display state based on profile status or query param
  const isVerified = profile?.kyc_status === "verified" || search.status === "success";
  const isPending = profile?.kyc_status === "pending";

  return (
    <main className="min-h-screen w-full" style={{ background: "var(--gradient-bg)" }}>
      <TopNav />
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10">
        <div className="w-full mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </Link>
        </div>
        <div
          className="w-full rounded-2xl border border-border/60 bg-card/80 p-8 backdrop-blur-xl"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <Logo />

          {isVerified ? (
            <>
              <div className="mt-10 text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                  <CheckCircle2 className="h-20 w-20 text-primary relative mx-auto mb-4" />
                </div>
                <h1 className="font-serif text-3xl text-foreground">
                  {t("kyc.steps.success.title")}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("kyc.steps.success.description")}
                </p>
              </div>

              <Confetti />

              <div className="mt-10 space-y-3">
                <Button
                  onClick={handleExploreWallet}
                  className="h-12 w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                >
                  {t("kyc.steps.success.explore_btn")}
                </Button>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    className="h-10 text-xs"
                    onClick={() => navigate({ to: "/transactions", search: { mode: "send" } })}
                  >
                    {t("kyc.steps.success.send_money")}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 text-xs"
                    onClick={() => navigate({ to: "/transactions", search: { mode: "deposit" } })}
                  >
                    {t("kyc.steps.success.deposit_funds")}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 text-xs"
                    onClick={() => navigate({ to: "/transactions", search: { mode: "withdraw" } })}
                  >
                    {t("kyc.steps.success.withdraw_funds")}
                  </Button>
                </div>
              </div>
            </>
          ) : isPending ? (
            <>
              <div className="mt-10 text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl" />
                  <Clock className="h-20 w-20 text-amber-500 relative mx-auto mb-4 animate-pulse" />
                </div>
                <h1 className="font-serif text-3xl text-foreground">Verification Pending</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  We are currently reviewing your documents. This usually takes a few minutes. We'll
                  notify you once it's complete.
                </p>
              </div>

              <div className="mt-10">
                <Button
                  onClick={handleExploreWallet}
                  className="h-12 w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                >
                  Return to Dashboard
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="mt-6 text-center">
                <h1 className="font-serif text-3xl text-foreground">Secure Identity</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Verify your identity to unlock higher limits and premium Vault features.
                </p>
              </div>

              <div className="mt-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-primary/10 p-2 rounded-lg">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Secure Encryption</p>
                      <p className="text-sm text-muted-foreground">
                        Your documents are encrypted and handled securely via Stripe.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-primary/10 p-2 rounded-lg">
                      <Camera className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">ID & Face Scan</p>
                      <p className="text-sm text-muted-foreground">
                        Quickly scan your government ID and take a selfie for liveness detection.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-primary/10 p-2 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Cross-Platform</p>
                      <p className="text-sm text-muted-foreground">
                        Works seamlessly on your desktop browser and mobile device.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 p-4 rounded-xl border border-border/40">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    By clicking "Start Verification", you will be redirected to Stripe's secure
                    environment. Stripe will process your biometric data and ID to verify your
                    identity for Vault OS.
                  </p>
                </div>

                <Button
                  onClick={handleStartVerification}
                  disabled={isLoading}
                  className="h-14 w-full bg-primary text-primary-foreground text-lg font-bold hover:bg-primary/90 flex items-center justify-center gap-3 shadow-lg shadow-primary/20"
                >
                  {isLoading ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Shield className="h-5 w-5" />
                  )}
                  {isLoading ? "Starting..." : "Start Secure Verification"}
                </Button>

                <p className="text-xs text-center text-muted-foreground italic">
                  Powered by Stripe Identity
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
