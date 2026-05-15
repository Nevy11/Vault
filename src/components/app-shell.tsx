import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { HelpCircle, Home, Menu, Send, Settings, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen text-foreground" style={{ background: "var(--gradient-bg)" }}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 z-50 h-full w-64 transform bg-card border-r border-border/40 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-border/40">
          <Logo />
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 px-4 py-4">
          <ul className="space-y-2">
            {navItems.map(({ label, to, icon: Icon, isActive }) => (
              <li key={to}>
                <Link
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent ${
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
      </div>

      {/* Main content */}
      <div className="md:ml-64">
        <header className="border-b border-border/40 bg-background/40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <Logo />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500" />
              <ThemeToggle />
              <Button variant="ghost" size="sm" asChild>
                <Link to="/settings">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/help">
                  <HelpCircle className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}
