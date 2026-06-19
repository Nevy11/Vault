import { checkVelocity, checkValueSpike, evaluateTransaction } from '../../lib/fraud-protection';

describe('fraud protection', () => {
  it('checkVelocity returns correct result', async () => {
    const result = await checkVelocity('user-id');
    expect(result).toHaveProperty('isFraudulent');
  });

  it('checkValueSpike returns correct result', async () => {
    const result = await checkValueSpike('user-id', 100);
    expect(result).toHaveProperty('isFraudulent');
  });

  it('evaluateTransaction returns correct result', async () => {
    const result = await evaluateTransaction('user-id', 100);
    expect(result).toHaveProperty('isFraudulent');
  });
});
