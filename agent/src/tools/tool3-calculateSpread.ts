// agent/src/tools/tool3-calculateSpread.ts

import { logger } from "../utils/logger";
import { ArbitrageOpportunity } from "../utils/types";

/**
 * TOOL 3: Calculate price spread and identify arbitrage
 * This is LOCAL calculation - no API calls
 */
export function tool3_calculateSpread(
  cexPrice: number,
  dexPrice: number,
  positionSize: number,
  gasCostEstimate: number
): ArbitrageOpportunity {
  logger.info(`📈 Calculating spread`, {
    cexPrice,
    dexPrice,
    positionSize,
    gasCost: gasCostEstimate,
  });

  // Buy at lower price, sell at higher price
  const buyPrice = Math.min(cexPrice, dexPrice);
  const sellPrice = Math.max(cexPrice, dexPrice);
  const buyExchange = cexPrice < dexPrice ? "CEX" : "DEX";
  const sellExchange = cexPrice < dexPrice ? "DEX" : "CEX";

  // Calculate spread
  const spread = (sellPrice - buyPrice) / buyPrice;
  const spreadPercent = spread * 100;

  // Calculate profits
  const grossProfit = positionSize * spread;
  const netProfit = grossProfit - gasCostEstimate;

  // Determine confidence based on spread size
  let confidence = 0;
  if (spreadPercent < 0.3) confidence = 20;
  else if (spreadPercent < 0.5) confidence = 50;
  else if (spreadPercent < 1.0) confidence = 80;
  else if (spreadPercent < 2.0) confidence = 95;
  else confidence = 99;

  // Recommendation logic
  let recommendation: "BUY" | "SKIP" | "MONITOR" = "SKIP";
  if (netProfit > 0 && confidence > 80) {
    recommendation = "BUY";
  } else if (netProfit > 0) {
    recommendation = "MONITOR";
  }

  const opportunity: ArbitrageOpportunity = {
    tokenIn: "USDC",
    tokenOut: "CRO",
    buyExchange,
    sellExchange,
    buyPrice,
    sellPrice,
    spreadPercent,
    grossProfit,
    gasCostEstimate,
    netProfit,
    confidence,
    recommendation,
  };

  logger.debug(`Spread calculated:`, opportunity);

  return opportunity;
}
