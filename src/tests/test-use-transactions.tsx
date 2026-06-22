import { render, fireEvent, waitFor, renderHook } from '@testing-library/react';
import { useTransactions } from '../../hooks/use-transactions';
import { describe, it, expect } from 'vitest';

describe('useTransactions', () => {
  it('returns correct transactions', async () => {
    const { result } = renderHook(() => useTransactions());
    await waitFor(() => expect(result.current.transactions).toHaveLength(1));
  });

  it('handles transaction updates', async () => {
    const { result } = renderHook(() => useTransactions());
    const updateTransactions = jest.fn();
    result.current.updateTransactions = updateTransactions;
    fireEvent.updateTransactions([]);
    await waitFor(() => expect(updateTransactions).toHaveBeenCalledTimes(1));
  });
});
