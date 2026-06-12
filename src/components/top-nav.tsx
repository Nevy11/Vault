import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LogOut, User, Settings, Bell, Sun, Moon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/api/supabase";
import { useProfileSignal } from "@/lib/profile-signal";
import { useTheme } from "@/hooks/use-theme";
import { useNotifications } from "@/hooks/use-notifications";
import { useJointSavings } from "@/hooks/use-joint-savings";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

import { Logo } from "@/components/logo";
import { ReceiptActionIcon } from "@/components/receipt-history";
import { useReceiptRealtime } from "@/hooks/use-receipt-realtime";
import { useTranslation } from "react-i18next";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "Security", href: "/#security" },
  { label: "Advisor", href: "/#advisor" },
  { label: "FAQ", href: "/#faq" },
];

export function TopNav() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useProfileSignal();
  const [mounted, setMounted] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  // Activate Realtime Receipt Listener
  useReceiptRealtime();

  const location = useLocation();
  const isLandingPage = location.pathname === "/";

  useEffect(() => {
    setMounted(true);
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: t("nav.greetings.morning"), emoji: "🌅" };
    if (hour >= 12 && hour < 17) return { text: t("nav.greetings.afternoon"), emoji: "☀️" };
    return { text: t("nav.greetings.evening"), emoji: "🌙" };
  }, [t]);

  const userName = profile?.first_name || profile?.email?.split("@")[0] || "User";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setOpen(false);
    window.location.href = "/";
  };

  const { acceptInvite, declineInvite } = useJointSavings();

  const handlePotAction = async (notification: any, action: "accept" | "decline") => {
    const potId = notification.metadata?.pot_id;
    if (!potId) return;

    if (action === "accept") {
      await acceptInvite(potId);
    } else {
      await declineInvite(potId);
    }
    await markAsRead(notification.id);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl transition-all duration-300">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6">
        <Logo to={isLandingPage ? "/" : "/dashboard"} />

        {/* Conditional Center Nav: Show Links on Landing Page only */}
        {isLandingPage ? (
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-foreground transition-colors font-medium"
              >
                {link.label}
              </a>
            ))}
          </nav>
        ) : (
          <div className="hidden md:block flex-1" /> /* Spacer for non-landing pages */
        )}

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Conditional Greeting: Show on Internal App Pages if Logged In */}
          {!isLandingPage && mounted && profile && (
            <div className="hidden sm:flex items-center gap-4 mr-2 border-r border-border/60 pr-4">
              <div className="text-right animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold leading-tight">
                  {greeting.text}, {greeting.emoji}
                </div>
                <div className="text-sm font-semibold text-foreground leading-tight">
                  {userName}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative h-9 w-9 rounded-xl bg-card/40 border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card/80 transition-all active:scale-95 group">
                      <Bell size={16} className="group-hover:scale-110 transition-transform" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full border border-background shadow-sm animate-pulse flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        </span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-80 rounded-2xl p-0 border-border/50 shadow-xl overflow-hidden"
                  >
                    <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/30">
                      <h3 className="font-semibold text-sm">{t("nav.notifications.title")}</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            markAllAsRead();
                          }}
                          className="text-[10px] uppercase tracking-wider font-bold text-primary hover:text-primary/80 transition-colors"
                        >
                          {t("nav.notifications.markAllRead")}
                        </button>
                      )}
                    </div>
                    <ScrollArea className="h-[350px]">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          <p className="text-xs">{t("nav.notifications.none")}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          {notifications.map((n) => {
                            const isPotInvite = n.metadata?.type === "pot_invite";

                            return (
                              <div
                                key={n.id}
                                onClick={() => !n.is_read && markAsRead(n.id)}
                                className={`flex flex-col gap-2 p-4 text-left border-b border-border/40 last:border-0 transition-colors hover:bg-muted/50 relative cursor-pointer ${!n.is_read ? "bg-primary/5" : ""}`}
                              >
                                {!n.is_read && (
                                  <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full" />
                                )}
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={`text-xs font-semibold ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}
                                  >
                                    {n.title_key ? t(n.title_key) : n.title}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                    {new Date(n.created_at).toLocaleDateString([], {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {n.message_key
                                    ? (t(n.message_key, n.metadata) as string)
                                    : n.message}
                                </p>

                                {isPotInvite && !n.is_read && (
                                  <div className="flex gap-2 mt-1">
                                    <Button
                                      size="sm"
                                      className="h-8 flex-1 text-[10px] uppercase tracking-wider font-bold"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePotAction(n, "accept");
                                      }}
                                    >
                                      Accept
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 flex-1 text-[10px] uppercase tracking-wider font-bold"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePotAction(n, "decline");
                                      }}
                                    >
                                      Decline
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          {/* Landing Page Auth Buttons */}
          {isLandingPage && mounted && !profile && (
            <>
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="rounded-full px-4 text-sm font-medium transition-all"
                >
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="h-9 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
                >
                  <Link to="/sign-up">Get Started</Link>
                </Button>
              </div>
            </>
          )}

          {/* Icon Row (Theme -> Receipt -> Profile) */}
          {mounted && profile && (
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="h-9 w-9 rounded-full bg-card/40 border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card/80 transition-all active:scale-95"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun size={16} className="text-yellow-500" />
                ) : (
                  <Moon size={16} className="text-slate-400" />
                )}
              </button>

              <ReceiptActionIcon />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full transition-all hover:ring-4 hover:ring-primary/10 focus:outline-none flex p-0.5 border border-primary/20 bg-primary/5">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={profile?.profile_photo_url || undefined}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-xs font-bold">
                        {(profile?.first_name?.[0] || profile?.email?.[0] || "U").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 rounded-2xl p-2 border-border/50 shadow-xl"
                >
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1 py-1 px-1">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border/40">
                          <AvatarImage
                            src={profile?.profile_photo_url || undefined}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {(profile?.first_name?.[0] || profile?.email?.[0] || "U").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col space-y-0.5 min-w-0">
                          <p className="text-sm font-medium leading-none truncate">
                            {profile?.first_name} {profile?.last_name}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground truncate">
                            Vault User
                          </p>
                        </div>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem className="cursor-pointer rounded-xl py-2.5 focus:bg-primary/5">
                    <User className="w-4 h-4 mr-2 text-muted-foreground" />
                    {t("nav.profile.view")}
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to="/settings"
                      className="cursor-pointer rounded-xl py-2.5 focus:bg-primary/5"
                    >
                      <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
                      {t("nav.profile.settings")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 rounded-xl py-2.5"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t("nav.signout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
