import "@testing-library/jest-dom";
import { vi } from "vitest";

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

// Mock a flexible supabase client for tests that don't explicitly mock it
vi.mock("@/api/supabase", async () => {
  const makeChain = () => {
    const obj: any = {};
    const chainable = () => obj;

    // common chain methods
    obj.select = chainable;
    obj.eq = chainable;
    obj.match = chainable;
    obj.neq = chainable;
    obj.order = chainable;
    obj.limit = chainable;
    obj.range = chainable;
    obj.single = async () => ({ data: null, error: null });
    obj.maybeSingle = async () => ({ data: null, error: null });
    obj.insert = async () => ({ data: null, error: null });
    obj.update = async () => ({ data: null, error: null });
    obj.delete = async () => ({ data: null, error: null });
    obj.on = (_event: string, _opts: any, cb?: any) => {
      if (cb) cb();
      return obj;
    };
    obj.subscribe = () => ({ unsubscribe: () => null });

    return obj;
  };

  const supabaseMock: any = makeChain();
  supabaseMock.from = (_table: string) => makeChain();
  supabaseMock.rpc = vi.fn(async () => ({ data: null, error: null }));
  supabaseMock.functions = { invoke: vi.fn(async () => ({ data: null, error: null })) };

  // auth helpers expected by hooks
  const authListeners: any[] = [];
  supabaseMock.auth = {
    getUser: vi.fn(async () => ({ data: { user: null } })),
    signOut: vi.fn(async () => ({ error: null })),
    onAuthStateChange: vi.fn((cb: any) => {
      authListeners.push(cb);
      const subscription = {
        unsubscribe: () => {
          const i = authListeners.indexOf(cb);
          if (i >= 0) authListeners.splice(i, 1);
        },
      };
      return { data: { subscription } };
    }),
    // helper to trigger auth events in tests if needed
    _triggerAuthEvent: (event: string, session: any) => {
      authListeners.forEach((cb) => {
        try {
          cb(event, session);
        } catch (e) {
          // swallow
        }
      });
    },
  };

  // channel/real-time stubs used by hooks
  supabaseMock.channel = (name: string) => {
    const ch: any = {
      on: (_event: string, _opts: any, cb?: any) => {
        if (cb) cb();
        return ch;
      },
      // subscribe returns the channel synchronously in tests
      subscribe: () => ch,
      unsubscribe: () => ({ error: null }),
    };
    return ch;
  };

  // channel removal helper used by some hooks
  supabaseMock.removeChannel = vi.fn(() => {});

  // extra query helpers sometimes used
  supabaseMock.gte = () => supabaseMock;
  supabaseMock.lte = () => supabaseMock;
  supabaseMock.contains = () => supabaseMock;

  return { supabase: supabaseMock };
});
 
