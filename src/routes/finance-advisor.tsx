import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FinanceAdvisorContent } from "@/components/finance-advisor-content";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export const Route = createFileRoute("/finance-advisor")({
  component: FinanceAdvisorPage,
});

function FinanceAdvisorPage() {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate({ to: "/dashboard" });
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden bg-transparent border-none shadow-2xl flex flex-col gap-0 rounded-3xl">
        <VisuallyHidden>
          <DialogTitle>Finance Advisor AI</DialogTitle>
        </VisuallyHidden>

        {/* Custom Close Button - Positioned to prevent layout clipping */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 dark:bg-black/20 dark:hover:bg-black/40 text-foreground transition-all duration-200 group active:scale-90 border border-white/10"
          aria-label="Close advisor"
        >
          <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
        </button>

        <div className="flex-1 overflow-hidden rounded-3xl">
          <FinanceAdvisorContent isModal />
        </div>
      </DialogContent>
    </Dialog>
  );
}
