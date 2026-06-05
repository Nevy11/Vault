import { supabase } from "@/api/supabase";

export async function getConversionRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;

  const { data, error } = await supabase
    .from("currency_rates")
    .select("rate")
    .eq("from_currency", from)
    .eq("to_currency", to)
    .maybeSingle();

  if (error || !data) {
    console.warn(`Could not find rate from ${from} to ${to}, falling back to 1`, error);
    return 1;
  }

  return Number(data.rate);
}
