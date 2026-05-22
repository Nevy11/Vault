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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/hooks/use-theme";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
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
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  meta?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 sm:p-8 lg:p-10 shadow-[0_1px_0_0_oklch(1_0_0_/_0.03)_inset]">
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
  defaultOn,
}: {
  label: string;
  description?: string;
  defaultOn?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-1">
      <div className="min-w-0">
        <div className="text-sm text-foreground">{label}</div>
        {description && (
          <div className="mt-1 text-xs text-muted-foreground/70 leading-relaxed">{description}</div>
        )}
      </div>
      <Switch defaultChecked={defaultOn} />
    </div>
  );
}

function ActivityLogDrawer({ logs, children }: { logs: any[], children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md border-l border-border/40 bg-card/95 backdrop-blur-xl p-0">
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
                  <div className={`absolute -left-[31px] top-0 h-2 w-2 rounded-full border-2 border-card ${
                    log.is_suspicious ? 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-primary'
                  }`} />
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground capitalize">
                        {log.action_type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-muted-foreground bg-input/50 px-2 py-0.5 rounded-full">
                        {log.location || 'Unknown'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      Successfully authenticated via <span className="text-foreground/80">{log.device_info || 'Unknown Device'}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/60 mt-1">
                      {new Date(log.created_at).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
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

  // Local state for name to make input controlled and smooth
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (!profile) {
      fetchProfile();
    } else {
      setFullName(`${profile.first_name || ""} ${profile.last_name || ""}`.trim());
      setLoading(false);
    }
    fetchDevices();
    fetchLogs();
  }, [profile]);

  async function fetchProfile() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*, phone_number")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast.error(error.message || "Error loading profile");
    } finally {
      setLoading(false);
    }
  }

  async function fetchDevices() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
    }
  }

  async function fetchLogs() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
        })
        .eq("id", user.id);

      if (error) throw error;

      setProfile({ ...profile, first_name: firstName, last_name: lastName });
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Error updating profile");
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const filePath = `${user.id}-${Math.random()}.${fileExt}`;

      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

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

  async function removeAvatar() {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
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
                <div className="relative">
                  <Avatar className="w-16 h-16 rounded-full border-2 border-border/40">
                    <AvatarImage src={profile?.profile_photo_url ?? undefined} alt="Profile" />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {profile?.first_name?.[0] || <User className="w-8 h-8" />}
                    </AvatarFallback>
                  </Avatar>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={uploadAvatar}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-sm text-muted-foreground">
                    Upload a profile picture to personalize your account
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="w-4 h-4" />
                      Upload Photo
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={removeAvatar}
                      disabled={uploading || !profile?.profile_photo_url}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    JPG, PNG or GIF. Max size 5MB.
                  </div>
                </div>
              </div>
            </Row>
            <Row label="Verification Status">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                  profile?.kyc_status === 'verified' 
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-500'
                }`}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {profile?.kyc_status === 'verified' ? 'Verified · Level 2' : 'Unverified'}
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
                defaultOn
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
                            <div className="text-xs font-medium text-foreground">{device.device_name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              Last login: {new Date(device.last_login).toLocaleDateString()} at {new Date(device.last_login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_oklch(0.65_0.14_165_/_0.5)]" />
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground italic">No authorized devices detected.</div>
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
                <SheetContent side="right" className="w-full sm:max-w-md border-l border-border/40 bg-card/95 backdrop-blur-xl p-0">
                  <SheetHeader className="p-8 border-b border-border/20">
                    <SheetTitle className="font-serif text-2xl">Device Management</SheetTitle>
                    <SheetDescription className="text-muted-foreground">
                      Review and manage all devices currently authorized to access your Vault OS account.
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
                                <div className="text-sm font-medium text-foreground">{device.device_name}</div>
                                <div className="text-[11px] text-muted-foreground uppercase tracking-tight">Active Session</div>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-500">
                              <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                              Live
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/10">
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">First Seen</div>
                              <div className="text-xs text-foreground/80">
                                {new Date(device.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">Last Activity</div>
                              <div className="text-xs text-foreground/80">
                                {new Date(device.last_login).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
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
                      Revoking a device will immediately sign it out and require a new secure PIN verification to re-authorize.
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

          {/* Preferences */}
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
                <ToggleRow label="Transfer received" defaultOn />
                <ToggleRow label="Account login" />
                <ToggleRow label="Transfer sent" defaultOn />
                <ToggleRow label="Security alerts" defaultOn />
              </div>
            </div>
          </SectionCard>

          {/* Activity */}
          <SectionCard icon={ScrollText} title="Recent Activity">
            <ul className="divide-y divide-border/40">
              {logs.length > 0 ? (
                logs.slice(0, 4).map((item) => (
                  <li key={item.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                    <div>
                      <div className="text-sm text-foreground capitalize">
                        {item.action_type.replace('_', ' ')}
                        {item.device_info && <span className="text-muted-foreground/60 text-xs ml-2">via {item.device_info}</span>}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground/70">
                        {new Date(item.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <div className="py-4 text-sm text-muted-foreground italic">No recent activity recorded.</div>
              )}
            </ul>
            
            <ActivityLogDrawer logs={logs}>
              <button className="w-full text-center text-xs text-primary hover:text-primary/80 pt-4 transition-colors">
                View full activity log →
              </button>
            </ActivityLogDrawer>
          </SectionCard>
        </div>

        {/* Footer actions */}
        <div className="mt-12 lg:mt-16 flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border/40">
          <div className="text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Vault OS synced — all ledger records current
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-muted-foreground">
              Discard
            </Button>
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Apply & Save Changes
            </Button>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
