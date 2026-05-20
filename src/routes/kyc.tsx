import { createFileRoute, useNavigate } from "@tanstack/react-router";
<<<<<<< HEAD
import { useState, type FormEvent, type ReactNode, useEffect } from "react";
import { Upload, Camera, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
=======
import { useState } from "react";
import { Shield, Camera, UserCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
>>>>>>> 2007f6fcbbc487446252886a2cea072688b8b13a
import { TopNav } from "@/components/top-nav";

export const Route = createFileRoute("/kyc")({
  component: KYCPage,
  head: () => ({
    meta: [
<<<<<<< HEAD
      { title: "Vault — Identity Verification" },
      { name: "description", content: "Complete your identity verification to activate your wallet." },
=======
      { title: "Vault — KYC Verification" },
      {
        name: "description",
        content: "Verify your identity to secure your Vault account.",
      },
>>>>>>> 2007f6fcbbc487446252886a2cea072688b8b13a
    ],
  }),
});

<<<<<<< HEAD
type IDType = "national-id" | "passport" | "alien-card" | null;
type KYCStep = "id-type" | "document-details" | "upload" | "biometric" | "success";

=======
>>>>>>> 2007f6fcbbc487446252886a2cea072688b8b13a
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

<<<<<<< HEAD
function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
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
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; y: number; delay: number; duration: number }>>(
    [...Array(50)].map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 1,
    }))
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

function KYCPage() {
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
    setTimeout(() => {
      setStep("success");
    }, 500);
  };

  const handleExploreWallet = () => {
    navigate({ to: "/dashboard" });
=======
function KYCPage() {
  const [step, setStep] = useState<"intro" | "processing">("intro");
  const navigate = useNavigate();

  const handleStartKYC = () => {
    setStep("processing");
    setTimeout(() => {
      navigate({ to: "/dashboard" });
    }, 2500);
>>>>>>> 2007f6fcbbc487446252886a2cea072688b8b13a
  };

  return (
    <main className="min-h-screen w-full" style={{ background: "var(--gradient-bg)" }}>
      <TopNav />
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10">
        <div
          className="w-full rounded-2xl border border-border/60 bg-card/80 p-8 backdrop-blur-xl"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
<<<<<<< HEAD
          <Logo />

          {step === "id-type" && (
            <>
              <div className="mt-6 text-center">
                <h1 className="font-serif text-3xl text-foreground">Select ID Type</h1>
                <p className="mt-1 text-sm text-muted-foreground">Choose your document type for verification</p>
              </div>

              <div className="mt-7 space-y-3">
                <button
                  onClick={() => handleSelectIDType("national-id")}
                  className="w-full p-4 rounded-lg border-2 border-border/50 hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <p className="font-medium text-foreground">National ID</p>
                  <p className="text-xs text-muted-foreground mt-1">Driver's License, Identity Card</p>
                </button>

                <button
                  onClick={() => handleSelectIDType("passport")}
                  className="w-full p-4 rounded-lg border-2 border-border/50 hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <p className="font-medium text-foreground">Passport</p>
                  <p className="text-xs text-muted-foreground mt-1">International Travel Document</p>
                </button>

                <button
                  onClick={() => handleSelectIDType("alien-card")}
                  className="w-full p-4 rounded-lg border-2 border-border/50 hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <p className="font-medium text-foreground">Alien Card</p>
                  <p className="text-xs text-muted-foreground mt-1">Foreign Resident Card</p>
                </button>
              </div>
            </>
          )}

          {step === "document-details" && idType && (
            <>
              <div className="mt-6 text-center">
                <h1 className="font-serif text-3xl text-foreground">Document Details</h1>
                <p className="mt-1 text-sm text-muted-foreground">Enter your information</p>
              </div>

              <form className="mt-7 space-y-4" onSubmit={handleDocumentDetailsSubmit}>
                <Field label="Full Legal Name" hint="as on your document" required>
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-11 bg-input/60 border-border focus-visible:ring-primary"
                  />
                </Field>

                {idType === "national-id" && (
                  <>
                    <Field label="ID Number" required>
                      <Input
                        type="text"
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        className="h-11 bg-input/60 border-border focus-visible:ring-primary"
                      />
                    </Field>
                    <Field label="Country" required>
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
                    <Field label="Passport Number" required>
                      <Input
                        type="text"
                        value={passportNumber}
                        onChange={(e) => setPassportNumber(e.target.value)}
                        className="h-11 bg-input/60 border-border focus-visible:ring-primary"
                      />
                    </Field>
                    <Field label="Nationality" required>
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
                    <Field label="Individual Number" required>
                      <Input
                        type="text"
                        value={individNumber}
                        onChange={(e) => setIndivNumber(e.target.value)}
                        className="h-11 bg-input/60 border-border focus-visible:ring-primary"
                      />
                    </Field>
                    <Field label="Nationality" required>
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
                  Continue
                </Button>
              </form>
            </>
          )}

          {step === "upload" && (
            <>
              <div className="mt-6 text-center">
                <h1 className="font-serif text-3xl text-foreground">Upload Document</h1>
                <p className="mt-1 text-sm text-muted-foreground">Upload your {idType === "national-id" ? "ID" : idType === "passport" ? "passport" : "alien card"}</p>
              </div>

              <form className="mt-7 space-y-4" onSubmit={handleDocumentUpload}>
                <div className="flex items-center justify-center">
                  <label className="w-full">
                    <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground">
                        {documentFile ? documentFile.name : "Click to upload document"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
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
                  Next: Biometric Verification
                </Button>
              </form>
            </>
          )}

          {step === "biometric" && (
            <>
              <div className="mt-6 text-center">
                <h1 className="font-serif text-3xl text-foreground">Biometric Verification</h1>
                <p className="mt-1 text-sm text-muted-foreground">Take a selfie to verify your identity</p>
              </div>

              <div className="mt-7 space-y-4">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black/20 border border-border/50 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-64 border-4 border-primary rounded-full opacity-30" />
                  </div>
                  <Camera className="h-16 w-16 text-muted-foreground/50" />
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Position your face within the oval frame and keep still for a few seconds
                </p>

                <Button
                  onClick={handleBiometricCapture}
                  className="h-12 w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 flex items-center justify-center gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Take Selfie
                </Button>

                <p className="text-xs text-center text-muted-foreground/70 italic">
                  Your data is encrypted and processed securely for identity verification only.
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
                <h1 className="font-serif text-3xl text-foreground">Verification Successful!</h1>
                <p className="mt-2 text-sm text-muted-foreground">Your digital wallet is active and secured with your PIN</p>
              </div>

              <Confetti />

              <div className="mt-10 space-y-3">
                <Button
                  onClick={handleExploreWallet}
                  className="h-12 w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                >
                  Explore Wallet
                </Button>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    className="h-10 text-xs"
                    onClick={() => navigate({ to: "/dashboard" })}
                  >
                    Send Money
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 text-xs"
                    onClick={() => navigate({ to: "/dashboard" })}
                  >
                    Deposit Funds
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 text-xs"
                    onClick={() => navigate({ to: "/dashboard" })}
                  >
                    Withdraw Funds
                  </Button>
                </div>
              </div>
            </>
=======
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
>>>>>>> 2007f6fcbbc487446252886a2cea072688b8b13a
          )}
        </div>
      </div>
    </main>
  );
}
