import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { useTransactions } from '../../hooks/use-transactions';

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
