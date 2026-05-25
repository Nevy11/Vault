import { createFileRoute } from '@tanstack/react-router'
import { Logo } from "@/components/logo";

// 1. Types
type IDType = "national-id" | "passport" | "alien-card" | null;
type KYCStep = "id-type" | "document-details" | "upload" | "biometric" | "success";

// 2. TanStack Router Configuration
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

// 3. Helper Components
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
  const [confetti] = useState<Array<{ id: number; x: number; y: number; delay: number; duration: number }>>(
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

// 4. Main Page Component
export default function KYCPage() {
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
          )}
        </div>
      </div>
    </main>
  );
}