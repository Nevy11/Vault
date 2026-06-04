import React, { useState, useRef, useEffect } from "react";
import { QrCode, X, Zap, ShieldCheck, Camera, Info, RefreshCw } from "lucide-react";
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
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamAttachedRef = useRef(false);

  const stopCamera = () => {
    console.log("[ScanToPay] Stopping camera...");
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        console.log("[ScanToPay] Stopping track:", track.kind);
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    streamAttachedRef.current = false;
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    setIsLoading(true);
    setCameraError(null);
    streamAttachedRef.current = false;

    try {
      console.log("[ScanToPay] Starting camera...");

      // Set a timeout for camera initialization
      const timeoutPromise = new Promise((_, reject) => {
        timeoutRef.current = setTimeout(() => {
          reject(new Error("Camera initialization timeout"));
        }, 8000);
      });

      console.log("[ScanToPay] Requesting camera access...");
      const cameraPromise = navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      const stream = (await Promise.race([cameraPromise, timeoutPromise])) as MediaStream;
      console.log("[ScanToPay] Camera stream acquired:", stream.id);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Store stream reference first
      streamRef.current = stream;

      // Attach to video element (ref is always available now)
      if (videoRef.current) {
        console.log("[ScanToPay] Attaching stream to video element...");
        videoRef.current.srcObject = stream;
        streamAttachedRef.current = true;
        setIsCameraActive(true);
        console.log("[ScanToPay] Camera stream attached successfully");
      } else {
        console.error("[ScanToPay] Video ref still not available!");
        throw new Error("Video element ref is unavailable");
      }
    } catch (err) {
      console.error("[ScanToPay] Camera access error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      if (errorMessage.includes("timeout")) {
        setCameraError(
          "Camera is taking too long to start. Please try again or check if another app is using the camera.",
        );
        toast.error("Camera initialization timeout");
      } else if (errorMessage.includes("NotAllowedError")) {
        setCameraError(
          "Camera permission denied. Please enable camera access in settings and try again.",
        );
        toast.error("Camera permission denied");
      } else if (errorMessage.includes("NotFoundError")) {
        setCameraError("No camera found on this device.");
        toast.error("No camera device found");
      } else {
        setCameraError("Unable to access camera. Please check permissions and try again.");
        toast.error("Could not access camera. Please check permissions.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Auto-start camera when dialog opens (with small delay to ensure video element is mounted)
      const timeoutId = setTimeout(() => {
        console.log("[ScanToPay] Dialog opened, auto-starting camera...");
        startCamera();
      }, 100);
      return () => clearTimeout(timeoutId);
    } else {
      stopCamera();
      setCameraError(null);
    }
  }, [isOpen]);

  const handleScanClick = () => {
    console.log("[ScanToPay] Scan to Pay FAB Clicked");
    setIsOpen(true);
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

      {/* Modern Scanner Modal */}
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
              {isCameraActive
                ? "Align QR code within the frame"
                : isLoading
                  ? "Initializing camera..."
                  : cameraError
                    ? "Camera Error"
                    : "Ready to scan"}
            </DialogDescription>
          </DialogHeader>

          <div className="relative aspect-square w-full mt-4 flex items-center justify-center bg-zinc-950">
            {/* Video element - always rendered so ref is available */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`absolute inset-0 w-full h-full object-cover ${
                isCameraActive ? "opacity-100" : "opacity-0"
              }`}
            />

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

            {!isCameraActive && (
              <div className="flex flex-col items-center gap-4 text-center p-8 z-30">
                {cameraError ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
                      <Info className="w-8 h-8" />
                    </div>
                    <h3 className="text-white font-medium">Camera Error</h3>
                    <p className="text-zinc-400 text-xs max-w-[240px] leading-relaxed">
                      {cameraError}
                    </p>
                    <Button
                      className="mt-2 rounded-xl h-10 px-8"
                      onClick={startCamera}
                      disabled={isLoading}
                      variant="outline"
                    >
                      {isLoading ? "Retrying..." : "Retry"}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                      {isLoading ? (
                        <RefreshCw className="w-8 h-8 animate-spin" />
                      ) : (
                        <Camera className="w-8 h-8 animate-pulse" />
                      )}
                    </div>
                    <h3 className="text-white font-medium">
                      {isLoading ? "Starting Camera..." : "Camera Permissions"}
                    </h3>
                    <p className="text-zinc-500 text-xs max-w-[240px] leading-relaxed">
                      {isLoading
                        ? "Please wait while we initialize your camera..."
                        : "Vault OS requires camera access to scan merchant codes securely."}
                    </p>
                    {!isLoading && (
                      <Button
                        className="mt-2 rounded-xl h-10 px-8"
                        onClick={startCamera}
                        disabled={isLoading}
                      >
                        Enable Camera
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="p-6 bg-zinc-900/50 border-t border-white/5">
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Instant
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Secure
                </span>
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
