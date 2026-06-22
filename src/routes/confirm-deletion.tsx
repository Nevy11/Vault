import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/api/supabase";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/confirm-deletion")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: search.token as string | undefined,
    };
  },
  component: ConfirmDeletionPage,
});

export function ConfirmDeletionPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your identity...");
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    async function handleDeletionFlow(session: any) {
      if (!isMounted || status === "success") return;

      try {
        if (!session) {
          // If no session, wait a bit and try getSession manually in case of clock skew
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(async () => {
              const {
                data: { session: s },
              } = await supabase.auth.getSession();
              if (s) handleDeletionFlow(s);
              else if (retryCount === maxRetries) {
                if (isMounted) {
                  setStatus("error");
                  setMessage("Session not found. Please try confirming again from settings.");
                }
              }
            }, 1500); // 1.5s delay for skew
            return;
          }
          return;
        }

        // 2. Verify the intent from metadata
        if (session.user.user_metadata.intent !== "account_deletion") {
          setStatus("error");
          setMessage("Invalid request intent.");
          return;
        }

        setStatus("loading");
        setMessage("Scheduling your account deletion...");

        const { error: scheduleError } = await supabase.functions.invoke("send-deletion-email", {
          body: { userId: session.user.id },
        });

        if (scheduleError) throw scheduleError;

        if (isMounted) {
          setStatus("success");
          setMessage(
            "Your account deletion has been scheduled. You have 4 working days to retrieve it if you change your mind.",
          );
        }
      } catch (err: any) {
        if (isMounted) {
          setStatus("error");
          setMessage(err.message || "Failed to process deletion.");
        }
      }
    }

    // Use onAuthStateChange for better reliability
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("DEBUG: Auth Event on Confirmation Page:", event);
      if (session) {
        handleDeletionFlow(session);
      }
    });

    // Also trigger initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handleDeletionFlow(session);
      else {
        // Start the retry logic if session isn't immediately there
        handleDeletionFlow(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card border border-border/60 rounded-3xl p-8 shadow-2xl text-center">
        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <h1 className="text-2xl font-serif">Confirming Deletion</h1>
            <p className="text-muted-foreground">{message}</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-serif">Account Scheduled for Deletion</h1>
            <p className="text-muted-foreground leading-relaxed">{message}</p>
            <Button
              className="w-full h-12 rounded-xl font-bold"
              onClick={() => {
                supabase.auth.signOut().then(() => {
                  navigate({ to: "/login" });
                });
              }}
            >
              Back to Login
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-3xl font-serif text-destructive">Verification Failed</h1>
            <p className="text-muted-foreground leading-relaxed">{message}</p>
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl font-bold"
              onClick={() => navigate({ to: "/" })}
            >
              Return Home
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
