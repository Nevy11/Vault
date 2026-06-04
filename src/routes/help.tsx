import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/api/supabase";
import {
  ArrowLeft,
  ShieldCheck,
  HelpCircle,
  Settings as SettingsIcon,
  Phone,
  MessageSquare,
  Mail,
  ChevronDown,
  Send,
  LifeBuoy,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppShell } from "@/components/app-shell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & Support — Vault OS" },
      { name: "description", content: "Get help, browse FAQs, and contact Vault OS support." },
    ],
  }),
  component: HelpPage,
});

function SectionCard({
  icon: Icon,
  title,
  meta,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="group relative overflow-hidden rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md p-8 sm:p-10 shadow-xl transition-all hover:bg-card/70 hover:border-primary/20">
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/5 blur-3xl transition-all group-hover:bg-primary/10" />

      <header className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between pb-8 mb-10 border-b border-border/20">
        <div className="flex items-center gap-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-inner group-hover:scale-110 transition-transform">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-[0.15em] uppercase text-foreground">
              {title}
            </h2>
            {meta && <p className="mt-1 text-xs text-muted-foreground/80 font-medium">{meta}</p>}
          </div>
        </div>
      </header>
      <div className="relative z-10">{children}</div>
    </section>
  );
}

function HelpPage() {
  const { t } = useTranslation();
  const [selectedChannel, setSelectedChannel] = useState("call");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [agreed, setAgreed] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Call Workflow State
  const [showCallWorkflow, setShowCallWorkflow] = useState(false);
  const [callbackNumber, setCallbackNumber] = useState("");
  const [isRequestingCallback, setIsRequestingCallback] = useState(false);

  const channels = [
    {
      id: "call",
      icon: Phone,
      title: t("help.sections.contact.call.title"),
      detail: "+254 721 735 254",
      note: t("help.sections.contact.call.note"),
    },
    {
      id: "email",
      icon: Mail,
      title: t("help.sections.contact.email.title"),
      detail: "alphine886@gmail.com",
      note: t("help.sections.contact.email.note"),
    },
  ];

  const faqs = [
    {
      q: t("help.sections.faqs.q1"),
      a: t("help.sections.faqs.a1"),
    },
    {
      q: t("help.sections.faqs.q2"),
      a: t("help.sections.faqs.a2"),
    },
    {
      q: t("help.sections.faqs.q3"),
      a: t("help.sections.faqs.a3"),
    },
    {
      q: t("help.sections.faqs.q4"),
      a: t("help.sections.faqs.a4"),
    },
    {
      q: t("help.sections.faqs.q5"),
      a: t("help.sections.faqs.a5"),
    },
  ];

  const handleRequestCallback = async () => {
    if (!callbackNumber.trim()) {
      toast.error("Please enter a valid phone number for the callback.");
      return;
    }
    setIsRequestingCallback(true);
    try {
      // Simulate backend processing
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success(t("help.sections.contact.call.dialog.toast_scheduled"));
      setShowCallWorkflow(false);
      setCallbackNumber("");
    } catch (err) {
      toast.error("Failed to schedule callback. Please try calling directly.");
    } finally {
      setIsRequestingCallback(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !message.trim()) {
      toast.error(t("help.sections.form.toast_error"));
      return;
    }

    if (!agreed) {
      toast.error(t("help.sections.form.toast_agree_error"));
      return;
    }

    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-support-email", {
        body: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          message: message.trim(),
        },
      });

      if (error) {
        throw error;
      }

      if (!data || (typeof data === "object" && (data as any).success === false)) {
        const info = (data as any) || {};
        const msg = info.error || info.body || "Failed to send support message.";
        throw new Error(msg);
      }

      toast.success(t("help.sections.form.toast_success"));
      setFirstName("");
      setLastName("");
      setEmail("");
      setMessage("");
      setAgreed(false);
    } catch (error: any) {
      console.error("Help form error:", error);
      toast.error(error?.message || "Unable to send your message. Please try again later.");
    } finally {
      setIsSending(false);
    }
  };

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
            {t("help.back")}
          </Link>
          <div className="mt-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h1 className="font-serif text-4xl lg:text-5xl tracking-tight">
                {t("help.title")} <span className="text-muted-foreground/60">&</span>{" "}
                {t("help.support")}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground max-w-xl leading-relaxed">
                {t("help.description")}
              </p>
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("help.search_placeholder")}
                className="pl-10 h-11 bg-card/40 border-border/60"
              />
            </div>
          </div>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-8 lg:gap-10">
          {/* Left column */}
          <div className="space-y-8 lg:space-y-10">
            <SectionCard
              icon={ShieldCheck}
              title={t("help.sections.contact.title")}
              meta={t("help.sections.contact.meta")}
            >
              <div className="space-y-3">
                {channels.map((c) => {
                  const Icon = c.icon;
                  const active = selectedChannel === c.id;
                  const isEmail = c.id === "email";

                  return (
                    <div
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedChannel(c.id);
                        if (c.id === "call") {
                          setShowCallWorkflow(true);
                        } else if (c.id === "email") {
                          window.location.href = `mailto:alphine886@gmail.com?subject=Vault.OS Support Request`;
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setSelectedChannel(c.id);
                          if (c.id === "call") setShowCallWorkflow(true);
                          if (c.id === "email") {
                            window.location.href = `mailto:alphine886@gmail.com?subject=Vault.OS Support Request`;
                          }
                        }
                      }}
                      className={`w-full flex items-center gap-4 rounded-2xl border px-6 py-5 text-left transition-all duration-300 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/50 ${
                        active
                          ? "border-emerald-600 bg-emerald-600/10 shadow-[0_0_25px_rgba(5,150,105,0.15)] ring-1 ring-emerald-600/50 scale-[1.02]"
                          : "border-border/40 bg-input/10 opacity-50 grayscale-[0.4] hover:opacity-70 hover:grayscale-0"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                          active
                            ? "border-emerald-600 bg-emerald-600 shadow-[0_0_10px_rgba(5,150,105,0.4)]"
                            : "border-muted-foreground/30 bg-transparent"
                        }`}
                      >
                        {active && <span className="h-2.5 w-2.5 rounded-full bg-white shadow-sm" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-bold tracking-tight transition-colors ${active ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {c.title}
                        </div>
                        <div className="mt-1 text-xs truncate">
                          {isEmail ? (
                            <a
                              href={`mailto:alphine886@gmail.com?subject=Vault.OS Support Request`}
                              className={`transition-colors font-medium ${active ? "text-emerald-500 hover:text-emerald-400 underline decoration-emerald-500/30 underline-offset-4" : "text-muted-foreground"}`}
                            >
                              {c.detail}
                            </a>
                          ) : (
                            <span
                              className={
                                active ? "text-foreground/90 font-medium" : "text-muted-foreground"
                              }
                            >
                              {c.detail}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div
                          className={`p-2 rounded-lg transition-colors ${active ? "bg-emerald-600/20 text-emerald-500" : "bg-muted/10 text-muted-foreground/40"}`}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <span
                          className={`text-[9px] uppercase tracking-widest font-black ${active ? "text-emerald-500/80" : "text-muted-foreground/40"}`}
                        >
                          {c.note}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard
              icon={LifeBuoy}
              title={t("help.sections.faqs.title")}
              meta={t("help.sections.faqs.meta")}
            >
              <div className="space-y-3">
                {faqs.map((f, i) => {
                  const open = openFaq === i;
                  return (
                    <div
                      key={i}
                      className={`rounded-xl border transition-colors ${
                        open
                          ? "border-primary/30 bg-primary/[0.03]"
                          : "border-border/40 bg-input/20"
                      }`}
                    >
                      <button
                        onClick={() => setOpenFaq(open ? null : i)}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                      >
                        <span className="text-sm text-foreground">{f.q}</span>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            open ? "rotate-180 text-primary" : ""
                          }`}
                        />
                      </button>
                      {open && (
                        <div className="px-5 pb-5 -mt-1 text-sm text-muted-foreground leading-relaxed">
                          {f.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>

          {/* Right column — Contact form */}
          <SectionCard
            icon={Mail}
            title={t("help.sections.form.title")}
            meta={t("help.sections.form.meta")}
          >
            <form className="space-y-7" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">
                    {t("help.sections.form.first_name")}
                  </label>
                  <Input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="Alex"
                    className="h-11 bg-input/40 border-border/60"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">
                    {t("help.sections.form.last_name")}
                  </label>
                  <Input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Johnson"
                    className="h-11 bg-input/40 border-border/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  {t("help.sections.form.email")}
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="alex@example.com"
                  className="h-11 bg-input/40 border-border/60"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm text-muted-foreground">
                    {t("help.sections.form.message")}
                  </label>
                  <span className="text-xs text-muted-foreground/60">{message.length} / 1000</span>
                </div>
                <textarea
                  rows={6}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={t("help.sections.form.message_placeholder")}
                  className="w-full rounded-md border border-border/60 bg-input/40 px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border/60 bg-input/40 accent-primary"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {t("help.sections.form.agree")}
                </span>
              </label>

              <Button
                type="submit"
                disabled={
                  !agreed ||
                  isSending ||
                  !firstName.trim() ||
                  !lastName.trim() ||
                  !email.trim() ||
                  !message.trim()
                }
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed gap-2"
              >
                <Send className="h-4 w-4" />
                {isSending ? t("help.sections.form.sending") : t("help.sections.form.submit")}
              </Button>
            </form>
          </SectionCard>
        </div>

        {/* Footer */}
        <div className="mt-12 lg:mt-16 pt-8 border-t border-border/40 text-center">
          <p className="text-xs text-muted-foreground">
            {t("help.footer_note")} <span className="text-foreground">+254 721 735 254</span>
          </p>
        </div>

        {/* Call Workflow Dialog */}
        <Dialog open={showCallWorkflow} onOpenChange={setShowCallWorkflow}>
          <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border/40 rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif">
                {t("help.sections.contact.call.dialog.title")}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {t("help.sections.contact.call.dialog.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="rounded-2xl border border-border/40 bg-input/20 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">+254 721 735 254</div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-widest">
                      {t("help.sections.contact.call.dialog.direct")}
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full mt-4 h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
                  onClick={() => (window.location.href = "tel:+254721735254")}
                >
                  {t("help.sections.contact.call.btn")}
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border/40" />
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold">
                    {t("help.sections.contact.call.dialog.callback_note")}
                  </span>
                  <div className="h-px flex-1 bg-border/40" />
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="+254..."
                    value={callbackNumber}
                    onChange={(e) => setCallbackNumber(e.target.value)}
                    className="h-11 bg-input/40 border-border/60 rounded-xl"
                  />
                  <Button
                    className="h-11 rounded-xl px-6 transition-all active:scale-95"
                    onClick={handleRequestCallback}
                    disabled={isRequestingCallback}
                  >
                    {isRequestingCallback ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      t("help.sections.contact.call.dialog.callback_btn")
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground italic text-center leading-relaxed">
                  {t("help.sections.contact.call.dialog.priority_note")}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </AppShell>
  );
}
