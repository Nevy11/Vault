import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// also run the non-React-specific setup which contains supabase mocks
import "./setup";

// Mock crypto for hashPin tests
Object.defineProperty(global, "crypto", {
  value: {
    subtle: {
      digest: vi.fn(async (algorithm, data) => {
        return new Uint8Array(32).buffer; // Dummy hash
      }),
    },
  },
});

// Provide global test render wrapper that includes ThemeProvider and RouterProvider
import * as rtl from "@testing-library/react";
import React from "react";
import { ThemeProvider } from "@/hooks/use-theme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Keep the test wrapper minimal to avoid mounting the full route tree.
const AllProviders = ({ children }: { children?: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, React.createElement(ThemeProvider, null, children));
};

// Mock the testing-library module to wrap render with providers
vi.mock("@testing-library/react", async () => {
  const actual = await vi.importActual<typeof import("@testing-library/react")>("@testing-library/react");
  return {
    ...actual,
    render: (ui: any, options?: any) => actual.render(ui, { wrapper: AllProviders, ...options }),
  };
});

// Partially mock @tanstack/react-router: keep actual exports but override a few
// browser-specific helpers so tests don't mount the full router tree.
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  const React = await import("react");

  return {
    ...actual,
    RouterProvider: ({ children }: any) => React.createElement(React.Fragment, null, children),
    Link: ({ to, children, ...rest }: any) => React.createElement("a", { href: to, ...rest }, children),
    useRouter: () => ({ isServer: false, route: {}, state: {} }),
    // helpers used by route-based tests
    createFileRoute: (path: string) => (opts: any) => ({ ...opts, useSearch: () => ({}) }),
    createRootRouteWithContext: () => (opts: any) => ({ ...opts, useSearch: () => ({}) }),
  };
});

// Polyfills for browser APIs used in components/tests
if (typeof window !== "undefined") {
  if (!window.matchMedia) {
    // simple mock
    (window as any).matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }

  if (!window.scrollTo) {
    (window as any).scrollTo = () => {};
  }

  if (!navigator.clipboard) {
    (navigator as any).clipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };
  }
}
