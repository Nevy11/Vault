import { describe, expect, it } from 'vitest';
import { getConversionRate } from '../lib/currency-utils';

describe('getConversionRate', () => {
  it('returns correct conversion rate', async () => {
    const rate = await getConversionRate('USD', 'KES');
    expect(rate).toBeGreaterThan(0);
  });

  it('handles invalid currency codes', async () => {
    await expect(getConversionRate('Invalid', 'KES')).rejects.toThrow();
  });
});
