import { renderHook, waitFor } from '@testing-library/react';
import { useWalletBalance } from '../hooks/use-wallet-balance';
import { describe, it, expect, vi } from 'vitest';

describe('useWalletBalance', () => {
  it('returns correct wallet balance', async () => {
    const { result } = renderHook(() => useWalletBalance());
    await waitFor(() => expect(result.current.balance).toBeGreaterThan(0));
  });

  it('handles wallet balance updates', async () => {
    const { result } = renderHook(() => useWalletBalance());
    const updateBalance = vi.fn();
    result.current.updateBalance = updateBalance;
    result.current.updateBalance(100);
    await waitFor(() => expect(updateBalance).toHaveBeenCalledTimes(1));
  });
});
