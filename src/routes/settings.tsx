import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  User,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  ScrollText,
  CheckCircle2,
  Info,
  ChevronRight,
  Settings as SettingsIcon,
  HelpCircle,
  Camera,
  Upload,
  LogOut,
  Loader2,
  X,
  Search,
  Store,
  QrCode,
  ExternalLink,
  Zap,
  Download,
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/hooks/use-theme";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/api/supabase";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { formatKycTag, hashPin } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/use-profile";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Vault OS" },
      {
        name: "description",
        content: "Configure your Vault OS account, security, and preferences.",
      },
    ],
  }),
  component: SettingsPage,
});

function SectionCard({
  icon: Icon,
  title,
  meta,
  hint,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  meta?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 sm:p-8 lg:p-10 shadow-[0_1px_0_0_oklch(1_0_0_/_0.03)_inset] ${className || ""}`}
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-6 mb-8 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-medium tracking-[0.18em] uppercase text-foreground">
              {title}
            </h2>
            {meta && <p className="mt-1 text-xs text-muted-foreground/80">{meta}</p>}
          </div>
        </div>
        {hint && (
          <span className="text-xs text-muted-foreground/70 max-w-[180px] text-right leading-relaxed">
            {hint}
          </span>
        )}
      </header>
      <div className="space-y-7">{children}</div>
    </section>
  );
}

function Row({
  label,
  children,
  description,
}: {
  label: string;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-3 sm:gap-8 items-start">
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {description && (
          <div className="mt-1 text-xs text-muted-foreground/60 leading-relaxed">{description}</div>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-1">
      <div className="min-w-0">
        <div className="text-sm text-foreground">{label}</div>
        {description && (
          <div className="mt-1 text-xs text-muted-foreground/70 leading-relaxed">{description}</div>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

function ActivityLogDrawer({ logs, children }: { logs: any[]; children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md border-l border-border/40 bg-card/95 backdrop-blur-xl p-0"
      >
        <SheetHeader className="p-8 border-b border-border/20">
          <SheetTitle className="font-serif text-2xl">
            {t("settings.security.session_history")}
          </SheetTitle>
          <SheetDescription className="text-muted-foreground">
            {t("settings.security.session_history_desc")}
          </SheetDescription>
        </SheetHeader>
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-100px)]">
          {logs.length > 0 ? (
            <div className="relative border-l border-border/40 ml-2 pl-6 space-y-8">
              {logs.map((log) => (
                <div key={log.id} className="relative">
                  <div
                    className={`absolute -left-[31px] top-0 h-2 w-2 rounded-full border-2 border-card ${
                      log.is_suspicious
                        ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                        : "bg-primary"
                    }`}
                  />
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-medium text-foreground lowercase">
                      {t(`settings.activity.actions.${log.action_type}`, {
                        defaultValue: log.action_type,
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.location || t("settings.security.unknown")}
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      {t("settings.security.auth_success", {
                        device: log.device_info || t("settings.security.unknown_device"),
                      })}
                    </div>
                    <div className="text-[10px] text-muted-foreground/60 mt-1">
                      {new Date(log.created_at).toLocaleString([], {
                        dateStyle: "full",
                        timeStyle: "short",
                      })}
                    </div>
                    {log.is_suspicious && (
                      <div className="mt-2 p-2 rounded-md bg-destructive/10 border border-destructive/20 text-[10px] text-destructive flex items-center gap-2">
                        <ShieldCheck className="h-3 w-3" />
                        {t("settings.security.suspicious_flag")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground italic">
              {t("settings.activity.none")}
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-card to-transparent pt-10">
          <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
            {t("settings.security.audit_note")}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ChangePinDialog({ profile, onSuccess }: { profile: any; onSuccess: () => void }) {
  const { t } = useTranslation();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [otp, setOtp] = useState("");
  const [showPins, setShowPins] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [step, setStep] = useState<"input" | "verify">("input");
  const [open, setOpen] = useState(false);

  const handleRequestChange = async () => {
    if (currentPin.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6) {
      toast.error("All PINs must be 6 digits");
      return;
    }

    if (newPin !== confirmPin) {
      toast.error("New PINs do not match");
      return;
    }

    try {
      setIsChanging(true);
      const hashedCurrent = await hashPin(currentPin);

      // 1. Securely verify current PIN via RPC
      const { data: isValid, error: rpcError } = await supabase.rpc("verify_current_pin", {
        provided_pin_hash: hashedCurrent,
      });

      if (rpcError || !isValid) {
        toast.error("Current PIN is incorrect");
        return;
      }

      // 2. Trigger Step-up OTP
      const { data, error: otpError } = await supabase.functions.invoke("step-up-auth", {
        body: { action: "send", purpose: "pin_change" },
      });
      
      if (otpError || data?.error) throw new Error(otpError?.message || data?.error || "Failed to send code.");

      toast.success("Verification code sent to your email");
      setStep("verify");
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate PIN change");
    } finally {
      setIsChanging(false);
    }
  };

  const handleVerifyAndSave = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    try {
      setIsChanging(true);

      // 1. Verify the OTP using our Edge Function
      const { data, error: verifyError } = await supabase.functions.invoke("step-up-auth", {
        body: { action: "verify", code: otp },
      });

      if (verifyError || data?.error) throw new Error(verifyError?.message || data?.error || "Verification failed.");

      // 2. Hash and save the new PIN
      const hashedNew = await hashPin(newPin);
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ pin_hash: hashedNew })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      // 3. Log Audit Event
      await supabase.rpc("log_audit_event", {
        p_action: "pin_changed",
        p_status: "success",
      });

      toast.success("PIN changed successfully!");
      setOpen(false);
      onSuccess();
      // Clear fields
      setStep("input");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setOtp("");
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
          setStep("input");
          setOtp("");
        }
      }}
    >
      <DialogTrigger asChild>
        <button className="w-full flex items-center justify-between text-sm text-foreground hover:text-primary transition-colors py-2 group">
          <span className="flex items-center gap-3">
            <Lock className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            {t("settings.security.pin.change")}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border/40 rounded-3xl p-8">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-serif">
            {step === "input" ? t("settings.security.pin.dialog_title") : "Verify Update"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === "input"
              ? t("settings.security.pin.dialog_desc")
              : `A 6-digit code was sent to ${profile.email}. Enter it below to confirm your new PIN.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === "input" ? (
            <>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {t("settings.security.pin.current")}
                  </label>
                  <div className="relative">
                    <Input
                      type={showPins ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={6}
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                      placeholder="••••••"
                      className="h-12 bg-input/40 border-border/60 rounded-xl text-center font-mono text-lg tracking-widest"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {t("settings.security.pin.new")}
                  </label>
                  <Input
                    type={showPins ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="h-12 bg-input/40 border-border/60 rounded-xl text-center font-mono text-lg tracking-widest"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {t("settings.security.pin.confirm")}
                  </label>
                  <Input
                    type={showPins ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="h-12 bg-input/40 border-border/60 rounded-xl text-center font-mono text-lg tracking-widest"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowPins(!showPins)}
                  className="text-xs text-primary font-medium flex items-center gap-1.5 hover:underline"
                >
                  {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPins ? t("settings.security.pin.hide") : t("settings.security.pin.show")}
                </button>
              </div>

              <Button
                onClick={handleRequestChange}
                disabled={isChanging || newPin.length !== 6 || newPin !== confirmPin}
                className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20"
              >
                {isChanging ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ShieldCheck className="w-4 h-4 mr-2" />
                )}
                {t("settings.security.pin.update_btn")}
              </Button>
            </>
          ) : (
            <div className="space-y-6">
              <div className="space-y-1.5 text-center">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Verification Code
                </label>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="h-16 bg-input/40 border-border/60 rounded-xl text-center font-mono text-3xl tracking-[0.5em]"
                  autoFocus
                />
              </div>

              <Button
                onClick={handleVerifyAndSave}
                disabled={isChanging || otp.length !== 6}
                className="w-full h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isChanging ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Confirm PIN Change
              </Button>

              <button
                onClick={() => setStep("input")}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to PIN entry
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SettingsPage() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { currency, changeCurrency } = useWalletBalance();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { profile, updateProfile } = useProfile();

  async function updateLanguage(lang: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from("user_preferences")
        .upsert({ user_id: user.id, language: lang }, { onConflict: "user_id" });

      if (error) throw error;

      i18n.changeLanguage(lang);
      updateProfile({ language: lang }); // Note: updateProfile needs to handle this or we use queryClient

      const messages: Record<string, string> = {
        en: "Language updated to English",
        es: "Idioma actualizado a Español",
        fr: "Langue mise à jour en Français",
        de: "Sprache auf Deutsch aktualisiert",
        sw: "Lugha imesasishwa kuwa Kiswahili",
        it: "Lingua aggiornata in Italiano",
        pt: "Idioma atualizado para Português",
      };
      toast.success(messages[lang] || `Language updated to ${lang}`);
    } catch (error: any) {
      toast.error(error.message || "Error updating language");
    }
  }
  const [devices, setDevices] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Merchant State
  const [merchantEnabled, setMerchantEnabled] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("Retail");
  const [businessDescription, setBusinessDescription] = useState("");
  const [isSavingMerchant, setIsSavingMerchant] = useState(false);
  const [isMerchantSaved, setIsMerchantSaved] = useState(false);

  // New UI states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Local state for name to make input controlled and smooth
  const [fullName, setFullName] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (profile) {
      setFullName(`${profile.first_name || ""} ${profile.last_name || ""}`.trim());
      setLoading(false);
      fetchMerchantData();
    }
    fetchDevices();
    fetchLogs();
  }, [profile]);

  async function fetchMerchantData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("merchants")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setMerchantEnabled(data.is_active);
        setBusinessName(data.business_name);
        setBusinessCategory(data.business_category);
        setBusinessDescription(data.business_description || "");
        setIsMerchantSaved(true);
      }
    } catch (err) {
      console.error("Error fetching merchant data:", err);
    }
  }

  async function handleSaveMerchant() {
    try {
      setIsSavingMerchant(true);

      // Get the current session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error("No active session. Please log in again.");

      const user = session.user;
      console.log("handleSaveMerchant: User identified:", user.id);

      const { error } = await supabase.from("merchants").upsert(
        {
          user_id: user.id,
          business_name: businessName || `${profile?.first_name}'s Business`,
          business_category: businessCategory,
          business_description: businessDescription,
          is_active: merchantEnabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) {
        console.error("handleSaveMerchant: Upsert error:", error);
        throw error;
      }

      setIsMerchantSaved(true);
      toast.success("Merchant profile updated!");
    } catch (err: any) {
      console.error("handleSaveMerchant: Final catch:", err);
      toast.error(err.message || "Failed to save business profile");
    } finally {
      setIsSavingMerchant(false);
    }
  }

  const handleDownloadQR = () => {
    const canvas = document.getElementById("merchant-qr-canvas") as HTMLCanvasElement;
    if (!canvas) return;

    const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `vault-qr-${profile?.kyc_tag}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    toast.success("QR Code download started!");
  };

  async function fetchDevices() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_devices")
        .select("*")
        .eq("user_id", user.id)
        .order("last_login", { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (error: any) {
      console.error("Error loading devices:", error);
      toast.error(error.message || "Unable to load your devices.");
    }
  }

  useEffect(() => {
    fetchDevices();

    if (!profile) return;

    const channel = supabase
      .channel("user_devices_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_devices",
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          fetchDevices();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  async function fetchLogs() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error("Error loading logs:", error);
      toast.error(error.message || "Unable to load your activity logs.");
    }
  }

  async function handleRevokeDevice(device: any) {
    try {
      // 1. Revoke the target device
      const { error: revokeError } = await supabase
        .from("user_devices")
        .update({ is_active: false })
        .eq("id", device.id);
      if (revokeError) throw revokeError;

      toast.success(`Successfully revoked ${device.device_name}`);
      fetchDevices(); // Refresh list
    } catch (error: any) {
      toast.error("Failed to revoke device: " + error.message);
    }
  }

  async function updatePreference(key: string, value: boolean) {
    updateProfile({ [key]: value });
  }

  async function handleSave() {
    try {
      setSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      const baseKycTag = formatKycTag(firstName, lastName);

      const { data: existingTags, error: existingError } = await supabase
        .from("profiles")
        .select("kyc_tag")
        .ilike("kyc_tag", `${baseKycTag}%`);

      if (existingError) {
        throw existingError;
      }

      const usedTags = new Set(
        (existingTags || [])
          .map((row: any) => row.kyc_tag)
          .filter((tag: any): tag is string => Boolean(tag)),
      );

      let kycTag = baseKycTag;
      if (usedTags.has(baseKycTag)) {
        let suffix = 2;
        while (usedTags.has(`${baseKycTag}${suffix}`)) {
          suffix += 1;
        }
        kycTag = `${baseKycTag}${suffix}`;
      }

      const updates: Record<string, any> = {
        first_name: firstName,
        last_name: lastName,
      };

      if (!profile?.kyc_tag) {
        updates.kyc_tag = kycTag;
      }

      updateProfile(updates);
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Error updating profile");
    } finally {
      setSaving(false);
    }
  }

  async function startCamera() {
    try {
      setShowPhotoOptions(false);
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      toast.error("Unable to access camera. Please check permissions.");
      setShowCamera(false);
    }
  }

  function stopCamera() {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setShowCamera(false);
  }

  async function capturePhoto() {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0);

      canvas.toBlob(
        async (blob) => {
          if (blob) {
            const file = new File([blob], `avatar-${Date.now()}.jpg`, { type: "image/jpeg" });
            await handleImageUpload(file);
            stopCamera();
          }
        },
        "image/jpeg",
        0.8,
      );
    }
  }

  async function handleImageUpload(file: File) {
    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const filePath = `${user.id}-${Math.random()}.${fileExt}`;

      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Update profiles table
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ profile_photo_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      updateProfile({ profile_photo_url: publicUrl });
      toast.success("Profile picture updated!");
    } catch (error: any) {
      toast.error(error.message || "Error uploading avatar");
    } finally {
      setUploading(false);
    }
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0) return;
    await handleImageUpload(event.target.files[0]);
    setShowPhotoOptions(false);
  }

  async function removeAvatar() {
    try {
      setUploading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from("profiles")
        .update({ profile_photo_url: null })
        .eq("id", user.id);

      if (error) throw error;

      updateProfile({ profile_photo_url: null });
      toast.success("Profile picture removed");
    } catch (error: any) {
      toast.error(error.message || "Error removing avatar");
    } finally {
      setUploading(false);
    }
  }

  async function handleSuspendAccount(reason: string) {
    try {
      setSaving(true);
      const { error } = await supabase.rpc("suspend_account", {
        p_reason: reason,
      });

      if (error) throw error;

      toast.success("Account suspended for your security.");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Error suspending account");
    } finally {
      setSaving(false);
    }
  }

  const [suspensionReason, setSuspensionReason] = useState("");
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreOtp, setRestoreOtp] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);

  async function handleInitiateRestore() {
    try {
      setIsRestoring(true);
      const { data, error } = await supabase.functions.invoke("step-up-auth", {
        body: { action: "send", purpose: "account_restore" },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error || "Failed to send code");
      toast.success("Recovery code sent to your email");
      setShowRestoreDialog(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsRestoring(false);
    }
  }

  async function handleVerifyRestore() {
    try {
      setIsRestoring(true);
      const { data, error } = await supabase.functions.invoke("step-up-auth", {
        body: { action: "verify", code: restoreOtp },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error || "Verification failed");

      const { error: rpcError } = await supabase.rpc("unsuspend_account");
      if (rpcError) throw rpcError;

      toast.success("Account restored successfully!");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16">
        {profile?.is_suspended && (
          <div className="mb-8 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center text-destructive shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-sm font-bold text-destructive uppercase tracking-tight">
                Account Suspended
              </h3>
              <p className="text-xs text-muted-foreground">
                Your account is currently locked. Reason: {profile.suspended_reason || "Security concerns"}.
                Restore your account using your email verification code.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/30 text-destructive hover:bg-destructive/5"
              onClick={handleInitiateRestore}
              disabled={isRestoring}
            >
              {isRestoring ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
              Restore Account
            </Button>
          </div>
        )}
        {/* Header */}
        <div className="mb-12 lg:mb-16">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("settings.back")}
          </Link>
          <h1 className="mt-8 font-serif text-4xl lg:text-5xl tracking-tight">
            {t("settings.title")} <span className="text-muted-foreground/60">&</span>{" "}
            {t("settings.subtitle")}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-xl leading-relaxed">
            {t("settings.description")}
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
          {/* Account Profile */}
          <SectionCard icon={User} title={t("settings.sections.profile")}>
            <Row label={t("settings.profile.picture.label")}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative group/avatar">
                  <button
                    onClick={() => profile?.profile_photo_url && setShowViewModal(true)}
                    className="relative block rounded-full overflow-hidden transition-all active:scale-95"
                    title={
                      profile?.profile_photo_url
                        ? t("settings.profile.picture.view")
                        : "No photo set"
                    }
                    suppressHydrationWarning
                  >
                    <Avatar className="w-16 h-16 rounded-full">
                      <AvatarImage src={profile?.profile_photo_url ?? undefined} alt="Profile" />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {profile?.first_name?.[0] || <User className="w-8 h-8" />}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                        profile?.profile_photo_url
                          ? "opacity-0 group-hover/avatar:opacity-100"
                          : "opacity-0 pointer-events-none"
                      }`}
                    >
                      <Search className="w-4 h-4 text-white" />
                    </div>
                  </button>

                  <button
                    onClick={() => setShowPhotoOptions(true)}
                    disabled={uploading}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-md border border-background z-10"
                    title={t("settings.profile.picture.update")}
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>

                  {isMounted && profile?.profile_photo_url && (
                    <button
                      onClick={removeAvatar}
                      disabled={uploading}
                      className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-md border border-background z-10"
                      title={t("settings.profile.picture.remove")}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-sm text-muted-foreground">
                    {t("settings.profile.picture.description")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("settings.profile.picture.format")}
                  </div>
                </div>
              </div>
            </Row>

            {/* Modals for Profile Picture */}
            <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
              <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/40 p-0 overflow-hidden">
                <div className="relative aspect-square w-full">
                  <img
                    src={profile?.profile_photo_url || ""}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="absolute top-4 right-4 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-6 text-center">
                  <h3 className="text-lg font-medium">
                    {profile?.first_name} {profile?.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Full Ledger-Verified Identity
                  </p>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showPhotoOptions} onOpenChange={setShowPhotoOptions}>
              <DialogContent className="sm:max-w-sm bg-card/95 backdrop-blur-xl border-border/40">
                <DialogHeader>
                  <DialogTitle>{t("settings.profile.picture.dialog.title")}</DialogTitle>
                  <DialogDescription>
                    {t("settings.profile.picture.dialog.description")}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-3 py-4">
                  <Button
                    variant="outline"
                    className="h-14 justify-start gap-4 rounded-xl border-border/40 hover:bg-primary/5 hover:border-primary/40 transition-all"
                    onClick={startCamera}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">
                        {t("settings.profile.picture.dialog.take")}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {t("settings.profile.picture.dialog.camera")}
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-14 justify-start gap-4 rounded-xl border-border/40 hover:bg-primary/5 hover:border-primary/40 transition-all"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">
                        {t("settings.profile.picture.dialog.browse")}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {t("settings.profile.picture.dialog.gallery")}
                      </div>
                    </div>
                  </Button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={uploadAvatar}
                  accept="image/*"
                  className="hidden"
                />
              </DialogContent>
            </Dialog>

            <Dialog open={showCamera} onOpenChange={(open) => !open && stopCamera()}>
              <DialogContent className="sm:max-w-md bg-black border-white/10 p-0 overflow-hidden">
                <div className="relative aspect-square bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover scale-x-[-1]"
                  />
                  <div className="absolute inset-0 border-[2px] border-white/20 rounded-full m-8 pointer-events-none" />
                </div>
                <div className="p-6 bg-card flex items-center justify-between gap-4">
                  <Button variant="ghost" onClick={stopCamera} className="text-muted-foreground">
                    Cancel
                  </Button>
                  <button
                    onClick={capturePhoto}
                    className="h-16 w-16 rounded-full border-4 border-primary/20 p-1 hover:scale-105 transition-transform"
                  >
                    <div className="h-full w-full rounded-full bg-primary flex items-center justify-center text-white shadow-lg">
                      <Camera className="w-6 h-6" />
                    </div>
                  </button>
                  <div className="w-20" /> {/* Spacer */}
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </DialogContent>
            </Dialog>
            <Row label={t("settings.profile.verification.label")}>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                    profile?.kyc_status === "verified"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-500"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {profile?.kyc_status === "verified"
                    ? t("settings.profile.verification.verified")
                    : t("settings.profile.verification.unverified")}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <span className="h-3.5 w-3.5 rounded-full bg-muted flex items-center justify-center">
                    <Info className="h-2 w-2" />
                  </span>
                  {t("settings.profile.verification.required")}
                </span>
              </div>
            </Row>
            <Row label={t("settings.profile.full_name.label")}>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("settings.profile.full_name.placeholder")}
                className="bg-input/40 border-border/60 h-11"
              />
            </Row>
            <Row label={t("settings.profile.email.label")}>
              <Input
                value={profile?.email || ""}
                disabled
                className="bg-input/20 border-border/40 h-11 text-muted-foreground cursor-not-allowed"
              />
            </Row>
            <Row label={t("settings.profile.kyc_tag.label")}>
              <Input
                value={profile?.kyc_tag || ""}
                disabled
                className="bg-input/20 border-border/40 h-11 text-muted-foreground cursor-not-allowed font-mono text-sm"
              />
            </Row>

            <div className="pt-6 border-t border-border/40 flex justify-end">
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 rounded-xl h-11 transition-all active:scale-95"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t("settings.profile.save")}
              </Button>
            </div>
          </SectionCard>

          {/* Business Profile (Merchant Mode) */}
          <SectionCard
            icon={Store}
            title={t("settings.sections.business")}
            meta={t("settings.business.meta")}
            hint={t("settings.business.hint")}
          >
            <div className="space-y-8">
              <ToggleRow
                label={t("settings.business.enable")}
                description={t("settings.business.enable_desc")}
                checked={merchantEnabled}
                onCheckedChange={(val) => {
                  setMerchantEnabled(val);
                  if (profile?.id) {
                    supabase.from("merchants").upsert(
                      {
                        user_id: profile.id,
                        is_active: val,
                        business_name: businessName || `${profile?.first_name}'s Business`,
                      },
                      { onConflict: "user_id" },
                    );
                  }
                }}
              />

              {merchantEnabled ? (
                <div className="space-y-10 pt-8 border-t border-border/40 animate-in fade-in slide-in-from-top-4 duration-700">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-10">
                    <div className="space-y-6">
                      <Row
                        label={t("settings.business.name")}
                        description={t("settings.business.name_desc")}
                      >
                        <Input
                          value={businessName}
                          onChange={(e) => {
                            setBusinessName(e.target.value);
                            setIsMerchantSaved(false);
                          }}
                          placeholder="e.g. Acme Coffee Roasters"
                          className="bg-input/40 border-border/60 h-11"
                        />
                      </Row>
                      <Row label={t("settings.business.category")}>
                        <select
                          value={businessCategory}
                          onChange={(e) => {
                            setBusinessCategory(e.target.value);
                            setIsMerchantSaved(false);
                          }}
                          className="w-full h-11 rounded-md border border-border/60 bg-input/40 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option>Retail</option>
                          <option>Food & Beverage</option>
                          <option>Services</option>
                          <option>Technology</option>
                          <option>Creative</option>
                          <option>Other</option>
                        </select>
                      </Row>
                      <Row
                        label={t("settings.business.description")}
                        description={t("settings.business.description_desc")}
                      >
                        <textarea
                          value={businessDescription}
                          onChange={(e) => {
                            setBusinessDescription(e.target.value);
                            setIsMerchantSaved(false);
                          }}
                          placeholder="Crafting premium coffee experiences."
                          className="w-full min-h-[100px] rounded-md border border-border/60 bg-input/40 p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                          maxLength={160}
                        />
                      </Row>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                      {isMerchantSaved ? (
                        <>
                          <div className="group relative p-4 rounded-[32px] bg-white border border-border shadow-xl transition-all hover:scale-105 duration-500">
                            <QRCodeSVG
                              value={`${window.location.origin}/pay/${encodeURIComponent(profile?.kyc_tag || "")}`}
                              size={180}
                              level="H"
                              includeMargin={false}
                              imageSettings={{
                                src: "/v-logo.svg",
                                x: undefined,
                                y: undefined,
                                height: 32,
                                width: 32,
                                excavate: true,
                              }}
                            />
                            {/* Hidden canvas for download */}
                            <QRCodeCanvas
                              id="merchant-qr-canvas"
                              value={`${window.location.origin}/pay/${encodeURIComponent(profile?.kyc_tag || "")}`}
                              size={512}
                              level="H"
                              includeMargin={true}
                              className="hidden"
                            />
                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 rounded-[32px] flex items-center justify-center transition-opacity pointer-events-none">
                              <QrCode className="w-8 h-8 text-black/20" />
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                              {t("settings.business.qr.title")}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                              {profile?.kyc_tag}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 w-full">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl h-10 px-0"
                              onClick={handleDownloadQR}
                            >
                              <Download className="w-3.5 h-3.5 mr-2" />{" "}
                              {t("settings.business.qr.download")}
                            </Button>
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="rounded-xl h-10 px-0"
                            >
                              <Link
                                to="/pay/$username"
                                params={{ username: profile?.kyc_tag || "" }}
                                target="_blank"
                              >
                                <ExternalLink className="w-3.5 h-3.5 mr-2" />{" "}
                                {t("settings.business.qr.view")}
                              </Link>
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="w-[212px] h-[212px] rounded-[32px] bg-input/5 border border-dashed border-border/60 flex flex-col items-center justify-center p-6 text-center">
                          <QrCode className="w-10 h-10 text-muted-foreground/40 mb-3" />
                          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                            {t("settings.business.qr.save_to_gen")}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* How it works */}
                  <div className="rounded-2xl border border-primary/10 bg-primary/5 p-6">
                    <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-primary" />{" "}
                      {t("settings.business.how_it_works.title")}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold">
                            1
                          </div>
                          <div className="text-xs font-bold">
                            {t("settings.business.how_it_works.step1_title")}
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed pl-7">
                          {t("settings.business.how_it_works.step1_desc")}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold">
                            2
                          </div>
                          <div className="text-xs font-bold">
                            {t("settings.business.how_it_works.step2_title")}
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed pl-7">
                          {t("settings.business.how_it_works.step2_desc")}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold">
                            3
                          </div>
                          <div className="text-xs font-bold">
                            {t("settings.business.how_it_works.step3_title")}
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed pl-7">
                          {t("settings.business.how_it_works.step3_desc")}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold">
                            4
                          </div>
                          <div className="text-xs font-bold">
                            {t("settings.business.how_it_works.step4_title")}
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed pl-7">
                          {t("settings.business.how_it_works.step4_desc")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      className="rounded-xl h-12 px-8 font-bold shadow-lg shadow-primary/20"
                      onClick={handleSaveMerchant}
                      disabled={isSavingMerchant}
                    >
                      {isSavingMerchant ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      {t("settings.business.update")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-12 rounded-2xl border border-dashed border-border/60 bg-input/5 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                    <Store className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    {t("settings.business.inactive_title")}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                    {t("settings.business.inactive_desc")}
                  </p>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Security Center */}
          <SectionCard
            icon={ShieldCheck}
            title={t("settings.sections.security")}
            hint={t("settings.security.devices.required")}
          >
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground/70 mb-3">
                {t("settings.security.alert_feed")}
              </div>
              <ul className="space-y-2.5">
                <li className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    {t("settings.security.alerts.unusual_login")}{" "}
                    <span className="text-muted-foreground">(Kenya)</span>
                  </span>
                  <span className="text-xs text-muted-foreground">2h ago</span>
                </li>
                <li className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {t("settings.security.alerts.new_device authorized")}
                  </span>
                  <span className="text-xs text-muted-foreground">6h ago</span>
                </li>
              </ul>
            </div>

            <div className="border-t border-border/40 pt-6 space-y-5">
              <ToggleRow
                label={t("settings.security.biometric.label")}
                description={t("settings.security.biometric.description")}
                checked={profile?.biometric_enabled}
                onCheckedChange={(val) => {
                  if (profile) {
                    supabase
                      .from("profiles")
                      .update({ biometric_enabled: val })
                      .eq("id", profile.id)
                      .then(({ error }) => {
                        if (error) toast.error("Failed to update biometric preference");
                        else {
                          toast.success(`Biometrics ${val ? "enabled" : "disabled"}`);
                          updateProfile({ biometric_enabled: val });
                        }
                      });
                  }
                }}
              />
              <div className="space-y-4">
                <div className="text-sm text-foreground">
                  {t("settings.security.devices.label")}
                </div>
                <div className="space-y-3">
                  {devices.length > 0 ? (
                    devices.map((device) => (
                      <div key={device.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5 text-primary">
                            <Smartphone className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-medium text-foreground">
                              {device.device_name}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {t("settings.security.devices.last_login")}:{" "}
                              {new Date(device.last_login).toLocaleDateString()} at{" "}
                              {new Date(device.last_login).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </div>
                        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_oklch(0.65_0.14_165_/_0.5)]" />
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground italic">
                      {t("settings.security.devices.none")}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-border/40 pt-6 space-y-3">
              {profile && (
                <ChangePinDialog
                  profile={profile}
                  onSuccess={() => {
                    // Update local profile state if needed, although pin_hash is usually opaque to frontend
                  }}
                />
              )}
              <Sheet>
                <SheetTrigger asChild>
                  <button className="w-full flex items-center justify-between text-sm text-foreground hover:text-primary transition-colors py-2 group">
                    <span className="flex items-center gap-3">
                      <Lock className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      {t("settings.security.devices.management")}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-full sm:max-w-md border-l border-border/40 bg-card/95 backdrop-blur-xl p-0"
                >
                  <SheetHeader className="p-8 border-b border-border/20">
                    <SheetTitle className="font-serif text-2xl">
                      {t("settings.security.devices.management")}
                    </SheetTitle>
                    <SheetDescription className="text-muted-foreground">
                      {t("settings.security.devices.management_desc")}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
                    {devices.length > 0 ? (
                      devices.map((device) => (
                        <div
                          key={device.id}
                          className="flex flex-col gap-3 p-4 rounded-xl border border-border/40 bg-input/10 hover:bg-input/20 transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Smartphone className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-foreground">
                                  {device.device_name}
                                </div>
                                <div className="text-[11px] text-muted-foreground uppercase tracking-tight">
                                  {t("settings.security.devices.active_session")}
                                </div>
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${
                                device.is_active
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                                  : "border-muted-foreground/30 bg-muted/10 text-muted-foreground"
                              }`}
                            >
                              <span
                                className={`h-1 w-1 rounded-full ${device.is_active ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`}
                              />
                              {device.is_active ? t("settings.security.devices.live") : "Ended"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/10">
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">
                                {t("settings.security.devices.first_seen")}
                              </div>
                              <div className="text-xs text-foreground/80">
                                {new Date(device.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">
                                {t("settings.security.devices.last_activity")}
                              </div>
                              <div className="text-xs text-foreground/80">
                                {new Date(device.last_login).toLocaleString([], {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </div>
                            </div>
                          </div>

                          {device.is_active && (
                            <div className="pt-2 flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-[11px] text-destructive hover:text-white hover:bg-destructive transition-all"
                                onClick={() => handleRevokeDevice(device)}
                              >
                                {t("settings.security.devices.revoke")}
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 rounded-xl border border-dashed border-border/60 text-muted-foreground italic">
                        {t("settings.security.devices.none")}
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-card to-transparent pt-10">
                    <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
                      {t("settings.security.devices.revoke_note")}
                    </p>
                  </div>
                </SheetContent>
              </Sheet>

              <ActivityLogDrawer logs={logs}>
                <button className="w-full flex items-center justify-between text-sm text-foreground hover:text-primary transition-colors py-2 group">
                  <span className="flex items-center gap-3">
                    <ScrollText className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    {t("settings.security.session_history")}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              </ActivityLogDrawer>
            </div>
          </SectionCard>

          {/* Recent Activity */}
          <SectionCard icon={ScrollText} title={t("settings.sections.activity")}>
            <ul className="divide-y divide-border/40">
              {logs.length > 0 ? (
                logs.slice(0, 4).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <div className="text-sm text-foreground capitalize">
                        {item.action_type.replace("_", " ")}
                        {item.device_info && (
                          <span className="text-muted-foreground/60 text-xs ml-2">
                            via {item.device_info}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground/70">
                        {new Date(item.created_at).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <div className="py-4 text-sm text-muted-foreground italic">
                  {t("settings.activity.none")}
                </div>
              )}
            </ul>

            <ActivityLogDrawer logs={logs}>
              <button className="w-full text-center text-xs text-primary hover:text-primary/80 pt-4 transition-colors">
                {t("settings.activity.view_full")} →
              </button>
            </ActivityLogDrawer>
          </SectionCard>

          <SectionCard icon={SlidersHorizontal} title={t("settings.sections.preferences")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-border/40">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  {t("settings.preferences.currency")}
                </label>
                <select
                  value={(profile as any)?.primary_currency || "USD"}
                  onChange={async (e) => {
                    const newCurrency = e.target.value;
                    const { error } = await supabase
                      .from("profiles")
                      .update({ primary_currency: newCurrency })
                      .eq("id", profile!.id);
                    if (error) toast.error("Error updating currency");
                    else {
                      updateProfile({ primary_currency: newCurrency });
                      toast.success("Currency updated");
                    }
                  }}
                  className="w-full h-11 rounded-md border border-border/60 bg-input/40 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="USD">USD ($)</option>
                  <option value="KES">KES (Shillings)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="UGX">UGX (Shillings)</option>
                  <option value="TZS">TZS (Shillings)</option>
                  <option value="NGN">NGN (Naira)</option>
                  <option value="GHS">GHS (Cedi)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  {t("settings.preferences.theme")}
                </label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                  className="w-full h-11 rounded-md border border-border/60 bg-input/40 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>

            <div className="py-6 border-b border-border/40 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-foreground">
                  {t("settings.preferences.text_size_title", "Text Accessibility")}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("settings.preferences.text_size_desc", "Adjust app-wide text sizes to support short or long-sighted reading.")}
                </p>
              </div>
              <Link
                to="/preferences"
                className="inline-flex h-9 items-center justify-center rounded-xl bg-primary/10 px-4 text-xs font-semibold text-primary border border-primary/20 hover:bg-primary/20 transition-all active:scale-95 shadow-sm shrink-0"
              >
                {t("settings.preferences.text_size_btn", "Configure")} →
              </Link>
            </div>

            <div className="pt-6">
              <label className="block text-sm text-muted-foreground mb-2">
                {t("settings.preferences.language")}
              </label>
              <select
                value={profile?.language || "en"}
                onChange={(e) => updateLanguage(e.target.value)}
                className="w-full h-11 rounded-md border border-border/60 bg-input/40 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="en">English (US)</option>
                <option value="es">Spanish (ES)</option>
                <option value="fr">French (FR)</option>
                <option value="de">German (DE)</option>
                <option value="it">Italian (IT)</option>
                <option value="sw">Swahili (SW)</option>
                <option value="pt">Portuguese (PT)</option>
              </select>
            </div>

            <div className="border-t border-border/40 mt-6 pt-6">
              <div className="text-xs uppercase tracking-wider text-muted-foreground/70 mb-4">
                {t("settings.preferences.notifications")}
              </div>
              <div className="space-y-4">
                <ToggleRow
                  label={t("settings.preferences.transfer_received")}
                  checked={profile?.notifications_transfer_received ?? true}
                  onCheckedChange={(val) =>
                    updatePreference("notifications_transfer_received", val)
                  }
                />
                <ToggleRow
                  label={t("settings.preferences.account_login")}
                  checked={profile?.notifications_account_login ?? true}
                  onCheckedChange={(val) => updatePreference("notifications_account_login", val)}
                />
                <ToggleRow
                  label={t("settings.preferences.transfer_sent")}
                  checked={profile?.notifications_transfer_sent ?? true}
                  onCheckedChange={(val) => updatePreference("notifications_transfer_sent", val)}
                />
                <ToggleRow
                  label={t("settings.preferences.security_alerts")}
                  checked={profile?.notifications_security_alerts ?? true}
                  onCheckedChange={(val) => updatePreference("notifications_security_alerts", val)}
                />
                <ToggleRow
                  label={t("settings.preferences.ai_insights_label")}
                  description={t("settings.preferences.ai_insights_desc")}
                  checked={profile?.notifications_ai_insights ?? true}
                  onCheckedChange={(val) => updatePreference("notifications_ai_insights", val)}
                />
              </div>
            </div>
          </SectionCard>

          {/* Danger Zone */}
          <SectionCard icon={ShieldAlert} title="Danger Zone">
            <div className="space-y-6">
              {/* About Account Suspension */}
              <div className="w-full rounded-2xl border border-border/40 bg-input/20 p-6 sm:p-8">
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 flex-shrink-0 mt-0.5">
                      <Info className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-foreground">
                        About Account Suspension
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        Suspending your account is a protective measure that immediately freezes all
                        financial activity. Use this if you notice suspicious logins, unauthorized
                        transactions, or if you lost your device. Everything is preserved and
                        you can self-restore later via email verification.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Suspend Account Card */}
              <div className="w-full rounded-2xl border border-border/40 bg-input/20 p-6 sm:p-8">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive flex-shrink-0 mt-0.5">
                      <ShieldOff className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-foreground">
                        Suspend My Account
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        Immediately lock all financial transactions.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  {profile?.is_suspended ? (
                    <Button
                      variant="outline"
                      className="w-full h-12 rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 font-bold"
                      onClick={handleInitiateRestore}
                      disabled={isRestoring}
                    >
                      {isRestoring ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      Restore & Unsuspend Account
                    </Button>
                  ) : (
                    <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-12 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5 font-bold"
                          disabled={saving}
                        >
                          <ShieldAlert className="w-4 h-4 mr-2" />
                          Suspend Account Now
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border/40 rounded-3xl p-8">
                        <DialogHeader className="mb-6">
                          <DialogTitle className="text-2xl font-serif">
                            Confirm Suspension
                          </DialogTitle>
                          <DialogDescription className="text-muted-foreground">
                            Please provide a reason for suspending your account. This will help us
                            secure your assets.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                              Reason for suspension
                            </label>
                            <textarea
                              className="w-full min-h-[100px] rounded-xl border border-border/60 bg-input/40 p-4 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                              placeholder="e.g., Suspicious login detected from unknown device"
                              value={suspensionReason}
                              onChange={(e) => setSuspensionReason(e.target.value)}
                            />
                          </div>
                          <Button
                            className="w-full h-12 rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={!suspensionReason.trim() || saving}
                            onClick={() => handleSuspendAccount(suspensionReason)}
                          >
                            {saving ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <ShieldOff className="w-4 h-4 mr-2" />
                            )}
                            Confirm Suspension
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>

              {/* Restore Dialog (OTP) */}
              <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
                <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border/40 rounded-3xl p-8">
                  <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-serif text-center">Restore Account</DialogTitle>
                    <DialogDescription className="text-muted-foreground text-center">
                      Enter the 6-digit code sent to <strong>{profile?.email}</strong> to verify your identity and restore access.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="space-y-1.5 text-center">
                      <Input
                        inputMode="numeric"
                        maxLength={6}
                        value={restoreOtp}
                        onChange={(e) => setRestoreOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="h-16 bg-input/40 border-border/60 rounded-xl text-center font-mono text-3xl tracking-[0.5em]"
                        autoFocus
                      />
                    </div>
                    <Button
                      className="w-full h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={restoreOtp.length !== 6 || isRestoring}
                      onClick={handleVerifyRestore}
                    >
                      {isRestoring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      Verify & Restore Account
                    </Button>
                    <button
                      onClick={handleInitiateRestore}
                      className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                    >
                      Didn't receive a code? Resend
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </SectionCard>
        </div>
      </main>
    </AppShell>
  );
}
