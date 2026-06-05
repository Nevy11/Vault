import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/api/supabase";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/retrieve-account")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: search.token as string | undefined,
    };
  },
  component: RetrieveAccountPage,
});

function RetrieveAccountPage() {
  const { token } = Route.useSearch();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Restoring your account...");
  const navigate = useNavigate();

  useEffect(() => {
    async function restoreAccount() {
      if (!token) {
        setStatus("error");
        setMessage("No recovery token provided.");
        return;
      }

      try {
        const { error } = await supabase.functions.invoke("restore-account", {
          body: { token },
        });

        if (error) throw error;

        setStatus("success");
        setMessage("Your account has been successfully restored! All your details and data are back to normal. You can now access your dashboard.");
      } catch (err: any) {
        let errMsg = "Failed to restore account.";
        try {
          const parsed = JSON.parse(err.message);
          errMsg = parsed.error || errMsg;
        } catch {
          errMsg = err.message || errMsg;
        }
        setStatus("error");
        setMessage(errMsg);
      }
    }

    restoreAccount();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border border-border/60 rounded-3xl p-8 shadow-2xl text-center">
        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <h1 className="text-2xl font-serif">Restoring Account</h1>
            <p className="text-muted-foreground">{message}</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="w-10 h-10 text-emerald-500" />
            </div>
            <h1 className="text-3xl font-serif">Welcome Back!</h1>
            <p className="text-muted-foreground leading-relaxed">{message}</p>
            <Button 
              className="w-full h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700"
              onClick={() => navigate({ to: "/dashboard" })}
            >
              Go to Dashboard
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-3xl font-serif text-destructive">Restoration Failed</h1>
            <p className="text-muted-foreground leading-relaxed">{message}</p>
            <Button 
              variant="outline"
              className="w-full h-12 rounded-xl font-bold"
              onClick={() => navigate({ to: "/login" })}
            >
              Back to Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
