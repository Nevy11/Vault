import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { useWalletBalance } from '../../hooks/use-wallet-balance';

describe('useWalletBalance', () => {
  it('returns correct wallet balance', async () => {
    const { result } = renderHook(() => useWalletBalance());
    await waitFor(() => expect(result.current.balance).toBeGreaterThan(0));
  });

  it('handles wallet balance updates', async () => {
    const { result } = renderHook(() => useWalletBalance());
    const updateBalance = jest.fn();
    result.current.updateBalance = updateBalance;
    fireEvent.updateBalance(100);
    await waitFor(() => expect(updateBalance).toHaveBeenCalledTimes(1));
  });
});
