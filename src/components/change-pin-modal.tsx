import React, { useState } from "react";
import { supabase } from "@/api/supabase";
import { toast } from "sonner";
import { ShieldCheck, Lock, Key, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/**
 * Helper to hash the PIN using SHA-256 (Web Standard)
 * Matches the mobile app's hashing implementation
 */
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export function ChangePinModal({ isOpen, onClose, userEmail }: ChangePinModalProps) {
  const [step, setStep] = useState<"input" | "otp" | "success">("input");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    currentPin: "",
    newPin: "",
    confirmPin: "",
    otp: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value.length > 6 && name !== "otp") return;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleVerifyCurrentAndTriggerOtp = async () => {
    if (form.newPin !== form.confirmPin) {
      return toast.error("New PINs do not match.");
    }
    if (form.newPin.length !== 6) {
      return toast.error("PIN must be exactly 6 digits.");
    }

    setLoading(true);
    try {
      // 1. Hash the current PIN for verification
      const hashedCurrent = await hashPin(form.currentPin);

      // 2. Call RPC to verify without exposing our hash to the client
      const { data: isValid, error: rpcError } = await supabase.rpc("verify_current_pin", {
        provided_pin_hash: hashedCurrent,
      });

      if (rpcError || !isValid) {
        throw new Error("The current PIN you entered is incorrect.");
      }

      // 3. Trigger OTP via Reset Password flow
      const { error: otpError } = await supabase.auth.resetPasswordForEmail(userEmail);
      if (otpError) throw otpError;

      setStep("otp");
      toast.success("Verification code sent to your email.");
    } catch (error: any) {
      toast.error(error.message || "Failed to initiate PIN change.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndSave = async () => {
    if (form.otp.length !== 6) return toast.error("Enter the 6-digit code.");

    setLoading(true);
    try {
      // 1. Verify the OTP
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: userEmail,
        token: form.otp,
        type: "recovery",
      });

      if (verifyError) throw verifyError;

      // 2. Hash the new PIN
      const hashedNew = await hashPin(form.newPin);

      // 3. Update the profile securely
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No active session.");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ pin_hash: hashedNew })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setStep("success");
      toast.success("Secure PIN updated successfully.");
    } catch (error: any) {
      toast.error(error.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setStep("input");
    setForm({ currentPin: "", newPin: "", confirmPin: "", otp: "" });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
      <DialogContent className="sm:max-w-[420px] bg-card/95 backdrop-blur-xl border-emerald-500/20 shadow-2xl">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-full ${step === 'success' ? 'bg-emerald-500/10' : 'bg-primary/10'}`}>
              {step === "input" && <Lock className="h-8 w-8 text-primary" />}
              {step === "otp" && <ShieldCheck className="h-8 w-8 text-emerald-500" />}
              {step === "success" && <CheckCircle2 className="h-8 w-8 text-emerald-500" />}
            </div>
          </div>
          <DialogTitle className="text-center text-2xl font-serif">
            {step === "input" && "Change Secure PIN"}
            {step === "otp" && "Verify Update"}
            {step === "success" && "PIN Updated"}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            {step === "input" && "Verify your current PIN to set a new one."}
            {step === "otp" && `We've sent a 6-digit code to ${userEmail}`}
            {step === "success" && "Your atomic security credentials have been updated."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === "input" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Current PIN</label>
                <Input
                  name="currentPin"
                  type="password"
                  placeholder="••••••"
                  maxLength={6}
                  value={form.currentPin}
                  onChange={handleInputChange}
                  className="text-center text-lg tracking-[0.5em] h-12"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New 6-Digit PIN</label>
                <Input
                  name="newPin"
                  type="password"
                  placeholder="••••••"
                  maxLength={6}
                  value={form.newPin}
                  onChange={handleInputChange}
                  className="text-center text-lg tracking-[0.5em] h-12"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm New PIN</label>
                <Input
                  name="confirmPin"
                  type="password"
                  placeholder="••••••"
                  maxLength={6}
                  value={form.confirmPin}
                  onChange={handleInputChange}
                  className="text-center text-lg tracking-[0.5em] h-12"
                />
              </div>
              <Button
                onClick={handleVerifyCurrentAndTriggerOtp}
                disabled={loading || form.newPin.length !== 6}
                className="w-full h-12 bg-primary text-primary-foreground font-semibold"
              >
                {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                Send Verification Code
              </Button>
            </>
          )}

          {step === "otp" && (
            <>
              <div className="space-y-4">
                <Input
                  name="otp"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={form.otp}
                  onChange={handleInputChange}
                  className="text-center text-3xl font-mono tracking-[0.3em] h-16 border-emerald-500/50 focus:ring-emerald-500"
                />
                <Button
                  onClick={handleVerifyOtpAndSave}
                  disabled={loading || form.otp.length !== 6}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : "Verify & Confirm Update"}
                </Button>
                <p className="text-xs text-center text-muted-foreground italic">
                  Didn't receive a code? Check your spam or try again in a few minutes.
                </p>
              </div>
            </>
          )}

          {step === "success" && (
            <Button
              onClick={resetAndClose}
              className="w-full h-12 bg-emerald-500 text-white font-semibold"
            >
              Return to Settings
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
