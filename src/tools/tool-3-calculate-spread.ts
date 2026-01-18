import { logger } from "../config/config-prod.js";

export interface SpreadAnalysis {
  cexPrice: number;
  dexPrice: number;
  spread: number;
  spreadPercent: number;
  direction: "BUY_DEX" | "SELL_DEX" | "NO_OPPORTUNITY";
  potentialProfit: number;
}

export function calculateSpread(cexPrice: number, dexPrice: number): SpreadAnalysis {
  const spread = Math.abs(dexPrice - cexPrice);
  const spreadPercent = (spread / Math.min(cexPrice, dexPrice)) * 100;

  let direction: "BUY_DEX" | "SELL_DEX" | "NO_OPPORTUNITY" = "NO_OPPORTUNITY";

  if (dexPrice < cexPrice) {
    direction = "BUY_DEX";
  } else if (dexPrice > cexPrice) {
    direction = "SELL_DEX";
  }

  const potentialProfit = spread > 0 ? spreadPercent : 0;

  logger.debug(
    `Spread Analysis: CEX=${cexPrice.toFixed(6)} vs DEX=${dexPrice.toFixed(6)} ` +
    `(${spreadPercent.toFixed(2)}% - ${direction})`
  );

  return {
    cexPrice,
    dexPrice,
    spread,
    spreadPercent,
    direction,
    potentialProfit,
  };
}
