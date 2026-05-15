import { Link, useLocation } from "@tanstack/react-router";
import { HelpCircle, Home, Send, Settings, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: Home, isActive: (path: string) => path === "/dashboard" },
  { label: "Transact", to: "/transactions", icon: Send, isActive: (path: string) => path.startsWith("/transactions") },
  { label: "Settings", to: "/settings", icon: Settings, isActive: (path: string) => path.startsWith("/settings") },
  { label: "Help", to: "/help", icon: HelpCircle, isActive: (path: string) => path.startsWith("/help") },
];

function Logo() {
  return (
    <Link to="/dashboard" className="inline-flex items-center gap-2 text-foreground">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M6 6 L16 26 L26 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="font-serif text-lg tracking-tight">
        Vault <span className="text-muted-foreground font-sans text-sm">OS</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="min-h-screen text-foreground" style={{ background: "var(--gradient-bg)" }}>
      {/* Sidebar */}
      <div
        className="hidden md:block fixed left-0 top-0 z-50 h-full w-64 bg-card border-r border-border/40"
      >
        <div className="flex h-16 items-center px-4 border-b border-border/40">
          <Logo />
        </div>

        <nav className="flex-1 px-4 py-4">
          <ul className="space-y-3">
            {navItems.map(({ label, to, icon: Icon, isActive }) => (
              <li key={to}>
                <Link
                  to={to}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors hover:bg-accent ${
                    isActive(currentPath)
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="absolute left-4 bottom-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              Sign out
            </Link>
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="md:ml-64 pb-20">
        <header className="border-b border-border/40 bg-background/40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo />
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full transition-opacity hover:opacity-75 focus:outline-none">
                    <Avatar>
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer">
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer">
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/" className="cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign out
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="pb-20 md:pb-0">{children}</main>

        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/40 bg-background/95 backdrop-blur-md md:hidden">
          <nav className="mx-auto flex max-w-3xl items-center justify-around px-2 py-2">
            {navItems.map(({ label, to, icon: Icon, isActive }) => (
              <Link
                key={to}
                to={to}
                aria-label={label}
                className={`inline-flex h-12 w-12 items-center justify-center rounded-full transition-colors hover:bg-accent hover:text-foreground ${
                  isActive(currentPath)
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70"
                }`}
              >
                <Icon className="h-6 w-6" />
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
