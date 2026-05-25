import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { HelpCircle, Home, Send, Settings, User, LogOut, MessageCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/api/supabase";
import { useProfileSignal } from "@/lib/profile-signal";

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
    <Link to="/dashboard" className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
        <span className="text-lg font-bold">V</span>
      </div>
      <span className="text-xl font-medium tracking-tight">Vault</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [profile, setProfile] = useProfileSignal();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen w-full text-foreground overflow-x-hidden" style={{ background: "var(--gradient-bg)" }}>
      {/* Sidebar */}
      <div className="hidden md:block fixed left-0 top-0 z-50 h-full w-64 bg-card border-r border-border/40">
        <div className="flex h-16 items-center px-4 border-b border-border/40">
          <Logo />
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            {navItems.map(({ label, to, icon: Icon, isActive }) => (
              <li key={to}>
                <Link
                  to={to}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive(currentPath)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
            <LogOut className="mr-2 h-4 w-4" />
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
              <button 
                onClick={() => navigate({ to: "/settings" })}
                className="rounded-full transition-opacity hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <Avatar>
                  <AvatarImage src={profile?.profile_photo_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {profile?.first_name?.[0] || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/40 px-2 py-3">
        <nav>
          <ul className="flex justify-around items-center">
            {navItems.map(({ label, to, icon: Icon, isActive }) => {
              const active = isActive(currentPath);
              const isTransact = label === "Transact";
              
              return (
                <li key={to} className={isTransact ? "relative -top-4" : ""}>
                  <Link
                    to={to}
                    className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-all duration-300 ${
                      isTransact
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 h-14 w-14 justify-center rounded-full scale-110"
                        : active
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${
                      isTransact ? "animate-[spin_10s_linear_infinite]" : ""
                    } ${active && !isTransact ? "text-primary" : ""}`} />
                    <span className={`text-[10px] font-medium ${
                      isTransact ? "text-primary-foreground" : active ? "text-primary" : ""
                    }`}>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
