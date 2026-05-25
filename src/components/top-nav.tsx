import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, User, Settings } from "lucide-react";
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

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "Security", href: "/#security" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

export function TopNav() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useProfileSignal();
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setOpen(false);
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-foreground">
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <path d="M6 6 L20 34 L34 6 L27 6 L20 22 L13 6 Z" fill="oklch(0.45 0.16 165)" />
          </svg>
          <span className="text-base font-serif tracking-tight">Vault</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-foreground transition-colors">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {!profile && (
            <Link
              to="/login"
              className="hidden rounded-full px-3 py-2 text-sm font-medium text-foreground transition-colors hover:text-primary md:inline-flex"
            >
              Sign In
            </Link>
          )}
          {!profile && (
            <Button
              asChild
              size="sm"
              className="h-9 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link to="/sign-up">Get Started</Link>
            </Button>
          )}
          {profile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-2 rounded-full transition-opacity hover:opacity-75 focus:outline-none flex">
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
                          {profile?.first_name} {profile?.last_name}
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

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground md:hidden"
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background/95 md:hidden">
          <div className="mx-auto flex max-w-screen-2xl flex-col gap-1 px-4 py-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-2 text-sm text-foreground hover:bg-accent/40 transition-colors"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/login"
              className="rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/40 transition-colors"
              onClick={() => setOpen(false)}
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
