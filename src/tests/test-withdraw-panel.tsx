import { render, fireEvent, waitFor } from '@testing-library/react';
import { WithdrawPanel } from '../components/withdraw-panel';
import { describe, it, expect } from 'vitest';

describe('WithdrawPanel', () => {
  it('renders correctly', () => {
    const { container } = render(<WithdrawPanel />);
    expect(container).toMatchSnapshot();
  });

  it('handles withdraw button click', async () => {
    const { getByText } = render(<WithdrawPanel />);
    const withdrawButton = getByText('Withdraw');
    fireEvent.click(withdrawButton);
    await waitFor(() => expect(withdrawButton).toBeDisabled());
  });
});
