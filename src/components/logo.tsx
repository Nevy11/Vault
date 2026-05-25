import { Link } from "@tanstack/react-router";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to as any} className="flex items-center gap-2.5 group">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl shadow-lg transition-all duration-300 group-hover:scale-110">
        <svg viewBox="0 0 48 48" width="36" height="36" className="h-5 w-5">
          <defs>
            <linearGradient id="vgrad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#0ea5a4" />
              <stop offset="100%" stopColor="#0b8f74" />
            </linearGradient>
          </defs>
          <rect width="48" height="48" rx="8" fill="url(#vgrad)" />
          <path d="M12 16 L24 34 L36 16" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="absolute inset-0 rounded-xl bg-primary/20 blur-sm -z-10 transition-colors" />
      </div>
      <span className="text-xl font-bold tracking-tight text-foreground bg-clip-text">
        Vault
      </span>
    </Link>
  );
}
