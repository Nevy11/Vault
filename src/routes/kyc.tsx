import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { CheckCircle2, Shield, Camera, ArrowLeft, RefreshCw, Clock, IdCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TopNav } from "@/components/top-nav";
import { Logo } from "@/components/logo";
import { toast } from "sonner";
import { supabase } from "@/api/supabase";
import { useProfile } from "@/hooks/use-profile";
import { loadStripe } from "@stripe/stripe-js";
import { Onfido } from "onfido-sdk-ui";

// Initialize Stripe
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    "pk_test_51Ro0ysE4K5QIsyl6tFrDH7oCDENuxy0P1iq7wWIvwiI5jyUtrf2Tsb0bizDjX0NIaTjiV1gzmGNVPj7GbqeyF4yX005RF2puYW",
);

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
  const { profile, updateProfile, refetch } = useProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [showOnfido, setShowOnfido] = useState(false);
  const [kycStep, setKycStep] = useState<"intro" | "select_id" | "details" | "upload" | "biometric">("intro");
  
  // Form State
  const [idType, setIdType] = useState<"national_id" | "passport" | "alien_card">("national_id");
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [idNationality, setIdNationality] = useState("");
  const [idCountry, setIdCountry] = useState("");
  const [idIndividualNumber, setIdIndividualNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [homeAddress, setHomeAddress] = useState("");

  const navigate = useNavigate();
  const search = useSearch({ from: "/kyc" }) as { status?: string };

  useEffect(() => {
    if (profile) {
      setFullName((profile.first_name || "") + " " + (profile.last_name || ""));
      setIdNationality(profile.nationality || "Kenyan");
      setIdCountry(profile.country || "Kenya");
      setDateOfBirth(profile.date_of_birth || "");
      setGender(profile.gender || "");
      setHomeAddress(profile.home_address || "");
    }
  }, [profile]);

  const handleStartStripeVerification = async () => {
    if (!profile?.id) {
      toast.error("User session not found. Please log in again.");
      return;
    }

    setIsLoading(true);

    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe failed to load");

      const { data, error } = await supabase.functions.invoke("stripe-identity", {
        body: { user_id: profile.id },
      });

      if (error) throw error;

      if (data?.client_secret) {
        const { error: verifyError } = await stripe.verifyIdentity(data.client_secret);
        if (verifyError) {
          toast.error(verifyError.message || "Identity verification failed to start.");
        } else {
          toast.success("Verification session completed.");
          if (profile && profile.kyc_status !== "verified") {
            updateProfile({ kyc_status: "pending" });
          }
        }
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Stripe KYC Error:", err);
      toast.error(err.message || "Failed to start verification.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartOnfidoVerification = async () => {
    if (!profile?.id) {
      toast.error("User session not found. Please log in again.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("onfido-token", {
        body: { user_id: profile.id },
      });

      if (error) throw error;

      if (data?.sdk_token) {
        setShowOnfido(true);
        Onfido.init({
          token: data.sdk_token,
          containerId: "onfido-mount",
          onComplete: (data) => {
            console.log("Onfido verification complete:", data);
            toast.success("Documents submitted successfully.");
            setShowOnfido(false);
            if (profile) updateProfile({ kyc_status: "pending" });
          },
          onError: (err) => {
            console.error("Onfido error:", err);
            toast.error("Onfido verification error occurred.");
            setShowOnfido(false);
          },
        });
      }
    } catch (err: any) {
      console.error("Onfido KYC Error:", err);
      toast.error(err.message || "Failed to start Onfido verification.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualVerificationSubmit = async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    try {
      const [fName, ...lNames] = fullName.split(" ");
      const lName = lNames.join(" ");

      const { error } = await supabase
        .from("profiles")
        .update({ 
          first_name: fName || profile.first_name,
          last_name: lName || profile.last_name,
          id_number: idNumber,
          nationality: idNationality,
          country: idCountry,
          date_of_birth: dateOfBirth || null,
          gender: gender || null,
          home_address: homeAddress,
          kyc_status: "pending",
          updated_at: new Date().toISOString() 
        })
        .eq("id", profile.id);

      if (error) throw error;
      
      toast.success("Identity details submitted for review.");
      refetch();
      setKycStep("intro");
    } catch (err: any) {
      console.error("Manual verification error:", err);
      toast.error("Submission failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMockVerification = async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ kyc_status: "verified", updated_at: new Date().toISOString() })
        .eq("id", profile.id);

      if (error) throw error;
      if (profile) updateProfile({ kyc_status: "verified" });
      toast.success("Identity verified (Development Mode)");
    } catch (err: any) {
      console.error("Mock verification error:", err);
      toast.error("Mock verification failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExploreWallet = () => {
    navigate({ to: "/dashboard" });
  };

  const isVerified = profile?.kyc_status === "verified" || search.status === "success";
  const isPending = profile?.kyc_status === "pending";

  return (
    <main className="min-h-screen w-full" style={{ background: "var(--gradient-bg)" }}>
      <TopNav />

      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10">
        <div className="w-full mb-6 text-center">
          <button
            onClick={() => {
              if (kycStep === "intro") navigate({ to: "/dashboard" });
              else if (kycStep === "select_id") setKycStep("intro");
              else if (kycStep === "details") setKycStep("select_id");
              else if (kycStep === "upload") setKycStep("details");
              else if (kycStep === "biometric") setKycStep("upload");
            }}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </button>
        </div>
        <div
          className="w-full rounded-2xl border border-border/60 bg-card/80 p-8 backdrop-blur-xl"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <Logo />

          {showOnfido ? (
            <div className="mt-6">
              <div id="onfido-mount" className="rounded-xl overflow-hidden" />
              <Button variant="ghost" onClick={() => setShowOnfido(false)} className="mt-4 w-full">
                Cancel
              </Button>
            </div>
          ) : isVerified ? (
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
                  We are currently reviewing your documents. This usually takes a few minutes.
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
          ) : kycStep === "select_id" ? (
            <div className="mt-6">
              <div className="text-center mb-8">
                <h1 className="font-serif text-2xl text-foreground">{t("kyc.steps.select_id.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("kyc.steps.select_id.description")}</p>
              </div>
              <div className="space-y-4">
                <button
                  onClick={() => { setIdType("national_id"); setKycStep("details"); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card/40 hover:bg-primary/5 hover:border-primary/50 transition-all text-left"
                >
                  <div className="bg-primary/10 p-3 rounded-lg"><IdCard className="h-6 w-6 text-primary" /></div>
                  <div>
                    <p className="font-bold text-foreground">{t("kyc.steps.select_id.national_id")}</p>
                    <p className="text-xs text-muted-foreground">{t("kyc.steps.select_id.national_id_desc")}</p>
                  </div>
                </button>
                <button
                  onClick={() => { setIdType("passport"); setKycStep("details"); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card/40 hover:bg-primary/5 hover:border-primary/50 transition-all text-left"
                >
                  <div className="bg-primary/10 p-3 rounded-lg"><IdCard className="h-6 w-6 text-primary" /></div>
                  <div>
                    <p className="font-bold text-foreground">{t("kyc.steps.select_id.passport")}</p>
                    <p className="text-xs text-muted-foreground">{t("kyc.steps.select_id.passport_desc")}</p>
                  </div>
                </button>
                <button
                  onClick={() => { setIdType("alien_card"); setKycStep("details"); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card/40 hover:bg-primary/5 hover:border-primary/50 transition-all text-left"
                >
                  <div className="bg-primary/10 p-3 rounded-lg"><IdCard className="h-6 w-6 text-primary" /></div>
                  <div>
                    <p className="font-bold text-foreground">{t("kyc.steps.select_id.alien_card")}</p>
                    <p className="text-xs text-muted-foreground">{t("kyc.steps.select_id.alien_card_desc")}</p>
                  </div>
                </button>
              </div>
            </div>
          ) : kycStep === "details" ? (
            <div className="mt-6">
              <div className="text-center mb-8">
                <h1 className="font-serif text-2xl text-foreground">{t("kyc.steps.details.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("kyc.steps.details.description")}</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("kyc.steps.details.full_name")}</label>
                  <Input 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t("kyc.steps.details.full_name_hint")}
                    className="h-11 bg-input/60"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date of Birth</label>
                    <Input 
                      type="date"
                      value={dateOfBirth} 
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="h-11 bg-input/60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gender</label>
                    <select
                      className="w-full h-11 bg-input/60 border border-border rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {idType === "passport" ? t("kyc.steps.details.passport_number") : t("kyc.steps.details.id_number")}
                  </label>
                  <Input 
                    value={idNumber} 
                    onChange={(e) => setIdNumber(e.target.value)}
                    className="h-11 bg-input/60"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("kyc.steps.details.nationality")}</label>
                    <Input 
                      value={idNationality} 
                      onChange={(e) => setIdNationality(e.target.value)}
                      className="h-11 bg-input/60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("kyc.steps.details.country")}</label>
                    <Input 
                      value={idCountry} 
                      onChange={(e) => setIdCountry(e.target.value)}
                      className="h-11 bg-input/60"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Physical Home Address</label>
                  <Input 
                    value={homeAddress} 
                    onChange={(e) => setHomeAddress(e.target.value)}
                    placeholder="Street, City, Country"
                    className="h-11 bg-input/60"
                  />
                </div>
                {idType === "alien_card" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("kyc.steps.details.individual_number")}</label>
                    <Input 
                      value={idIndividualNumber} 
                      onChange={(e) => setIdIndividualNumber(e.target.value)}
                      className="h-11 bg-input/60"
                    />
                  </div>
                )}
                <Button 
                  onClick={() => setKycStep("upload")}
                  className="w-full h-12 bg-primary font-bold mt-4"
                >
                  {t("kyc.steps.details.continue_btn")}
                </Button>
              </div>
            </div>
          ) : kycStep === "upload" ? (
            <div className="mt-6">
              <div className="text-center mb-8">
                <h1 className="font-serif text-2xl text-foreground">{t("kyc.steps.upload.title")}</h1>
                <p className="text-sm text-muted-foreground">
                  {idType === "national_id" ? t("kyc.steps.upload.id_msg") : 
                   idType === "passport" ? t("kyc.steps.upload.passport_msg") : 
                   t("kyc.steps.upload.alien_msg")}
                </p>
              </div>
              <div className="space-y-6">
                <div className="aspect-video w-full rounded-2xl border-2 border-dashed border-border/60 bg-card/40 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-primary/5 transition-all">
                  <div className="bg-primary/10 p-4 rounded-full"><Camera className="h-8 w-8 text-primary" /></div>
                  <div className="text-center">
                    <p className="font-bold text-sm">{t("kyc.steps.upload.click_to_upload")}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">{t("kyc.steps.upload.format_note")}</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setKycStep("biometric")}
                  className="w-full h-12 bg-primary font-bold"
                >
                  {t("kyc.steps.upload.next_btn")}
                </Button>
              </div>
            </div>
          ) : kycStep === "biometric" ? (
            <div className="mt-6">
              <div className="text-center mb-8">
                <h1 className="font-serif text-2xl text-foreground">{t("kyc.steps.biometric.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("kyc.steps.biometric.description")}</p>
              </div>
              <div className="space-y-6">
                <div className="aspect-square w-full rounded-full border-4 border-primary/40 bg-card/40 flex flex-col items-center justify-center overflow-hidden relative">
                  <div className="absolute inset-0 border-[16px] border-card/80 rounded-full z-10" />
                  <Camera className="h-12 w-12 text-primary opacity-20" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest absolute bottom-12 z-20 w-48 text-center px-4">
                    {t("kyc.steps.biometric.instruction")}
                  </p>
                </div>
                <div className="space-y-3">
                  <Button 
                    onClick={handleManualVerificationSubmit}
                    disabled={isLoading}
                    className="w-full h-12 bg-primary font-bold shadow-lg shadow-primary/20"
                  >
                    {isLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : t("kyc.steps.biometric.capture_btn")}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center px-4 leading-relaxed">
                    {t("kyc.steps.biometric.security_note")}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6 text-center">
                <h1 className="font-serif text-3xl text-foreground">Secure Identity</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Verify your identity to unlock higher limits and premium features.
                </p>
              </div>

              <div className="mt-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-primary/10 p-2 rounded-lg">
                      <IdCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Government ID</p>
                      <p className="text-sm text-muted-foreground">
                        Securely upload your Passport, Driver's License or ID card.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-primary/10 p-2 rounded-lg">
                      <Camera className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Face Scan</p>
                      <p className="text-sm text-muted-foreground">
                        Biometric liveness detection to ensure you are really you.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-primary/10 p-2 rounded-lg">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Privacy Guaranteed</p>
                      <p className="text-sm text-muted-foreground">
                        Your data is encrypted and used only for compliance.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => setKycStep("select_id")}
                    className="h-14 w-full bg-primary text-primary-foreground text-lg font-bold hover:bg-primary/90 flex items-center justify-center gap-3 shadow-lg shadow-primary/20"
                  >
                    <Shield className="h-5 w-5" />
                    Start Secure Verification
                  </Button>

                  <div className="flex items-center gap-2 py-4">
                    <div className="h-px flex-1 bg-border/60" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Or use automated SDKs</span>
                    <div className="h-px flex-1 bg-border/60" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={handleStartOnfidoVerification}
                      variant="outline"
                      disabled={isLoading}
                      className="h-11 border-border/60 text-xs font-bold hover:bg-primary/5"
                    >
                      Onfido
                    </Button>
                    <Button
                      onClick={handleStartStripeVerification}
                      variant="outline"
                      disabled={isLoading}
                      className="h-11 border-border/60 text-xs font-bold hover:bg-primary/5"
                    >
                      Stripe
                    </Button>
                  </div>
                </div>

                {(import.meta.env.DEV || true) && (
                  <Button
                    onClick={handleMockVerification}
                    variant="ghost"
                    disabled={isLoading}
                    className="w-full text-muted-foreground hover:text-primary hover:bg-primary/5 text-sm"
                  >
                    Skip for Development
                  </Button>
                )}

                <p className="text-xs text-center text-muted-foreground italic">
                  Verification powered by Vault Secure Core
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
