export async function getExchangeRates(base = "USD", symbols = "KES,USD") {
  const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(symbols)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.rates || {};
  } catch (err) {
    console.warn("getExchangeRates failed", err);
    return {};
  }
}

export async function convert(amount: number, from: string, to: string) {
  if (from === to) return amount;
  const rates = await getExchangeRates(from, to);
  const rate = rates[to];
  if (!rate) throw new Error(`Rate for ${to} not available`);
  return amount * rate;
}

export default { getExchangeRates, convert };
