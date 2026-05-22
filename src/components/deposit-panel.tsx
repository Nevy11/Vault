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
  CreditCard,
  History,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
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

import { useProfileSignal } from '@/lib/profile-signal';
import { supabase } from '@/lib/supabase';
import { hashPin } from '@/lib/utils';

// Mock Data
const SAVED_BANK_ACCOUNTS = [
  { id: 'b1', name: 'Equity Bank', accountNumber: '****5678', holder: 'John Doe', color: 'bg-orange-600' },
  { id: 'b2', name: 'KCB Bank', accountNumber: '****1234', holder: 'John Doe', color: 'bg-green-700' },
];

const CARRIERS = ["M-Pesa", "Airtel Money", "T-Kash"];
const BANKS = [
  "KCB Bank",
  "Equity Bank",
  "Co-operative Bank",
  "Absa Bank",
  "NCBA Bank",
  "Standard Chartered",
  "Stanbic Bank",
  "I&M Bank",
];

const EXCHANGE_RATE = 130.00;

type SourceChannel = 'bank' | 'mobile';
type DepositStatus = 'idle' | 'confirming' | 'processing' | 'success';

export function DepositPanel() {
  const [profile] = useProfileSignal();
  const [channel, setChannel] = useState<SourceChannel>('mobile');
  const [amount, setAmount] = useState<string>("");
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<DepositStatus>('idle');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>('m1');
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [selectedCarrier, setSelectedCarrier] = useState<string>("M-Pesa");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [refCode, setRefCode] = useState("");

  const SAVED_NUMBERS = useMemo(() => {
    console.log("DEBUG: Current profile object:", profile);
    const phoneNumber = profile?.phone_number || 'No number set';
    return [
      { 
        id: 'm1', 
        name: phoneNumber, 
        phone: phoneNumber, 
        carrier: 'M-Pesa', 
        color: 'bg-emerald-600' 
      },
    ];
  }, [profile]);

  const kesEquivalent = useMemo(() => {
    const val = parseFloat(amount || "0");
    return val * EXCHANGE_RATE;
  }, [amount]);

  const handleDepositClick = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!pin || pin.length < 4) {
      toast.error("Please enter your transaction PIN");
      return;
    }
    
    // Determine the phone number to use for the STK push
    let phone = "";
    if (isAddingNew) {
       if (!newPhoneNumber || newPhoneNumber.length < 9) {
         toast.error("Please provide a valid phone number");
         return;
       }
       phone = newPhoneNumber;
    } else {
       const source = SAVED_NUMBERS.find(n => n.id === selectedSourceId);
       phone = source?.phone || "";
    }

    if (!phone || phone === 'No number set') {
       toast.error("Please select or enter a valid mobile number");
       return;
    }

    // Standardize to 254... format
    let formattedPhone = phone.replace(/\D/g, ""); // Remove non-digits
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith("+")) {
      formattedPhone = formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith("254") && formattedPhone.length === 9) {
      formattedPhone = "254" + formattedPhone;
    }

    setStatus('processing');
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
        throw new Error("Invalid transaction PIN");
      }

      const { data, error } = await supabase.functions.invoke("mpesa-deposit", {
        body: { phoneNumber: formattedPhone, amount: parseFloat(amount) * EXCHANGE_RATE },
      });

      if (error) {
        let errorMessage = "Failed to initiate M-Pesa payment";
        try {
          // Try to get the error response body
          const errorResponse = await error.context?.json();
          errorMessage = errorResponse?.error || errorResponse?.errorMessage || error.message || errorMessage;
        } catch (e) {
          errorMessage = error.message || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      if (!data || (data.ResponseCode !== "0" && data.ResponseCode !== 0)) {
        throw new Error(data?.errorMessage || data?.ResponseDescription || data?.CustomerMessage || "Payment initiation failed: No response from provider");
      }

      toast.success("Check your phone for the M-Pesa PIN prompt");
      setStatus('confirming');
    } catch (error: any) {
      console.error("M-Pesa trigger error:", error);
      toast.error(error.message);
      setStatus('idle');
    }
  };

  const handleConfirmDeposit = async () => {
    setStatus('processing');
    // Simulate API webhook pipeline (STK Push or automated debit)
    await new Promise(resolve => setTimeout(resolve, 3000));
    setRefCode(`DEP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
    setStatus('success');
    toast.success("Deposit request initiated successfully!");
  };

  const getSourceName = () => {
    if (isAddingNew) return channel === 'mobile' ? selectedCarrier : "New Bank Account";
    if (channel === 'mobile') return SAVED_NUMBERS.find(n => n.id === selectedSourceId)?.name || selectedCarrier;
    return SAVED_BANK_ACCOUNTS.find(b => b.id === selectedSourceId)?.name || "Bank Account";
  };

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-500">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-16 h-16 animate-in zoom-in-50 duration-500" />
          </div>
          <div className="absolute -inset-2 rounded-full border-2 border-emerald-500/30 animate-ping" />
        </div>
        
        <h2 className="text-3xl font-semibold mb-2 text-emerald-500">Deposit Successful!</h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          Funds have been credited to your Vault Wallet from your {getSourceName()} account.
        </p>
        
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-8 w-full max-w-sm mb-8 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap className="w-20 h-20 text-emerald-500" />
          </div>
          
          <div className="space-y-4 relative">
            <div className="flex justify-between items-center text-sm border-b border-emerald-500/10 pb-3">
              <span className="text-muted-foreground">Credited Balance</span>
              <span className="text-2xl font-light text-emerald-500 font-mono">${parseFloat(amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Transaction ID</span>
              <span className="font-mono font-medium">{refCode}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Source</span>
              <span className="font-medium">{getSourceName()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Status</span>
              <span className="text-emerald-500 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">Completed</span>
            </div>
          </div>
        </div>
        
        <Button size="lg" className="w-full max-w-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14" asChild>
          <Link to="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
      {/* SECTION 2: LEFT PANEL - DEPOSIT SOURCE SELECTION */}
      <div className="rounded-3xl border border-border/50 bg-card/30 p-8 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-light tracking-tight">Select Deposit Source</h2>
          <div className="flex p-1 bg-background/60 border border-border/60 rounded-2xl">
            {[
              { id: 'mobile', label: 'Mobile Money', icon: Smartphone },
              { id: 'bank', label: 'Bank Account', icon: Building2 },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setChannel(t.id as SourceChannel);
                    setSelectedSourceId(null);
                    setIsAddingNew(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all",
                    channel === t.id 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-[300px] animate-in slide-in-from-left-4 duration-500">
          {channel === 'mobile' ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Select Carrier</Label>
                <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
                  <SelectTrigger className="h-14 bg-background/40 border-border/60 rounded-2xl text-base">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {CARRIERS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SAVED_NUMBERS.filter(n => n.carrier === selectedCarrier).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setSelectedSourceId(item.id); setIsAddingNew(false); }}
                    className={cn(
                      "flex items-center gap-4 p-5 rounded-2xl border text-left transition-all w-full",
                      selectedSourceId === item.id && !isAddingNew
                        ? "border-primary bg-primary/10 ring-1 ring-primary shadow-lg shadow-primary/5"
                        : "border-border/60 bg-background/20 hover:border-border"
                    )}
                  >
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold", item.color)}>
                      MP
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Primary Number</div>
                      <div className="text-sm font-semibold truncate">{item.name}</div>
                    </div>
                    {selectedSourceId === item.id && !isAddingNew && <Check className="w-5 h-5 text-primary" />}
                  </button>
                ))}
                
                <button
                  onClick={() => { setIsAddingNew(true); setSelectedSourceId(null); }}
                  className={cn(
                    "flex items-center gap-4 p-5 rounded-2xl border border-dashed text-left transition-all hover:bg-background/40",
                    isAddingNew ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/60"
                  )}
                >
                  <div className="w-12 h-12 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-medium">Add a New Number</div>
                </button>
              </div>

              {isAddingNew && (
                <div className="p-6 rounded-2xl border border-border/60 bg-background/40 animate-in slide-in-from-top-4 duration-300">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">+254</span>
                        <Input 
                          placeholder="7XX XXX XXX" 
                          className="pl-16 h-12 bg-background/60 rounded-xl" 
                          value={newPhoneNumber}
                          onChange={(e) => setNewPhoneNumber(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Search Banks</Label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input placeholder="Search major Kenyan banks..." className="pl-12 h-14 bg-background/40 border-border/60 rounded-2xl text-base" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SAVED_BANK_ACCOUNTS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setSelectedSourceId(item.id); setIsAddingNew(false); }}
                    className={cn(
                      "flex items-center gap-4 p-5 rounded-2xl border text-left transition-all",
                      selectedSourceId === item.id && !isAddingNew
                        ? "border-primary bg-primary/10 ring-1 ring-primary shadow-lg shadow-primary/5"
                        : "border-border/60 bg-background/20 hover:border-border"
                    )}
                  >
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white text-xs font-bold", item.color)}>
                      {item.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.accountNumber}</div>
                    </div>
                    {selectedSourceId === item.id && !isAddingNew && <Check className="w-5 h-5 text-primary" />}
                  </button>
                ))}
                
                <button
                  onClick={() => { setIsAddingNew(true); setSelectedSourceId(null); }}
                  className={cn(
                    "flex items-center gap-4 p-5 rounded-2xl border border-dashed text-left transition-all hover:bg-background/40",
                    isAddingNew ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/60"
                  )}
                >
                  <div className="w-12 h-12 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-medium">Link New Bank Account</div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: RIGHT PANEL - INPUTS, AMOUNT & SECURITY AUTHORIZATION */}
      <div className="space-y-6">
        <div className="rounded-3xl border border-border/50 bg-card/30 p-8 backdrop-blur-sm space-y-8">
          <div className="space-y-4">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Deposit Amount (USD)</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-2xl font-light">$</span>
              <Input 
                type="number" 
                placeholder="0.00" 
                className="pl-10 h-16 bg-background/40 border-border/60 rounded-2xl text-3xl font-light focus:ring-primary/20"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-6 space-y-4 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <History className="w-24 h-24 text-emerald-500" />
            </div>
            <div className="flex justify-between items-center text-xs text-emerald-500/70 uppercase tracking-widest font-bold">
              <span>Conversion</span>
              <span className="bg-emerald-500/20 px-2 py-0.5 rounded">1 USD = {EXCHANGE_RATE} KES</span>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Equivalent KES</div>
              <div className="text-2xl font-mono text-emerald-500 font-bold">
                KES {kesEquivalent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Vault Transaction PIN</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                type="password" 
                maxLength={6} 
                placeholder="******" 
                className="pl-12 h-14 bg-background/40 border-border/60 rounded-2xl text-center text-2xl tracking-[0.6em] focus:ring-primary/20"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest">Authorize Secure Deposit</p>
          </div>

          <Button 
            size="lg" 
            className="w-full h-16 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl text-lg font-medium shadow-xl shadow-primary/20 group"
            onClick={handleDepositClick}
          >
            Deposit Funds <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        <div className="rounded-2xl bg-card/20 border border-border/40 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Deposits are processed instantly via our secure payment rails. A small network fee may apply based on your carrier or bank.
          </p>
        </div>
      </div>

      {/* SECTION 4: THE CONFIRMATION MODAL & SUCCESS FLOW */}
      <Dialog open={status === 'confirming'} onOpenChange={(o) => !o && setStatus('idle')}>
        <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden bg-background/60 backdrop-blur-xl border-white/10 shadow-2xl">
          <div className="p-8 space-y-8">
            <div className="w-16 h-16 rounded-3xl bg-primary/20 flex items-center justify-center text-primary mx-auto">
              <Zap className="w-8 h-8" />
            </div>
            
            <div className="text-center space-y-3">
              <DialogTitle className="text-2xl font-light">Confirm Deposit</DialogTitle>
              <DialogDescription className="text-base">
                Are you sure you want to deposit <span className="text-primary font-semibold font-mono">${parseFloat(amount || "0").toLocaleString()}</span> from your <span className="font-semibold">{getSourceName()}</span> account into your Vault Wallet?
              </DialogDescription>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 space-y-4 border border-white/5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Exchange Amount</span>
                <span className="font-mono text-emerald-500">KES {kesEquivalent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee</span>
                <span className="text-primary">FREE</span>
              </div>
              <div className="border-t border-white/5 pt-4 flex justify-between items-center">
                <span className="text-sm font-medium">Total Credit</span>
                <span className="text-2xl font-light font-mono text-primary">${parseFloat(amount || "0").toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="ghost" className="h-14 rounded-2xl hover:bg-white/5" onClick={() => setStatus('idle')}>
                NO, CANCEL
              </Button>
              <Button className="h-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" onClick={handleConfirmDeposit}>
                YES, DEPOSIT
              </Button>
            </div>
          </div>
          
          <div className="bg-primary/5 p-4 text-center border-t border-white/5">
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-2 tracking-widest uppercase">
              <Lock className="w-3 h-3" /> PCI-DSS Compliant Gateway
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Processing Overlay */}
      {status === 'processing' && (
        <div className="fixed inset-0 bg-background/40 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-primary/10 animate-pulse" />
            <Loader2 className="w-32 h-32 text-primary animate-spin absolute inset-0" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className="w-10 h-10 text-primary/50 animate-pulse" />
            </div>
          </div>
          <h2 className="text-3xl font-light mt-12 tracking-tight text-foreground animate-pulse">Requesting funds securely...</h2>
          <p className="text-base text-muted-foreground mt-3">Triggering secure STK Push / Automated Debit Request</p>
          
          <div className="mt-16 flex gap-6">
             <div className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
             <div className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
             <div className="w-3 h-3 rounded-full bg-primary animate-bounce" />
          </div>
        </div>
      )}
    </div>
  );
}
