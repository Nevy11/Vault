import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Upload,
  CheckCircle2,
  User,
  Shield,
  Camera,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TopNav } from "@/components/top-nav";
import { Logo } from "@/components/logo";
import { toast } from "sonner";

// 1. Types
type IDType = "national-id" | "passport" | "alien-card" | null;
type KYCStep = "id-type" | "document-details" | "upload" | "biometric" | "success";

// 2. TanStack Router Configuration
export const Route = createFileRoute("/kyc")({
  component: KYCPage,
  head: () => {
    const { t } = useTranslation();
    return {
      meta: [
        { title: t("kyc.meta_title") },
        {
          name: "description",
          content: t("kyc.meta_description"),
        },
      ],
    };
  },
});

// 3. Helper Components
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
      <label className="text-sm text-foreground/90">
        {required && <span className="text-primary mr-1">*</span>}
        <span className="font-medium">{label}</span>
        {hint && <span className="text-muted-foreground ml-1.5 text-[13px]">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

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

// 4. Main Page Component
function KYCPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState<KYCStep>("id-type");
  const [idType, setIdType] = useState<IDType>(null);
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [individNumber, setIndivNumber] = useState("");
  const [country, setCountry] = useState("");
  const [nationality, setNationality] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const navigate = useNavigate();

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    setIsLoadingCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      toast.error("Could not access camera. Please check permissions.");
    } finally {
      setIsLoadingCamera(false);
    }
  };

  useEffect(() => {
    if (step !== "biometric") {
      stopCamera();
    }
  }, [step]);

  const handleSelectIDType = (type: IDType) => {
    setIdType(type);
    setStep("document-details");
  };

  const handleDocumentDetailsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fullName.trim()) return;
    if (idType === "national-id" && !idNumber.trim()) return;
    if (idType === "passport" && !passportNumber.trim()) return;
    if (idType === "alien-card" && !individNumber.trim()) return;
    if (!country.trim() && !nationality.trim()) return;

    setStep("upload");
  };

  const handleDocumentUpload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!documentFile) return;
    setStep("biometric");
  };

  const handleBiometricCapture = () => {
    setIsLoadingCamera(true);
    setTimeout(() => {
      stopCamera();
      setStep("success");
      setIsLoadingCamera(false);
      toast.success("Biometric verification complete");
    }, 2000);
  };

  const handleExploreWallet = () => {
    navigate({ to: "/dashboard" });
  };

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

          {step === "id-type" && (
            <>
              <div className="mt-6 text-center">
                <h1 className="font-serif text-3xl text-foreground">
                  {t("kyc.steps.select_id.title")}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("kyc.steps.select_id.description")}
                </p>
              </div>

              <div className="mt-7 space-y-3">
                <button
                  onClick={() => handleSelectIDType("national-id")}
                  className="w-full p-4 rounded-lg border-2 border-border/50 hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <p className="font-medium text-foreground">
                    {t("kyc.steps.select_id.national_id")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("kyc.steps.select_id.national_id_desc")}
                  </p>
                </button>

                <button
                  onClick={() => handleSelectIDType("passport")}
                  className="w-full p-4 rounded-lg border-2 border-border/50 hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <p className="font-medium text-foreground">{t("kyc.steps.select_id.passport")}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("kyc.steps.select_id.passport_desc")}
                  </p>
                </button>

                <button
                  onClick={() => handleSelectIDType("alien-card")}
                  className="w-full p-4 rounded-lg border-2 border-border/50 hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <p className="font-medium text-foreground">
                    {t("kyc.steps.select_id.alien_card")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("kyc.steps.select_id.alien_card_desc")}
                  </p>
                </button>
              </div>
            </>
          )}

          {step === "document-details" && idType && (
            <>
              <div className="mt-6 text-center">
                <h1 className="font-serif text-3xl text-foreground">
                  {t("kyc.steps.details.title")}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("kyc.steps.details.description")}
                </p>
              </div>

              <form className="mt-7 space-y-4" onSubmit={handleDocumentDetailsSubmit}>
                <Field
                  label={t("kyc.steps.details.full_name")}
                  hint={t("kyc.steps.details.full_name_hint")}
                  required
                >
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-11 bg-input/60 border-border focus-visible:ring-primary"
                  />
                </Field>

                {idType === "national-id" && (
                  <>
                    <Field label={t("kyc.steps.details.id_number")} required>
                      <Input
                        type="text"
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        className="h-11 bg-input/60 border-border focus-visible:ring-primary"
                      />
                    </Field>
                    <Field label={t("kyc.steps.details.country")} required>
                      <Input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="h-11 bg-input/60 border-border focus-visible:ring-primary"
                      />
                    </Field>
                  </>
                )}

                {idType === "passport" && (
                  <>
                    <Field label={t("kyc.steps.details.passport_number")} required>
                      <Input
                        type="text"
                        value={passportNumber}
                        onChange={(e) => setPassportNumber(e.target.value)}
                        className="h-11 bg-input/60 border-border focus-visible:ring-primary"
                      />
                    </Field>
                    <Field label={t("kyc.steps.details.nationality")} required>
                      <Input
                        type="text"
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value)}
                        className="h-11 bg-input/60 border-border focus-visible:ring-primary"
                      />
                    </Field>
                  </>
                )}

                {idType === "alien-card" && (
                  <>
                    <Field label={t("kyc.steps.details.individual_number")} required>
                      <Input
                        type="text"
                        value={individNumber}
                        onChange={(e) => setIndivNumber(e.target.value)}
                        className="h-11 bg-input/60 border-border focus-visible:ring-primary"
                      />
                    </Field>
                    <Field label={t("kyc.steps.details.nationality")} required>
                      <Input
                        type="text"
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value)}
                        className="h-11 bg-input/60 border-border focus-visible:ring-primary"
                      />
                    </Field>
                  </>
                )}

                <Button
                  type="submit"
                  className="mt-6 h-12 w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                >
                  {t("kyc.steps.details.continue_btn")}
                </Button>
              </form>
            </>
          )}

          {step === "upload" && (
            <>
              <div className="mt-6 text-center">
                <h1 className="font-serif text-3xl text-foreground">
                  {t("kyc.steps.upload.title")}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {idType === "national-id"
                    ? t("kyc.steps.upload.id_msg")
                    : idType === "passport"
                      ? t("kyc.steps.upload.passport_msg")
                      : t("kyc.steps.upload.alien_msg")}
                </p>
              </div>

              <form className="mt-7 space-y-4" onSubmit={handleDocumentUpload}>
                <div className="flex items-center justify-center">
                  <label className="w-full">
                    <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground">
                        {documentFile ? documentFile.name : t("kyc.steps.upload.click_to_upload")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("kyc.steps.upload.format_note")}
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={!documentFile}
                  className="mt-6 h-12 w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
                >
                  {t("kyc.steps.upload.next_btn")}
                </Button>
              </form>
            </>
          )}

          {step === "biometric" && (
            <>
              <div className="mt-6 text-center">
                <h1 className="font-serif text-3xl text-foreground">
                  {t("kyc.steps.biometric.title")}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("kyc.steps.biometric.description")}
                </p>
              </div>

              <div className="mt-7 space-y-4">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black/20 border border-border/50 flex items-center justify-center">
                  {isCameraActive ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="h-16 w-16 text-muted-foreground/50" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-64 border-4 border-primary rounded-full opacity-30" />
                  </div>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  {t("kyc.steps.biometric.instruction")}
                </p>

                <Button
                  onClick={isCameraActive ? handleBiometricCapture : startCamera}
                  disabled={isLoadingCamera}
                  className="h-12 w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 flex items-center justify-center gap-2"
                >
                  {isLoadingCamera ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  {isLoadingCamera
                    ? t("kyc.steps.biometric.processing")
                    : isCameraActive
                      ? t("kyc.steps.biometric.capture_btn")
                      : t("kyc.steps.biometric.start_camera_btn")}
                </Button>

                <p className="text-xs text-center text-muted-foreground/70 italic">
                  {t("kyc.steps.biometric.security_note")}
                </p>
              </div>
            </>
          )}

          {step === "success" && (
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
          )}
        </div>
      </div>
    </main>
  );
}
