import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    channel: vi.fn(() => ({ on: vi.fn(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() } }));

import { useSavings } from '../use-savings';
import { supabase } from '@/api/supabase';

describe('useSavings hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows error when vault balance is insufficient for automated contribution', async () => {
    // Mock user
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'u1' } } });

    // Mock fetching goals: one active goal
    const goalsData = [
      { id: 'g1', title: 'Test Goal', current_amount: 0, target_amount: 1000 },
    ];

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'savings_goals') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: goalsData }) }) }) };
      }
      if (table === 'wallets') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { balance: 10, id: 'w1', currency: 'KES' } } ) }) }) };
      }
      if (table === 'transactions' || table === 'savings_ledger' || table === 'savings_goals') {
        return { insert: vi.fn().mockResolvedValue({}), update: vi.fn().mockResolvedValue({}), select: vi.fn().mockResolvedValue({}) };
      }
      return { select: vi.fn().mockResolvedValue({ data: [] }) };
    });

    const { result } = renderHook(() => useSavings());

    // Wait for initial fetchSavingsData to complete
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Attempt to add automated contribution larger than wallet balance
    await act(async () => {
      await result.current.addContribution(100, 'vault_balance', 'automated');
    });

    // Expect toast.error called for insufficient balance
    const { toast } = await import('sonner');
    expect((toast.error as any).mock.calls.length).toBeGreaterThan(0);
  });
});
