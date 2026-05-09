import { eq } from "drizzle-orm";

import { db } from "../client";
import { currencies } from "../schema";
import { DEFAULT_CURRENCY_CODE } from "./constants";
import { roundMoney } from "./money";

export async function getCurrencyDecimalPlaces(currencyCode: string) {
  const currency = await db.query.currencies.findFirst({
    where: eq(currencies.code, currencyCode),
  });

  return currency?.decimalPlaces ?? 2;
}

export async function convertMoney(
  amount: number,
  fromCurrency: string,
  toCurrency = DEFAULT_CURRENCY_CODE
) {
  if (fromCurrency === toCurrency) {
    const decimals = await getCurrencyDecimalPlaces(toCurrency);
    return roundMoney(amount, decimals);
  }

  const rate = await db.query.exchangeRates.findFirst({
    where: (table, { and, eq: innerEq }) =>
      and(
        innerEq(table.baseCurrency, fromCurrency),
        innerEq(table.targetCurrency, toCurrency)
      ),
  });

  if (!rate) {
    throw new Error(`Missing exchange rate from ${fromCurrency} to ${toCurrency}.`);
  }

  const decimals = await getCurrencyDecimalPlaces(toCurrency);
  return roundMoney(amount * rate.rate, decimals);
}
