import { Link } from "@tanstack/react-router";
import { VLogo } from "@/components/v-logo";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to as any} className="flex items-center gap-3 group">
      <VLogo className="h-9 w-9 text-lg shadow-lg" />
      <span className="text-xl font-black tracking-tight text-foreground bg-clip-text">
        Vault
      </span>
    </Link>
  );
}
