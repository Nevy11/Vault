import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/api/supabase";
import { QRCodeSVG } from "qrcode.react";
import {
  ShieldCheck,
  ArrowRight,
  User,
  Smartphone,
  Zap,
  CheckCircle2,
  Loader2,
  Info,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pay/$username")({
  component: PaymentPortal,
});

interface MerchantProfile {
  id: string;
  first_name: string;
  last_name: string;
  kyc_tag: string;
  profile_photo_url: string | null;
  business?: {
    business_name: string;
    business_category: string;
  } | null;
}

function PaymentPortal() {
  const { username } = useParams({ from: "/pay/$username" });
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "success">("idle");
  const [method, setMethod] = useState<"vault" | "mpesa">("vault");

  const cleanUsername = username.replace("@", "").toLowerCase();
  const paymentLink = `${window.location.origin}/pay/@${cleanUsername}`;

  useEffect(() => {
    async function fetchMerchant() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(
            `
            id, 
            first_name, 
            last_name, 
            kyc_tag, 
            profile_photo_url,
            merchants (business_name, business_category)
          `,
          )
          .eq("kyc_tag", `@${cleanUsername}`)
          .single();

        if (error || !data) throw new Error("Merchant not found");

        setMerchant({
          id: data.id,
          first_name: data.first_name,
          last_name: data.last_name,
          kyc_tag: data.kyc_tag,
          profile_photo_url: data.profile_photo_url,
          business: (data.merchants as any)?.[0] || null,
        });
      } catch (err) {
        console.error(err);
        toast.error("Could not find this merchant profile.");
      } finally {
        setLoading(false);
      }
    }
    fetchMerchant();
  }, [cleanUsername]);

  const handlePay = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setStatus("processing");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to login with intent
        toast.info("Please sign in to complete your Vault payment.");
        window.location.href = `/login?redirect=/pay/@${cleanUsername}&amount=${amount}`;
        return;
      }

      // If user is logged in, perform a standard transfer
      const { data, error: rpcError } = await supabase.rpc("vault_transfer", {
        p_sender_id: user.id,
        p_recipient_tag: `@${cleanUsername}`,
        p_amount: parseFloat(amount),
      });

      if (rpcError) throw rpcError;

      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.success) throw new Error(result?.message || "Payment failed");

      setStatus("success");
      toast.success("Payment completed successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An unexpected error occurred");
      setStatus("idle");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="mt-4 text-muted-foreground animate-pulse font-medium">
          Locating Merchant Vault...
        </p>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-6">
          <User className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-light mb-2">Merchant Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The username @{cleanUsername} does not appear to be a valid Vault OS account.
        </p>
        <Button asChild variant="outline" className="rounded-2xl h-12 px-8">
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 mb-8">
          <CheckCircle2 className="w-16 h-16" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Payment Successful!</h1>
        <p className="text-muted-foreground mb-12 max-w-sm">
          You have successfully sent{" "}
          <span className="text-foreground font-semibold">
            ${parseFloat(amount).toLocaleString()}
          </span>{" "}
          to{" "}
          <span className="text-foreground font-semibold">
            {merchant.business?.business_name || merchant.first_name}
          </span>
          .
        </p>
        <div className="bg-card/40 border border-border/50 rounded-3xl p-8 w-full max-w-md backdrop-blur-xl mb-12">
          <div className="flex justify-between text-sm mb-4">
            <span className="text-muted-foreground">Recipient</span>
            <span className="font-medium">@{cleanUsername}</span>
          </div>
          <div className="flex justify-between text-sm mb-4">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-mono text-primary">${parseFloat(amount).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className="text-emerald-500 font-bold uppercase tracking-tighter">Completed</span>
          </div>
        </div>
        <Button asChild className="rounded-2xl h-14 px-12 text-lg">
          <Link to="/dashboard">Back to My Vault</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse [animation-delay:2s]" />
      </div>

      <main className="relative z-10 max-w-screen-xl mx-auto px-6 py-12 lg:py-24 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-16 items-center">
        {/* Left Side: QR & Link */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-12">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-[0.2em]">
              <ShieldCheck className="w-4 h-4" /> Secure Vault Payment
            </div>
            <h1 className="text-5xl lg:text-7xl font-black tracking-tight text-balance leading-none">
              Pay{" "}
              <span className="text-primary">
                {merchant.business?.business_name || merchant.first_name}
              </span>{" "}
              instantly.
            </h1>
            <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
              Scan the dynamic QR code or use the link below to send secure funds directly to{" "}
              {merchant.kyc_tag}.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-8 w-full max-w-lg">
            <div className="p-6 rounded-[40px] bg-white border border-border shadow-2xl shadow-primary/10 transition-transform hover:scale-105 duration-500">
              <QRCodeSVG
                value={paymentLink}
                size={220}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: "/v-logo.svg",
                  x: undefined,
                  y: undefined,
                  height: 48,
                  width: 48,
                  excavate: true,
                }}
              />
            </div>
            <div className="flex-1 space-y-4 w-full">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold ml-1">
                  Direct Payment Link
                </Label>
                <div className="relative group">
                  <Input
                    readOnly
                    value={paymentLink}
                    className="bg-card/40 border-border/60 h-12 pr-12 text-sm font-medium rounded-2xl transition-all group-hover:border-primary/40"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(paymentLink);
                      toast.success("Link copied to clipboard!");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:scale-110 transition-transform font-bold text-xs"
                  >
                    COPY
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-[10px] text-muted-foreground leading-tight">
                  Funds are settled <span className="text-emerald-500 font-bold">Instantly</span> in
                  the merchant's vault with Zero-Trust protection.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Payment Form */}
        <div className="w-full">
          <div className="bg-card/40 border border-border/50 rounded-[48px] p-10 backdrop-blur-2xl shadow-2xl space-y-10 relative overflow-hidden group">
            {/* Profile Card Overlay */}
            <div className="flex items-center gap-5 p-6 rounded-3xl bg-background/40 border border-border/40 shadow-inner relative z-10">
              <Avatar className="w-16 h-16 border-2 border-primary/20 shadow-xl group-hover:scale-110 transition-transform duration-500">
                <AvatarImage src={merchant.profile_photo_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {merchant.first_name[0]}
                  {merchant.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-xl font-bold truncate">
                  {merchant.business?.business_name ||
                    `${merchant.first_name} ${merchant.last_name}`}
                </div>
                <div className="text-sm text-primary font-mono">{merchant.kyc_tag}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Verified Vault Business
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-8 relative z-10">
              <div className="space-y-4">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground font-black ml-1">
                  Payment Method
                </Label>
                <div className="grid grid-cols-2 gap-3 p-1.5 bg-background/60 border border-border/60 rounded-3xl">
                  <button
                    onClick={() => setMethod("vault")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-4 rounded-[20px] text-sm font-bold transition-all",
                      method === "vault"
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "text-muted-foreground hover:bg-white/5",
                    )}
                  >
                    <ShieldCheck className="w-4 h-4" /> Vault Wallet
                  </button>
                  <button
                    onClick={() => setMethod("mpesa")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-4 rounded-[20px] text-sm font-bold transition-all",
                      method === "mpesa"
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                        : "text-muted-foreground hover:bg-white/5",
                    )}
                  >
                    <Smartphone className="w-4 h-4" /> M-Pesa
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground font-black ml-1">
                  Payment Amount (USD)
                </Label>
                <div className="relative group">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-4xl font-light text-muted-foreground/40 group-focus-within:text-primary transition-colors">
                    $
                  </span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="pl-14 h-24 bg-background/40 border-border/60 rounded-[32px] text-5xl font-light tracking-tight focus:ring-primary/20 focus:border-primary/40 transition-all"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="flex justify-between items-center px-2">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    Available Rails
                  </div>
                  <div className="flex gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                    <div className="w-6 h-6 rounded-md bg-white border p-1">
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="w-6 h-6 rounded-md bg-emerald-600 p-1 flex items-center justify-center text-[8px] font-black text-white">
                      M
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handlePay}
                disabled={status === "processing"}
                className={cn(
                  "w-full h-20 rounded-[32px] text-xl font-bold shadow-2xl transition-all group active:scale-95",
                  method === "vault"
                    ? "bg-primary hover:bg-primary/90 shadow-primary/30"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30",
                )}
              >
                {status === "processing" ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <>
                    Confirm Payment{" "}
                    <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] pt-4 border-t border-border/40">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-emerald-500" /> SSL
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" /> AES-256
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-emerald-500" /> INSTANT
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Info className="w-4 h-4" />
            New to Vault?{" "}
            <Link to="/sign-up" className="text-primary font-bold hover:underline">
              Create your secure wallet in 60 seconds.
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
