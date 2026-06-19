import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { WithdrawPanel } from '../../components/withdraw-panel';

describe('WithdrawPanel', () => {
  it('renders correctly', () => {
    const { container } = render(<WithdrawPanel />);
    expect(container).toMatchSnapshot();
  });

  it('handles withdraw button click', () => {
    const { getByText } = render(<WithdrawPanel />);
    const withdrawButton = getByText('Withdraw');
    fireEvent.click(withdrawButton);
    waitFor(() => expect(withdrawButton).toBeDisabled());
  });
});
