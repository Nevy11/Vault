import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { HelpCircle, Home, Send, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, LogOut, User } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const navItems = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: Home,
    isActive: (path: string) => path === "/dashboard",
  },
  {
    label: "Advisor",
    to: "/finance-advisor",
    icon: MessageCircle,
    isActive: (path: string) => path.startsWith("/finance-advisor"),
  },
  {
    label: "Transact",
    to: "/transactions",
    icon: Send,
    isActive: (path: string) => path.startsWith("/transactions"),
  },
  {
    label: "Settings",
    to: "/settings",
    icon: Settings,
    isActive: (path: string) => path.startsWith("/settings"),
  },
  {
    label: "Help",
    to: "/help",
    icon: HelpCircle,
    isActive: (path: string) => path.startsWith("/help"),
  },
];

function Logo() {
  return (
    <Link to="/dashboard" className="inline-flex items-center gap-2 text-foreground">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path
            d="M6 6 L16 26 L26 6"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("first_name, profile_photo_url")
        .eq("id", user.id)
        .maybeSingle();
      
      if (data) setProfile(data);
    }
    fetchProfile();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null); // Clear profile state
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen w-full text-foreground overflow-x-hidden" style={{ background: "var(--gradient-bg)" }}>
      {/* Sidebar */}
      <div className="hidden md:block fixed left-0 top-0 z-50 h-full w-64 bg-card border-r border-border/40">
        <div className="flex h-16 items-center px-4 border-b border-border/40">
          <Logo />
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4">
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
        <div className="absolute left-4 bottom-4 w-[calc(100%-2rem)]">
          <Button variant="ghost" size="sm" className="w-full" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="md:ml-64 pb-28 pt-16 md:pb-0">
        <header className="fixed top-0 left-0 right-0 md:left-64 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
          <div className="max-w-screen-2xl mx-auto w-full px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo />
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full transition-opacity hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    <Avatar>
                      <AvatarImage src={profile?.profile_photo_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {profile?.first_name?.[0] || <User className="h-4 w-4" />}
                      </AvatarFallback>
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
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="pb-20 md:pb-0 min-h-[calc(100vh-4rem)]">{children}</main>

        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/40 bg-background/95 backdrop-blur-md md:hidden">
          <nav className="mx-auto flex max-w-3xl items-center justify-around px-4 py-3">
            {navItems.map(({ label, to, icon: Icon, isActive }) => {
              const isTransact = label === "Transact";
              return (
                <Link
                  key={to}
                  to={to}
                  aria-label={label}
                  className={`inline-flex items-center justify-center rounded-full transition-all hover:bg-accent hover:text-foreground ${
                    isTransact
                      ? "h-14 w-14 -mt-6 bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110 border-4 border-background"
                      : `h-12 w-12 ${
                          isActive(currentPath)
                            ? "bg-primary/10 text-primary"
                            : "text-foreground/70"
                        }`
                  }`}
                >
                  <Icon className={`h-6 w-6 ${isTransact ? "animate-slow-spin" : ""}`} />
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
