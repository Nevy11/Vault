export function VLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 font-black",
        className,
      )}
    >
      V
    </div>
  );
}

import { cn } from "@/lib/utils";
