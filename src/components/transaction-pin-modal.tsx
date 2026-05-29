import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { supabase } from "@/api/supabase";
import { hashPin } from "@/lib/utils";
import { toast } from "sonner";

interface TransactionPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  title?: string;
  description?: string;
}

export function TransactionPinModal({
  isOpen,
  onClose,
  onVerified,
  title = "Verify Transaction",
  description = "Enter your 6-digit secure transaction PIN to authorize this request.",
}: TransactionPinModalProps) {
  const [pin, setPin] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (value: string) => {
    if (value.length !== 6) return;

    setIsVerifying(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("pin_hash")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) throw new Error("Failed to retrieve security profile");

      const hashedPin = await hashPin(value);
      if (profile.pin_hash !== hashedPin) {
        setError("Incorrect transaction PIN. Please try again.");
        setPin("");
        return;
      }

      // Success!
      toast.success("Identity verified securely", {
        icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
      });
      onVerified();
      onClose();
    } catch (err: any) {
      console.error("PIN verification error:", err);
      setError(err.message || "An error occurred during verification");
      setPin("");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !isVerifying && onClose()}>
      <DialogContent className="sm:max-w-[400px] bg-background/95 backdrop-blur-2xl border-border/40 p-0 overflow-hidden">
        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 shadow-inner ring-1 ring-primary/20">
            <Lock className="w-8 h-8" />
          </div>

          <DialogHeader className="mb-8 space-y-2">
            <DialogTitle className="text-2xl font-bold tracking-tight">{title}</DialogTitle>
            <DialogDescription className="text-muted-foreground leading-relaxed">
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="w-full space-y-8">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                type="password"
                value={pin}
                onChange={(val) => {
                  setPin(val);
                  if (val.length === 6) handleVerify(val);
                }}
                disabled={isVerifying}
                autoFocus
              >
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="w-12 h-16 text-2xl font-bold border-border/60 bg-card/40 rounded-xl focus:ring-primary/30"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {error && (
              <div className="flex items-center justify-center gap-2 text-destructive text-sm font-medium animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {isVerifying ? (
              <div className="flex items-center justify-center gap-2 text-primary text-sm font-bold py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Validating Security Hash...
              </div>
            ) : (
              <Button
                variant="link"
                className="text-muted-foreground hover:text-primary transition-colors text-xs uppercase tracking-widest font-black"
                onClick={() => toast.info("Contact support to reset your transaction PIN.")}
              >
                Forgot PIN?
              </Button>
            )}
          </div>
        </div>

        <div className="bg-primary/5 p-4 text-center border-t border-primary/10 flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Vault 256-bit AES Encryption Active
        </div>
      </DialogContent>
    </Dialog>
  );
}
