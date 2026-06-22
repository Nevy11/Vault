import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/supabase', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    from: vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue({}) }),
  },
}));

import { initiateStkPush } from '../daraja';
import { supabase } from '@/api/supabase';

describe('initiateStkPush', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls supabase functions and inserts a pending transaction', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({ data: { CheckoutRequestID: 'CR123', ResponseCode: '0' } });

    await initiateStkPush({ userId: 'u1', phoneNumber: '0712345678', amount: 100 });

    expect(supabase.functions.invoke).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith('transactions');
  });

  it('throws when functions.invoke fails', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({ data: null, error: { message: 'Bad' } });

    await expect(
      initiateStkPush({ userId: 'u1', phoneNumber: '0712345678', amount: 100 }),
    ).rejects.toThrow();
  });
});
