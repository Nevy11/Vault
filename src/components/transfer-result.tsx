import React from "react";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TransferResult({
  status,
  message,
  onRetry,
  onClose,
}: {
  status: "success" | "insufficient_balance" | "timeout" | "error";
  message?: string;
  onRetry?: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="min-h-[220px] flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-6">
        {status === "success" && <CheckCircle2 className="w-16 h-16 text-emerald-500" />}
        {status === "insufficient_balance" && <XCircle className="w-16 h-16 text-destructive" />}
        {status === "timeout" && <Clock className="w-16 h-16 text-amber-500" />}
        {status === "error" && <AlertTriangle className="w-16 h-16 text-rose-500" />}
      </div>

      <h2 className="text-2xl font-bold mb-2">
        {status === "success" && "Payment Sent"}
        {status === "insufficient_balance" && "Insufficient Balance"}
        {status === "timeout" && "Network Timeout"}
        {status === "error" && "Payment Failed"}
      </h2>
      {message && <p className="text-muted-foreground mb-6">{message}</p>}

      <div className="flex gap-3">
        {status !== "success" && (
          <Button onClick={onRetry} variant="ghost">
            Retry
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
