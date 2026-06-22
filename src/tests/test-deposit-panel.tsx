import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { DepositPanel } from '../components/deposit-panel';
import { describe, it, expect } from 'vitest';

describe('DepositPanel', () => {
  it('renders correctly', () => {
    const { container } = render(<DepositPanel />);
    expect(container).toMatchSnapshot();
  });

  it('handles deposit button click', () => {
    const { getByText } = render(<DepositPanel />);
    const depositButton = getByText('Deposit');
    fireEvent.click(depositButton);
    waitFor(() => expect(depositButton).toBeDisabled());
  });
});
