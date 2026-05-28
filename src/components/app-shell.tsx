import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  HelpCircle,
  Home,
  Send,
  Settings,
  User,
  LogOut,
  MessageCircle,
  PiggyBank,
  Landmark,
  Bell,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/api/supabase";
import { useProfileSignal } from "@/lib/profile-signal";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

import { Logo } from "@/components/logo";
import { TopNav } from "@/components/top-nav";
import { FinanceAdvisorContent } from "./finance-advisor-content";
import { FloatingAdvisor } from "./floating-advisor";

const sidebarNavItems = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: Home,
    isActive: (path: string) => path === "/dashboard",
  },
  {
    label: "Savings & Loans",
    to: "/finance-hub",
    icon: Landmark,
    isActive: (path: string) => path.startsWith("/savings") || path.startsWith("/loans") || path.startsWith("/finance-hub"),
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

const mobileNavItems = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: Home,
    isActive: (path: string) => path === "/dashboard",
  },
  {
    label: "Savings & Loans",
    to: "/finance-hub",
    icon: Landmark,
    isActive: (path: string) => path.startsWith("/savings") || path.startsWith("/loans") || path.startsWith("/finance-hub"),
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [profile, setProfile] = useProfileSignal();
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    navigate({ to: "/" });
  };

  return (
    <div
      className="min-h-screen w-full text-foreground overflow-x-hidden"
      style={{ background: "var(--gradient-bg)" }}
    >
      {/* Sidebar */}
      <div className="hidden md:block fixed left-0 top-0 z-50 h-full w-64 bg-card border-r border-border/40">
        <div className="flex h-16 items-center px-4 border-b border-border/40">
          <Logo to="/dashboard" />
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            {sidebarNavItems.map(({ label, to, icon: Icon, isActive }) => (
              <li key={`${to}-${label}`}>
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
      <div className="md:ml-64 pb-28 md:pb-0">
        <TopNav />

        <main className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
          {children}
        </main>
      </div>

      {/* Advisor Drawer */}
      <Sheet open={isAdvisorOpen} onOpenChange={setIsAdvisorOpen}>
        <SheetContent
          side="bottom"
          className="h-[85vh] md:h-[80vh] w-[98vw] md:w-[calc(100%-4rem)] max-w-[850px] left-1/2 -translate-x-1/2 bottom-2 md:bottom-6 p-0 bg-background/60 backdrop-blur-3xl border border-border/40 rounded-[24px] md:rounded-[32px] overflow-hidden shadow-2xl transition-all duration-300"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Finance Advisor</SheetTitle>
            <SheetDescription>Your personal AI-powered financial strategist.</SheetDescription>
          </SheetHeader>
          <div className="p-3 md:p-4 h-full">
            <FinanceAdvisorContent isModal />
          </div>
        </SheetContent>
      </Sheet>

      {/* Advisor FAB */}
      <FloatingAdvisor
        onClick={() => setIsAdvisorOpen(true)}
        className={
          isAdvisorOpen ? "ring-4 ring-emerald-500 ring-offset-4 ring-offset-background" : ""
        }
      />

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/40 px-2 py-3">
        <nav>
          <ul className="grid grid-cols-5 items-center">
            {mobileNavItems.map(({ label, to, icon: Icon, isActive }) => {
              const active = isActive(currentPath);
              const isTransact = label === "Transact";

              return (
                <li
                  key={to}
                  className={`flex justify-center ${isTransact ? "relative -top-4" : ""}`}
                >
                  <Link
                    to={to}
                    className={`flex flex-col items-center transition-all duration-300 ${
                      isTransact
                        ? "bg-primary text-primary-foreground shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-primary/40 h-[52px] w-[52px] justify-center rounded-full scale-110 p-0"
                        : `gap-1 px-1 py-1 rounded-lg w-full max-w-[80px] ${
                            active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                          }`
                    }`}
                  >
                    <Icon
                      className={`${isTransact ? "h-6 w-6 animate-[spin_8s_linear_infinite]" : "h-5 w-5"} ${
                        active && !isTransact ? "text-primary" : ""
                      }`}
                    />
                    <span
                      className={`text-[10px] font-medium text-center truncate w-full ${
                        isTransact ? "hidden" : active ? "text-primary" : ""
                      }`}
                    >
                      {label}
                    </span>
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
