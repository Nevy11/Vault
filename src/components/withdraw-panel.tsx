import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Smartphone, 
  Plus, 
  Check, 
  Info, 
  ArrowRight, 
  Loader2, 
  CheckCircle2,
  Lock,
  ChevronDown,
  Search,
  Landmark,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, hashPin } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { Link } from '@tanstack/react-router';
import { useWalletBalance } from '@/hooks/use-wallet-balance';

import { useProfileSignal } from '@/lib/profile-signal';

// Mock Data
const SAVED_BANKS = [
  { id: 'b1', name: 'Chase Bank', accountNumber: '****6789', holder: 'John Doe', logo: 'CB', color: 'bg-blue-600' },
  { id: 'b2', name: 'Bank of America', accountNumber: '****1234', holder: 'John Doe', logo: 'BA', color: 'bg-red-600' },
];

const BANKS_LIST = [
  "KCB Bank (Kenya Commercial Bank)",
  "Co-operative Bank of Kenya",
  "NCBA Bank",
  "Absa Bank Kenya",
  "Standard Chartered Kenya",
  "Stanbic Bank Kenya",
  "I&M Bank",
  "DTB (Diamond Trust Bank)",
  "Family Bank",
  "Chase Bank",
  "Bank of America"
];

const EXCHANGE_RATE = 130.00;
const PLATFORM_FEE = 1.50; // USD

type Channel = 'bank' | 'mobile';
type WithdrawalStatus = 'idle' | 'confirming' | 'processing' | 'success';

export function WithdrawPanel() {
  const [profile] = useProfileSignal();
  const { balance, currency, loading, updateBalance } = useWalletBalance();
  const [amount, setAmount] = useState<string>("");
  const [channel, setChannel] = useState<Channel>('bank');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<WithdrawalStatus>('idle');
  const [refCode, setRefCode] = useState("");

  const [selectedMobileId, setSelectedMobileId] = useState<string | null>('m1');
  const [newMobile, setNewMobile] = useState({ provider: "M-Pesa", phone: "" });
  const [isAddingMobile, setIsAddingMobile] = useState(false);

  // Mobile Recipient logic
  const SAVED_MOBILE = useMemo(() => {
    const phoneNumber = profile?.phone_number || 'No number set';
    return [
      { id: 'm1', name: 'Personal M-Pesa', phone: phoneNumber, provider: 'M-Pesa', color: 'bg-emerald-600' },
      { id: 'm2', name: 'Secondary Line', phone: '+254 7XX XXX XXX', provider: 'Airtel Money', color: 'bg-red-500' },
    ];
  }, [profile]);

  // Bank Form States
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [bankAccount, setBankAccount] = useState("");
  const [bankHolder, setBankHolder] = useState("");

  const kesEquivalent = useMemo(() => {
    const val = parseFloat(amount || "0");
    return val * EXCHANGE_RATE;
  }, [amount]);

  const totalDeduction = useMemo(() => {
    return parseFloat(amount || "0") + PLATFORM_FEE;
  }, [amount]);

  const handleWithdrawClick = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (balance !== null && parseFloat(amount) > balance) {
      toast.error("Insufficient balance");
      return;
    }

    if (channel === 'bank') {
      if (!selectedBank || !bankAccount || !bankHolder) {
        toast.error("Please fill in all bank account details");
        return;
      }
    } else {
      if (!selectedMobileId && (!isAddingMobile || !newMobile.phone)) {
        toast.error("Please select or enter a mobile wallet number");
        return;
      }
    }

    if (pin.length < 4) {
      toast.error("Please enter your transaction PIN");
      return;
    }

    try {
      // Get User ID (either from profile signal or directly from auth)
      let userId = profile?.id;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      }

      if (!userId) {
        throw new Error("User session not found. Please log in again.");
      }

      // Verify Vault PIN
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("pin_hash")
        .eq("id", userId)
        .single();

      if (profileError || !profileData) {
        console.error("Profile fetch error:", profileError);
        throw new Error("Could not verify your identity. Please try again.");
      }

      const hashedPin = await hashPin(pin);
      if (profileData.pin_hash !== hashedPin) {
        throw new Error("Incorrect transaction PIN");
      }

      setStatus('confirming');
    } catch (error: any) {
      console.error("Withdrawal verification error:", error);
      toast.error(error.message || "An error occurred during verification");
    }
  };

  const handleConfirmWithdraw = async () => {
    setStatus('processing');
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Update the wallet balance
      if (balance !== null) {
        const newBalance = Math.max(0, balance - totalDeduction);
        await updateBalance(newBalance);
      }
      
      setRefCode(`WTH-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
      setStatus('success');
      toast.success("Withdrawal request authorized successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process withdrawal");
      setStatus('idle');
    }
  };

  const getRecipientName = () => {
    if (channel === 'bank') return selectedBank || "Bank Account";
    if (isAddingMobile) return newMobile.provider;
    return SAVED_MOBILE.find(m => m.id === selectedMobileId)?.name || "Mobile Wallet";
  };

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-6">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Withdrawal Successful!</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Funds are processing into your account. Most transfers complete within 2-24 hours.
        </p>
        
        <div className="bg-card/40 border border-border/50 rounded-2xl p-6 w-full max-w-sm mb-8 backdrop-blur-sm">
          <div className="flex justify-between mb-3 text-sm">
            <span className="text-muted-foreground">Transaction ID</span>
            <span className="font-mono font-medium">{refCode}</span>
          </div>
          <div className="flex justify-between mb-3 text-sm">
            <span className="text-muted-foreground">Amount Withdrawn</span>
            <span className="font-medium">${parseFloat(amount).toLocaleString()}</span>
          </div>
          <div className="flex justify-between mb-3 text-sm">
            <span className="text-muted-foreground">KES Equivalent</span>
            <span className="font-medium">KES {kesEquivalent.toLocaleString()}</span>
          </div>
          <div className="flex justify-between mb-3 text-sm">
            <span className="text-muted-foreground">Destination</span>
            <span className="font-medium">{getRecipientName()}</span>
          </div>
          <div className="border-t border-border/50 pt-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className="text-primary font-medium">Processing</span>
          </div>
        </div>
        
        <Button variant="outline" className="w-full max-w-xs" asChild>
          <Link to="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
      {/* LEFT PANEL: RECIPIENT SELECTION */}
      <div className="rounded-3xl border border-border/50 bg-card/30 p-8 flex flex-col backdrop-blur-sm">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-light tracking-tight">
            {channel === 'bank' && "Withdraw to Bank Account"}
            {channel === 'mobile' && "Withdraw to Mobile Wallet"}
          </h2>
          <div className="flex p-1 bg-background/60 border border-border/60 rounded-2xl">
            {[
              { id: 'bank', label: 'Bank Accounts', icon: Building2 },
              { id: 'mobile', label: 'Mobile Money', icon: Smartphone },
            ].map((t) => {
              const ActiveIcon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setChannel(t.id as Channel);
                    setSelectedId(null);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all",
                    channel === t.id 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ActiveIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-[300px] animate-in slide-in-from-left-4 duration-500">
          {/* Conditional Content */}
          {channel === 'bank' && (
            <div className="space-y-8">
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Choose Bank</Label>
                <Select value={selectedBank || ""} onValueChange={setSelectedBank}>
                  <SelectTrigger className="h-14 bg-background/40 border-border/60 rounded-2xl text-base shadow-sm">
                    <SelectValue placeholder="Search or select a bank..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/50 shadow-xl max-h-[300px]">
                    {BANKS_LIST.map(b => (
                      <SelectItem key={b} value={b} className="rounded-xl py-3 px-4 focus:bg-primary/10">
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBank && (
                <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-4 p-5 rounded-2xl border border-primary/20 bg-primary/5 ring-1 ring-primary/10 shadow-lg shadow-primary/5">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shadow-inner">
                      {selectedBank.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-base font-semibold text-foreground">{selectedBank}</div>
                      <div className="text-xs text-muted-foreground">External Bank Settlement Rail</div>
                    </div>
                    <Check className="w-5 h-5 text-primary" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Account Number</Label>
                      <Input 
                        placeholder="0000000000" 
                        className="h-14 bg-background/40 border-border/60 rounded-2xl text-lg font-mono focus:ring-primary/20"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Account Holder Legal Name</Label>
                      <Input 
                        placeholder="Full name as it appears on records" 
                        className="h-14 bg-background/40 border-border/60 rounded-2xl text-base focus:ring-primary/20"
                        value={bankHolder}
                        onChange={(e) => setBankHolder(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {channel === 'mobile' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3">
                {SAVED_MOBILE.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => { setSelectedMobileId(wallet.id); setIsAddingMobile(false); }}
                    className={cn(
                      "flex items-center gap-4 p-5 rounded-2xl border text-left transition-all",
                      selectedMobileId === wallet.id && !isAddingMobile
                        ? "border-primary bg-primary/10 ring-1 ring-primary shadow-lg shadow-primary/5"
                        : "border-border/60 bg-background/20 hover:border-border"
                    )}
                  >
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold", wallet.color)}>
                      {wallet.provider === 'M-Pesa' ? 'MP' : 'AM'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{wallet.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{wallet.phone}</div>
                    </div>
                    {selectedMobileId === wallet.id && !isAddingMobile && <Check className="w-5 h-5 text-primary" />}
                  </button>
                ))}
                <button
                  onClick={() => { setIsAddingMobile(true); setSelectedMobileId(null); }}
                  className={cn(
                    "flex items-center gap-4 p-5 rounded-2xl border border-dashed text-left transition-all hover:bg-background/40",
                    isAddingMobile ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/60"
                  )}
                >
                  <div className="w-12 h-12 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-medium">Withdraw to a New Number</div>
                </button>
              </div>

              {isAddingMobile && (
                <div className="p-6 rounded-2xl border border-border/60 bg-background/40 space-y-6 animate-in slide-in-from-top-4 duration-300">
                  <div className="space-y-3">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Provider Choice</Label>
                    <div className="flex gap-2 p-1 bg-background/60 rounded-xl border border-border/60">
                      {['M-Pesa', 'Airtel Money'].map(p => (
                        <button
                          key={p}
                          onClick={() => setNewMobile({...newMobile, provider: p})}
                          className={cn(
                            "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all",
                            newMobile.provider === p ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Phone Number</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">+254</span>
                        <Input 
                          placeholder="7XX XXX XXX" 
                          className="pl-16 h-12 bg-background/60 rounded-xl"
                          value={newMobile.phone}
                          onChange={(e) => setNewMobile({...newMobile, phone: e.target.value})}
                        />
                      </div>
                    </div>
                    <Button 
                      className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      onClick={() => {
                        if (!newMobile.phone) {
                          toast.error("Please enter a phone number");
                          return;
                        }
                        toast.success("Mobile wallet verified!");
                        setIsAddingMobile(false);
                        setSelectedMobileId("m-new"); // Mock selection
                      }}
                    >
                      Confirm Mobile Number
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: AMOUNT, SECURITY & AUTHORIZATION */}
      <div className="space-y-6">
        <div className="rounded-3xl border border-border/50 bg-card/30 p-8 backdrop-blur-sm space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">
                Vault {loading ? "" : currency} Balance
              </Label>
              <Lock className="w-3.5 h-3.5 text-muted-foreground/60" />
            </div>
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Loading balance...</span>
              </div>
            ) : (
              <div className="text-4xl font-light text-primary tracking-tight">
                {currency === 'KSH' ? 'KSH ' : '$'}{balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Label htmlFor="amount" className="text-xs uppercase tracking-wider text-muted-foreground ml-1">
              Withdrawal Amount (USD)
            </Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-2xl font-light">$</span>
              <Input 
                id="amount"
                type="number"
                className="pl-10 h-16 bg-background/40 border-border/60 rounded-2xl text-3xl font-light focus:ring-primary/20" 
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-primary/5 border border-primary/10 p-6 space-y-4">
            <div className="flex justify-between items-center text-xs text-muted-foreground uppercase tracking-widest font-bold">
              <span>Exchange Rate</span>
              <span className="bg-primary/10 px-2 py-0.5 rounded">1 USD = {EXCHANGE_RATE} KES</span>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Equivalent KES</div>
              <div className="text-2xl font-mono text-primary font-bold">
                KES {kesEquivalent.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/40">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Secure Transaction PIN</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                <Input 
                  type="password" 
                  maxLength={6} 
                  placeholder="******"
                  className="pl-12 h-14 bg-background/40 border-border/60 rounded-2xl text-center text-2xl tracking-[0.8em] focus:ring-primary/20"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-center">6-digit secure transaction code</p>
            </div>

            <Button 
              className="w-full h-16 text-lg font-medium shadow-xl shadow-primary/20 rounded-2xl group"
              onClick={handleWithdrawClick}
            >
              Withdraw Funds <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>

        <div className="rounded-2xl bg-primary/5 border border-primary/10 p-5 flex items-start gap-4">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Bank transfers typically clear within 1-3 business days. Mobile money withdrawals are usually credited instantly.
          </p>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={status === 'confirming'} onOpenChange={(o) => !o && setStatus('idle')}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden bg-background border-border/50">
          <div className="p-6 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-light">Confirm Withdrawal</DialogTitle>
              <DialogDescription>
                Please verify the details below before we process your request.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-card/60 border border-border/50 rounded-2xl p-5 space-y-4 backdrop-blur-sm">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">You are withdrawing</span>
                  <span className="font-semibold text-foreground text-lg">${parseFloat(amount || "0").toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Recipient receives</span>
                  <span className="font-semibold text-primary text-lg">KES {kesEquivalent.toLocaleString()}</span>
                </div>
                <div className="border-t border-border/40 pt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Destination</span>
                    <span className="font-medium">{getRecipientName()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Platform Fee</span>
                    <span className="text-destructive font-medium">${PLATFORM_FEE.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Clearing Time</span>
                    <span className="font-medium">{channel === 'mobile' ? 'Instant' : '1-3 Business Days'}</span>
                  </div>
                </div>
                <div className="border-t border-primary/20 pt-4 flex justify-between items-center">
                  <span className="text-sm font-medium">Total Deduction</span>
                  <span className="text-xl font-mono text-primary font-bold">${totalDeduction.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="ghost" className="h-12" onClick={() => setStatus('idle')}>
                CANCEL
              </Button>
              <Button className="h-12" onClick={handleConfirmWithdraw}>
                YES, WITHDRAW
              </Button>
            </div>
          </div>
          <div className="bg-primary/5 p-3 text-center border-t border-primary/10">
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3" /> Secure end-to-end encrypted transaction
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Processing Overlay */}
      {status === 'processing' && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-primary/10 animate-pulse" />
            <Loader2 className="w-24 h-24 text-primary animate-spin absolute inset-0" />
          </div>
          <h2 className="text-2xl font-light mt-8 tracking-tight">Authorizing withdrawal request...</h2>
          <p className="text-sm text-muted-foreground mt-2">Verifying PIN and updating secure ledger</p>
          <div className="mt-12 flex gap-4">
             <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
             <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
             <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
          </div>
        </div>
      )}
    </div>
  );
}
