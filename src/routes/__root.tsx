import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Layers } from "lucide-react";
import { ThemeProvider } from "@/hooks/use-theme";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/api/supabase";
import { useProfile } from "@/hooks/use-profile";
import { useEffect, useState } from "react";
import { useInactivityTimeout } from "@/hooks/use-inactivity-timeout";
import { TextSizeProvider } from "@/hooks/use-text-size";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

import "../styles.css";
import appCss from "../styles.css?url";

import { TopNav } from "@/components/top-nav";

function NotFoundComponent() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-7xl font-bold text-foreground">404</h1>
          <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Go home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("Root Error Boundary caught:", error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-left overflow-auto max-h-48">
          <p className="text-sm font-mono text-destructive">{error.message || "Unknown error"}</p>
          {error.stack && (
            <pre className="mt-2 text-[10px] text-muted-foreground opacity-50 whitespace-pre-wrap">
              {error.stack}
            </pre>
          )}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
      },
      { title: "Vault OS" },
      {
        name: "description",
        content: "Your secure, real-time digital wallet and financial advisor.",
      },
      { name: "author", content: "Vault" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Vault OS" },
      { name: "theme-color", content: "#004D2C" },
      { property: "og:title", content: "Vault OS" },
      {
        property: "og:description",
        content: "Your secure, real-time digital wallet and financial advisor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/v-logo.svg",
      },
      {
        rel: "manifest",
        href: "/manifest.webmanifest",
      },
      {
        rel: "apple-touch-icon",
        href: "/v-logo.svg",
      },
      {
        rel: "mask-icon",
        href: "/v-logo.svg",
        color: "#004D2C",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                const shouldBeDark = theme === 'dark';
                if (shouldBeDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
              try {
                const size = localStorage.getItem('text-size');
                if (size) {
                  document.documentElement.style.fontSize = size + '%';
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

function MultiWindowOverlay({ onUseHere }: { onUseHere: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-500">
      <div className="max-w-md w-full mx-4 p-8 rounded-3xl border border-border bg-card shadow-2xl text-center">
        <div className="mb-6 flex justify-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Layers className="h-8 w-8" />
          </div>
        </div>
        <h2 className="text-2xl font-serif text-foreground mb-3">
          Vault is open in another window
        </h2>
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          To ensure your data remains secure and synchronized, Vault can only be active in one
          window at a time.
        </p>
        <button
          onClick={onUseHere}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
        >
          Use Vault here
        </button>
      </div>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
    });
    const unsubscribe = persistQueryClient({
      queryClient,
      persister,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    });
    return () => {
      unsubscribe[0]?.();
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <TextSizeProvider>
        <RootInner />
      </TextSizeProvider>
    </QueryClientProvider>
  );
}

function RootInner() {
  const { profile } = useProfile();
  const [isBlocked, setIsBlocked] = useState(false);

  // Auto-logout after 10 minutes of inactivity
  useInactivityTimeout(!!profile);

  useEffect(() => {
    const tabId = Math.random().toString(36).substring(2, 9);
    const channel = new BroadcastChannel("vault_multi_window");

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "PING" && !isBlocked) {
        channel.postMessage({ type: "PONG", senderId: tabId });
      } else if (event.data.type === "TAKING_OVER" && event.data.senderId !== tabId) {
        setIsBlocked(true);
      } else if (event.data.type === "PONG" && event.data.senderId !== tabId) {
        setIsBlocked(true);
      }
    };

    channel.addEventListener("message", handleMessage);

    // Initial check: is anyone else here?
    channel.postMessage({ type: "PING", senderId: tabId });

    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, [isBlocked]);

  const handleUseHere = () => {
    const tabId = "commander-" + Math.random().toString(36).substring(2, 5);
    const channel = new BroadcastChannel("vault_multi_window");
    channel.postMessage({ type: "TAKING_OVER", senderId: tabId });
    setIsBlocked(false);
    channel.close();
  };

  return (
    <>
      <Outlet />
      <Toaster />
      {isBlocked && <MultiWindowOverlay onUseHere={handleUseHere} />}
    </>
  );
}
