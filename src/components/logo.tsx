import { Link } from "@tanstack/react-router";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to as any} className="flex items-center gap-2.5 group">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 group-hover:scale-110 group-hover:shadow-primary/30">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
        <div className="absolute inset-0 rounded-xl bg-primary/20 blur-sm -z-10 group-hover:bg-primary/30 transition-colors" />
      </div>
      <span className="text-xl font-bold tracking-tight text-foreground bg-clip-text">
        Vault
      </span>
    </Link>
  );
}
