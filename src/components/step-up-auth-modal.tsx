import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2, Mail, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/api/supabase";
import { toast } from "sonner";

interface StepUpAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  purpose?: string;
  description?: string;
}

export function StepUpAuthModal({
  isOpen,
  onClose,
  onVerified,
  purpose = "verification",
  description = "A verification code has been sent to your registered email address for added security.",
}: StepUpAuthModalProps) {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (isOpen && resendTimer === 0) {
      handleSendOtp();
    }
  }, [isOpen]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleSendOtp = async () => {
    setIsSending(true);
    setError(null);
    try {
      const { data, error: functionError } = await supabase.functions.invoke("step-up-auth", {
        body: { action: "send", purpose },
      });

      if (functionError) throw functionError;
      if (data.error) throw new Error(data.error);

      toast.success("Verification code sent to your email");
      setResendTimer(60); // 60 seconds cooldown
    } catch (err: any) {
      console.error("Error sending OTP:", err);
      setError(err.message || "Failed to send verification code");
      toast.error("Failed to send verification code");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async (value: string) => {
    if (value.length !== 6) return;

    setIsVerifying(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke("step-up-auth", {
        body: { action: "verify", code: value },
      });

      if (functionError) throw functionError;
      if (data.error) throw new Error(data.error);

      toast.success("Security verification successful", {
        icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
      });
      onVerified();
      onClose();
    } catch (err: any) {
      console.error("OTP verification error:", err);
      setError(err.message || "Invalid or expired code");
      setCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !isVerifying && onClose()}>
      <DialogContent className="sm:max-w-[420px] bg-background/95 backdrop-blur-2xl border-border/40 p-0 overflow-hidden">
        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6 shadow-inner ring-1 ring-primary/20">
            <Mail className="w-8 h-8" />
          </div>

          <DialogHeader className="mb-8 space-y-2">
            <DialogTitle className="text-2xl font-bold tracking-tight">Step-up Security</DialogTitle>
            <DialogDescription className="text-muted-foreground leading-relaxed">
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="w-full space-y-8">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(val) => {
                  setCode(val);
                  if (val.length === 6) handleVerify(val);
                }}
                disabled={isVerifying || isSending}
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

            <div className="flex flex-col items-center gap-4">
              {isVerifying ? (
                <div className="flex items-center justify-center gap-2 text-primary text-sm font-bold py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying Identity...
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={resendTimer > 0 || isSending}
                  onClick={handleSendOtp}
                  className="text-xs uppercase tracking-widest font-black flex items-center gap-2"
                >
                  {isSending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend Code"}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-primary/5 p-4 text-center border-t border-primary/10 flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Secure Multi-Factor Authentication
        </div>
      </DialogContent>
    </Dialog>
  );
}
