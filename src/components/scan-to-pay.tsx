import React, { useState } from "react";
import { QrCode, X, Zap, ShieldCheck, Camera, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { VLogo } from "@/components/v-logo";

export function ScanToPay({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleScanClick = () => {
    setIsOpen(true);
    // Communication check
    console.log("Scan to Pay FAB Clicked");
  };

  return (
    <>
      {/* Pill-shaped Floating Action Button */}
      <button
        onClick={handleScanClick}
        className={cn(
          "fixed bottom-24 right-6 md:bottom-8 md:right-8 z-[60]",
          "flex items-center gap-2 md:gap-3 px-4 md:px-6 h-14 rounded-full font-bold shadow-2xl",
          "bg-[#004D2C] hover:bg-[#00361E] text-white transition-all duration-300 border border-white/10",
          "hover:scale-105 active:scale-95 group animate-in slide-in-from-bottom-10",
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <VLogo className="w-5 h-5 md:w-6 md:h-6 shadow-sm group-hover:scale-110 transition-transform" />
          <div className="w-px h-4 bg-white/20" />
          <QrCode className="w-4 h-4 md:w-5 md:h-5 group-hover:rotate-12 transition-transform" />
        </div>
        <span className="tracking-tight text-sm hidden md:inline">Scan to pay</span>
        <span className="tracking-tight text-xs md:hidden">Scan</span>
      </button>

      {/* Modern Scanner Placeholder Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-white/10 rounded-[32px]">
          <DialogHeader className="p-6 pb-0 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" /> Scan QR Code
              </DialogTitle>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <DialogDescription className="text-zinc-400 text-xs mt-1">
              Initializing encrypted scanning environment...
            </DialogDescription>
          </DialogHeader>

          <div className="relative aspect-square w-full mt-4 flex items-center justify-center bg-zinc-950">
            {/* Viewport HUD */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              <div className="absolute inset-0 border-[40px] border-black/40" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] border-2 border-primary/30 rounded-2xl">
                {/* Corners */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
                
                {/* Scanning line animation */}
                <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.5)] animate-scan-slow" />
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-4 text-center p-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                <Camera className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-white font-medium">Camera Permissions</h3>
              <p className="text-zinc-500 text-xs max-w-[200px]">
                Vault OS requires camera access to scan merchant codes securely.
              </p>
              <Button 
                className="mt-2 rounded-xl h-10 px-8"
                onClick={() => toast.error("Camera module is updating. Please try again in a few minutes.")}
              >
                Enable Camera
              </Button>
            </div>
          </div>

          <div className="p-6 bg-zinc-900/50 border-t border-white/5">
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Instant</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Secure</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes scan-slow {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-slow {
          animation: scan-slow 3s linear infinite;
        }
      `}</style>
    </>
  );
}
