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
  Zap
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Logo } from "@/components/logo";

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
    label: "Savings & Loans",
    to: "/finance-hub",
    icon: Landmark,
    isActive: (path: string) => path.startsWith("/finance-hub") || path.startsWith("/savings") || path.startsWith("/loans"),
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
    <div className="min-h-screen w-full text-foreground overflow-x-hidden" style={{ background: "var(--gradient-bg)" }}>
      {/* Sidebar */}
      <div className="hidden md:block fixed left-0 top-0 z-50 h-full w-64 bg-card border-r border-border/40">
        <div className="flex h-16 items-center px-4 border-b border-border/40">
          <Logo to="/dashboard" />
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
              <Logo to="/dashboard" />
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              
              {/* Notifications Hub */}
              {mounted && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative p-2 rounded-full hover:bg-accent transition-colors focus:outline-none group">
                      <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary border-2 border-background rounded-full animate-pulse" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 p-0 rounded-2xl overflow-hidden border-border/40 shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="bg-primary p-4 text-primary-foreground">
                      <h3 className="font-bold text-lg">Weekly Reminders</h3>
                      <p className="text-[10px] opacity-80 uppercase tracking-widest font-black">7 Days Since Last Alert</p>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {/* Loan Reminder */}
                      <div className="p-4 focus:bg-accent border-b border-border/10">
                        <div className="flex gap-3 items-start">
                          <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive shrink-0 shadow-sm border border-destructive/10">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-destructive tracking-wider">Loan Repayment</p>
                            <p className="text-sm font-black text-slate-950 dark:text-white">KES 8,500 Outstanding</p>
                            <p className="text-[10px] text-muted-foreground leading-relaxed font-bold">
                              Your repayment is due in <span className="text-foreground font-black">12 days</span>. 
                              Pay fully today to boost your future limit!
                            </p>
                            <div className="pt-2">
                              <Button size="sm" variant="outline" className="h-7 text-[10px] font-black rounded-lg border-destructive/20 text-destructive hover:bg-destructive/5 active:scale-95 transition-all" asChild>
                                <Link to="/loans">Settle Now</Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Savings Reminder */}
                      <div className="p-4 focus:bg-accent border-b border-border/10">
                        <div className="flex gap-3 items-start">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm border border-emerald-500/10">
                            <TrendingUp className="w-4 h-4" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Savings Goal</p>
                            <p className="text-sm font-black text-slate-950 dark:text-white">KES 175,000 Saved</p>
                            <p className="text-[10px] text-muted-foreground leading-relaxed font-bold">
                              You've reached <span className="text-emerald-600 font-black">70%</span> of your target. 
                              Only <span className="text-primary font-black">KES 75K</span> left to unlock your 2% reward!
                            </p>
                            <div className="pt-2">
                              <Button size="sm" variant="outline" className="h-7 text-[10px] font-black rounded-lg border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/5 active:scale-95 transition-all" asChild>
                                <Link to="/savings">View Progress</Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Automated Deduction Alert */}
                      <div className="p-4 focus:bg-accent border-b border-border/10 bg-primary/5">
                        <div className="flex gap-3 items-start">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-sm border border-primary/10">
                            <Zap className="w-4 h-4" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-primary tracking-wider">Automation Engine</p>
                            <p className="text-sm font-black text-slate-950 dark:text-white">KES 2,500 Deducted</p>
                            <p className="text-[10px] text-muted-foreground leading-relaxed font-bold">
                              Your <span className="text-primary font-black">weekly</span> specification was processed successfully via <span className="font-black text-slate-950 dark:text-white">M-Pesa</span>. 
                              Wealth building in progress!
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-muted/20 text-center">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">End of weekly updates</p>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {mounted && profile && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded-full transition-opacity hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                      <Avatar>
                        <AvatarImage src={profile?.profile_photo_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {profile?.first_name?.[0] || <User className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1 py-1 px-1">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border/40">
                            <AvatarImage src={profile?.profile_photo_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {profile?.first_name?.[0] || <User className="h-4 w-4" />}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col space-y-0.5 min-w-0">
                            <p className="text-sm font-medium leading-none truncate">
                              {profile?.first_name 
                                ? `${profile.first_name} ${profile.last_name || ""}`.trim()
                                : (profile?.email?.split('@')[0] || "Vault User")}
                            </p>
                            <p className="text-xs leading-none text-muted-foreground truncate">
                              Personal Account
                            </p>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onSelect={() => setShowPhotoPreview(true)}
                      className="cursor-pointer"
                    >
                      <User className="w-4 h-4 mr-2" />
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {mounted && (
                <Dialog open={showPhotoPreview} onOpenChange={setShowPhotoPreview}>
                  <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-2xl border-border/40">
                    <DialogHeader>
                      <DialogTitle className="text-center font-serif text-2xl">Profile Photo</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center p-4">
                      <div className="relative group">
                        <Avatar className="h-48 w-48 border-4 border-primary/20 shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]">
                          <AvatarImage src={profile?.profile_photo_url || undefined} className="object-cover" />
                          <AvatarFallback className="bg-primary/10 text-primary text-4xl">
                            {profile?.first_name?.[0] || <User className="h-20 w-20" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 rounded-full bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="mt-6 text-center">
                        <h3 className="text-xl font-medium text-foreground">
                          {profile?.first_name} {profile?.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {profile?.email || "Vault OS User"}
                        </p>
                      </div>
                      <div className="mt-8 flex gap-3 w-full">
                        <Button 
                          className="flex-1 rounded-xl h-11"
                          onClick={() => setShowPhotoPreview(false)}
                        >
                          Close Preview
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 rounded-xl h-11 border-border/60"
                          asChild
                          onClick={() => setShowPhotoPreview(false)}
                        >
                          <Link to="/settings">Edit Profile</Link>
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </header>


        <main className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
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
                    className={`flex flex-col items-center transition-all duration-300 ${
                      isTransact
                        ? "bg-primary text-primary-foreground shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-primary/40 h-[52px] w-[52px] justify-center rounded-full scale-110 p-0"
                        : `gap-1 px-3 py-1 rounded-lg ${
                            active
                              ? "text-primary"
                              : "text-muted-foreground hover:text-foreground"
                          }`
                    }`}
                  >
                    <Icon className={`${isTransact ? "h-6 w-6 animate-[spin_8s_linear_infinite]" : "h-5 w-5"} ${
                      active && !isTransact ? "text-primary" : ""
                    }`} />
                    <span className={`text-[10px] font-medium ${
                      isTransact ? "hidden" : active ? "text-primary" : ""
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
