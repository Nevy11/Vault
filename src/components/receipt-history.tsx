import { Receipt as ReceiptIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useReceiptHistory } from "./receipts/ReceiptHistoryStore";
import { ReceiptHistoryContent } from "./receipts/ReceiptHistoryContent";

export { useReceiptHistory };

/**
 * ReceiptActionIcon - The premium entry point for receipt history
 */
export function ReceiptActionIcon() {
  const { isOpen, setIsOpen } = useReceiptHistory();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          className={cn(
            "relative h-10 w-10 rounded-xl bg-card/40 border border-border/40 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 hover:border-primary/20 transition-all active:scale-95 group shadow-sm",
            isOpen && "bg-primary/10 text-primary border-primary/30",
          )}
          aria-label="View receipts"
        >
          <ReceiptIcon
            size={20}
            className="group-hover:scale-110 transition-transform duration-300"
          />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full border border-background shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 bg-background/95 backdrop-blur-2xl border-l border-border/40">
        <ReceiptHistoryContent />
      </SheetContent>
    </Sheet>
  );
}
