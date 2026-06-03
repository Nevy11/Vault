import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { ThemeProvider } from "@/hooks/use-theme";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/api/supabase";
import { useProfileSignal, profileSignal } from "@/lib/profile-signal";
import { useEffect } from "react";
import i18n from "@/lib/i18n";

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
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" },
      { title: "Vault OS" },
      { name: "description", content: "Your secure, real-time digital wallet and financial advisor." },
      { name: "author", content: "Vault" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Vault OS" },
      { name: "theme-color", content: "#004D2C" },
      { property: "og:title", content: "Vault OS" },
      { property: "og:description", content: "Your secure, real-time digital wallet and financial advisor." },
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
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [profile, setProfile] = useProfileSignal();

  useEffect(() => {
    // Hydrate profile from localStorage on client mount
    profileSignal.hydrate();

    async function fetchProfile(userId: string) {
      if (!userId) return;

      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) throw profileError;

        // Fetch preferences
        const { data: prefData, error: prefError } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (prefError) {
          console.warn("Error fetching user preferences:", prefError);
        }

        if (profileData) {
          const combinedData = {
            ...profileData,
            language: prefData?.language || "en",
            theme: prefData?.theme || "system",
          };

          const current = profileSignal.get();
          // Deep compare relevant fields to prevent unnecessary re-renders
          const hasChanged =
            !current ||
            current.id !== combinedData.id ||
            current.kyc_status !== combinedData.kyc_status ||
            current.profile_photo_url !== combinedData.profile_photo_url ||
            current.first_name !== combinedData.first_name ||
            current.last_name !== combinedData.last_name ||
            current.kyc_tag !== combinedData.kyc_tag ||
            current.language !== combinedData.language;

          if (hasChanged) {
            console.log("Profile and preferences updated/synced");
            setProfile(combinedData);
            
            if (combinedData.language && i18n.language !== combinedData.language) {
              i18n.changeLanguage(combinedData.language);
            }
          }
        } else {
          console.warn("No profile found for authenticated user:", userId);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    }

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change:", event);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setProfile]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
