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
  Briefcase,
  Store,
  QrCode,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/hooks/use-theme";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/api/supabase";
import { toast } from "sonner";
import { formatKycTag } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { profileSignal, useProfileSignal } from "@/lib/profile-signal";
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
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3 sm:gap-8 items-start">
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
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md border-l border-border/40 bg-card/95 backdrop-blur-xl p-0"
      >
        <SheetHeader className="p-8 border-b border-border/20">
          <SheetTitle className="font-serif text-2xl">Session History</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            A comprehensive record of all security-related actions and session activity.
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
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground capitalize">
                        {log.action_type.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-muted-foreground bg-input/50 px-2 py-0.5 rounded-full">
                        {log.location || "Unknown"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      Successfully authenticated via{" "}
                      <span className="text-foreground/80">
                        {log.device_info || "Unknown Device"}
                      </span>
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
                        Flagged as suspicious activity
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground italic">
              No activity logs found.
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-card to-transparent pt-10">
          <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
            Vault OS audit logs are cryptographically sealed and immutable once recorded.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useProfileSignal();
  const [devices, setDevices] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Merchant State
  const [merchantEnabled, setMerchantEnabled] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("Retail");
  const [isSavingMerchant, setIsSavingMerchant] = useState(false);

  // New UI states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Local state for name to make input controlled and smooth
  const [fullName, setFullName] = useState("");

  useEffect(() => {
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
      }
    } catch (err) {
      console.error("Error fetching merchant data:", err);
    }
  }

  async function handleSaveMerchant() {
    try {
      setIsSavingMerchant(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const { error } = await supabase.from("merchants").upsert(
        {
          user_id: user.id,
          business_name: businessName || `${profile?.first_name}'s Business`,
          business_category: businessCategory,
          is_active: merchantEnabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) throw error;
      toast.success("Merchant profile updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save business profile");
    } finally {
      setIsSavingMerchant(false);
    }
  }

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
        .eq("is_active", true)
        .order("last_login", { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (error: any) {
      console.error("Error loading devices:", error);
      toast.error(error.message || "Unable to load your devices.");
    }
  }

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

  async function updatePreference(key: string, value: boolean) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from("profiles")
        .update({ [key]: value })
        .eq("id", user.id);

      if (error) throw error;

      setProfile({
        ...profile,
        [key]: value,
      });
      // Silent update for toggles to avoid toast spam
    } catch (error: any) {
      toast.error(error.message || "Error updating preference");
    }
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

      const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);

      if (error) throw error;

      setProfile({
        ...profile,
        first_name: firstName,
        last_name: lastName,
        kyc_tag: profile?.kyc_tag || kycTag,
      });
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

      setProfile({ ...profile, profile_photo_url: publicUrl });
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

      setProfile({ ...profile, profile_photo_url: null });
      toast.success("Profile picture removed");
    } catch (error: any) {
      toast.error(error.message || "Error removing avatar");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteAccount() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      const { error } = await supabase.functions.invoke("delete-account", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      await supabase.auth.signOut();
      toast.success("Account deleted successfully");
      window.location.href = "/login";
    } catch (error: any) {
      toast.error(error.message || "Error deleting account");
    }
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16">
        {/* Header */}
        <div className="mb-12 lg:mb-16">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="mt-8 font-serif text-4xl lg:text-5xl tracking-tight">
            Settings <span className="text-muted-foreground/60">&</span> Configuration
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-xl leading-relaxed">
            Manage your profile, security posture, and personal preferences. Changes apply across
            all authorized devices.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
          {/* Account Profile */}
          <SectionCard icon={User} title="Account Profile & KYC">
            <Row label="Profile Picture">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative group/avatar">
                  <button
                    onClick={() => profile?.profile_photo_url && setShowViewModal(true)}
                    className="relative block rounded-full border-2 border-border/40 overflow-hidden hover:border-primary/60 transition-all active:scale-95"
                    title={profile?.profile_photo_url ? "View photo" : "No photo set"}
                  >
                    <Avatar className="w-16 h-16 rounded-full">
                      <AvatarImage src={profile?.profile_photo_url ?? undefined} alt="Profile" />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {profile?.first_name?.[0] || <User className="w-8 h-8" />}
                      </AvatarFallback>
                    </Avatar>
                    {profile?.profile_photo_url && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
                        <Search className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => setShowPhotoOptions(true)}
                    disabled={uploading}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-md border border-background z-10"
                    title="Update photo"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>

                  {profile?.profile_photo_url && (
                    <button
                      onClick={removeAvatar}
                      disabled={uploading}
                      className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-md border border-background z-10"
                      title="Remove photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-sm text-muted-foreground">
                    Upload a profile picture to personalize your account
                  </div>
                  <div className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 5MB.</div>
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
                  <DialogTitle>Update Profile Photo</DialogTitle>
                  <DialogDescription>
                    Choose how you'd like to update your avatar.
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
                      <div className="text-sm font-medium">Take Photo</div>
                      <div className="text-[10px] text-muted-foreground">
                        Use your device camera
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
                      <div className="text-sm font-medium">Browse Gallery</div>
                      <div className="text-[10px] text-muted-foreground">
                        Select from your files
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
            <Row label="Verification Status">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                    profile?.kyc_status === "verified"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-500"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {profile?.kyc_status === "verified" ? "Verified · Level 2" : "Unverified"}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <Info className="h-3.5 w-3.5" />
                  Required for large withdrawals
                </span>
              </div>
            </Row>
            <Row label="Full Name">
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="bg-input/40 border-border/60 h-11"
              />
            </Row>
            <Row label="Email Address">
              <Input
                value={profile?.email || ""}
                disabled
                className="bg-input/20 border-border/40 h-11 text-muted-foreground cursor-not-allowed"
              />
            </Row>
            <Row label="KYC Tag">
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
                Save Profile Changes
              </Button>
            </div>
          </SectionCard>

          {/* Business Profile (Merchant Mode) */}
          <SectionCard
            icon={Store}
            title="Business Profile"
            meta="Merchant Mode & B2C Tools"
            hint="Enable to receive public payments via QR"
          >
            <ToggleRow
              label="Enable Merchant Mode"
              description="Activate your public payment profile and generate your unique Vault QR code."
              checked={merchantEnabled}
              onCheckedChange={(val) => {
                setMerchantEnabled(val);
                // Auto-save toggle status
                if (profile?.id) {
                  supabase.from("merchants").upsert({
                    user_id: profile.id,
                    is_active: val,
                    business_name: businessName || "My Business",
                  });
                }
              }}
            />

            {merchantEnabled && (
              <div className="space-y-6 pt-6 border-t border-border/40 animate-in fade-in slide-in-from-top-4 duration-500">
                <Row label="Business Name" description="Displayed on your public payment portal.">
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Acme Coffee Roasters"
                    className="bg-input/40 border-border/60"
                  />
                </Row>
                <Row label="Category">
                  <select
                    value={businessCategory}
                    onChange={(e) => setBusinessCategory(e.target.value)}
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

                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold uppercase tracking-widest">
                        Public QR Code
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Ready for high-fidelity scanning
                      </div>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="rounded-xl">
                    <Link to={`/pay/${profile?.kyc_tag}`} target="_blank">
                      View Portal <ExternalLink className="ml-2 w-3 h-3" />
                    </Link>
                  </Button>
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="rounded-xl h-10 px-6"
                    onClick={handleSaveMerchant}
                    disabled={isSavingMerchant}
                  >
                    {isSavingMerchant && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Business Profile
                  </Button>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Security Center */}
          <SectionCard
            icon={ShieldCheck}
            title="Security Center"
            hint="Required for large withdrawals"
          >
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground/70 mb-3">
                Security Alert Feed
              </div>
              <ul className="space-y-2.5">
                <li className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    Unusual login location <span className="text-muted-foreground">(Kenya)</span>
                  </span>
                  <span className="text-xs text-muted-foreground">2h ago</span>
                </li>
                <li className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    New device authorized
                  </span>
                  <span className="text-xs text-muted-foreground">6h ago</span>
                </li>
              </ul>
            </div>

            <div className="border-t border-border/40 pt-6 space-y-5">
              <ToggleRow
                label="Face ID / Biometric Login"
                description="Use device biometrics to unlock the vault."
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
                          profileSignal.set({ ...profile, biometric_enabled: val });
                        }
                      });
                  }
                }}
              />
              <div className="space-y-4">
                <div className="text-sm text-foreground">Authorized Devices</div>
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
                              Last login: {new Date(device.last_login).toLocaleDateString()} at{" "}
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
                      No authorized devices detected.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-border/40 pt-6 space-y-3">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="w-full flex items-center justify-between text-sm text-foreground hover:text-primary transition-colors py-2 group">
                    <span className="flex items-center gap-3">
                      <Smartphone className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      Device Management
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-full sm:max-w-md border-l border-border/40 bg-card/95 backdrop-blur-xl p-0"
                >
                  <SheetHeader className="p-8 border-b border-border/20">
                    <SheetTitle className="font-serif text-2xl">Device Management</SheetTitle>
                    <SheetDescription className="text-muted-foreground">
                      Review and manage all devices currently authorized to access your Vault OS
                      account.
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
                                  Active Session
                                </div>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-500">
                              <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                              Live
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/10">
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">
                                First Seen
                              </div>
                              <div className="text-xs text-foreground/80">
                                {new Date(device.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">
                                Last Activity
                              </div>
                              <div className="text-xs text-foreground/80">
                                {new Date(device.last_login).toLocaleString([], {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-[11px] text-destructive hover:text-white hover:bg-destructive transition-all"
                            >
                              Revoke Access
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 rounded-xl border border-dashed border-border/60 text-muted-foreground italic">
                        No authorized devices detected.
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-card to-transparent pt-10">
                    <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
                      Revoking a device will immediately sign it out and require a new secure PIN
                      verification to re-authorize.
                    </p>
                  </div>
                </SheetContent>
              </Sheet>

              <ActivityLogDrawer logs={logs}>
                <button className="w-full flex items-center justify-between text-sm text-foreground hover:text-primary transition-colors py-2 group">
                  <span className="flex items-center gap-3">
                    <ScrollText className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    Session History & Activity Logs
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              </ActivityLogDrawer>
            </div>
          </SectionCard>

          {/* Recent Activity */}
          <SectionCard icon={ScrollText} title="Recent Activity">
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
                  No recent activity recorded.
                </div>
              )}
            </ul>

            <ActivityLogDrawer logs={logs}>
              <button className="w-full text-center text-xs text-primary hover:text-primary/80 pt-4 transition-colors">
                View full activity log →
              </button>
            </ActivityLogDrawer>
          </SectionCard>

          <SectionCard icon={SlidersHorizontal} title="Preferences">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Theme</label>
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
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Language</label>
                <select className="w-full h-11 rounded-md border border-border/60 bg-input/40 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  <option>English (US)</option>
                  <option>Spanish (ES)</option>
                  <option>French (FR)</option>
                </select>
              </div>
            </div>

            <div className="border-t border-border/40 pt-6">
              <div className="text-xs uppercase tracking-wider text-muted-foreground/70 mb-4">
                Notification Center
              </div>
              <div className="space-y-4">
                <ToggleRow
                  label="Transfer received"
                  checked={profile?.notifications_transfer_received ?? true}
                  onCheckedChange={(val) =>
                    updatePreference("notifications_transfer_received", val)
                  }
                />
                <ToggleRow
                  label="Account login"
                  checked={profile?.notifications_account_login ?? true}
                  onCheckedChange={(val) => updatePreference("notifications_account_login", val)}
                />
                <ToggleRow
                  label="Transfer sent"
                  checked={profile?.notifications_transfer_sent ?? true}
                  onCheckedChange={(val) => updatePreference("notifications_transfer_sent", val)}
                />
                <ToggleRow
                  label="Security alerts"
                  checked={profile?.notifications_security_alerts ?? true}
                  onCheckedChange={(val) => updatePreference("notifications_security_alerts", val)}
                />
                <ToggleRow
                  label="AI Advisor insights"
                  description="Receive proactive financial health alerts and advice."
                  checked={profile?.notifications_ai_insights ?? true}
                  onCheckedChange={(val) => updatePreference("notifications_ai_insights", val)}
                />
              </div>
            </div>
          </SectionCard>

          {/* Danger Zone */}
          <SectionCard icon={X} title="Danger Zone" className="lg:col-span-2">
            <div className="space-y-6">
              <div className="w-full rounded-2xl border border-border/40 bg-input/20 p-6 sm:p-8">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-input/40 text-muted-foreground/70 flex-shrink-0 mt-0.5">
                      <X className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-foreground">Delete Account</h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        Permanently delete your Vault OS account and all associated data. This
                        action cannot be undone and will immediately revoke access to all authorized
                        devices.
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/40 p-4 flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">⚠️</span>
                    <p className="text-sm text-muted-foreground/80 font-medium leading-relaxed">
                      This is an irreversible action. Please ensure you have downloaded or backed up
                      any important data before proceeding.
                    </p>
                  </div>
                </div>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full h-12 rounded-xl transition-all active:scale-95 font-medium text-base shadow-sm hover:shadow-md"
                  >
                    Delete Account Permanently
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border/40 rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-serif">Delete Account?</DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm mt-2">
                      This action is permanent and cannot be undone. Your account and all data will
                      be deleted from our servers.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="rounded-xl border border-border/60 bg-input/20 p-4 my-4 flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">⚠️</span>
                    <p className="text-sm text-muted-foreground/80 font-medium">
                      Last warning: This cannot be reversed
                    </p>
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                    <Button variant="outline" className="rounded-lg h-11 font-medium">
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      className="rounded-lg h-11 active:scale-95 transition-all font-medium"
                    >
                      Confirm Deletion
                    </Button>
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
