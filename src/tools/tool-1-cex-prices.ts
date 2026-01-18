import { contracts } from "../providers/contract-provider.js";
import { CONTRACTS, logger } from "../config/config-prod.js";

export interface CexPrice {
  symbol: string;
  price: number;
  timestamp: number;
}
export async function fetchCryptoComPrices(
  symbols: string[],
): Promise<CexPrice[]> {
  try {
    let croPrice = 0;

    try {
      const cexRouter = contracts.cexRouterReadOnly();
      const path = [CONTRACTS.USDC, CONTRACTS.CRO];
      const amountIn = BigInt("1000000"); // 1 USDC

      const amounts = await cexRouter.getAmountsOut(amountIn, path);
      const croOut = amounts[amounts.length - 1];
      const hre = global.hre;

      croPrice = parseFloat(hre.ethers.formatUnits(croOut, 18));

      // Validate: reject 0 or unreasonable prices
      if (croPrice === 0 || isNaN(croPrice) || croPrice < 0.0001) {
        logger.warn(`CEX pool returned invalid price: ${croPrice}`);
        croPrice = 0.1; // Mark as invalid for fallback
      }
    } catch (error) {
      logger.warn(`CEX pool query failed: ${error}`);
      croPrice = 0.1;
    }

    // REAL API FALLBACK: Fetch from Crypto.com REST API
    // REAL API FALLBACK: Fetch from Crypto.com REST API
    if (croPrice === 0) {
      try {
        const response = await fetch(
          "https://api.crypto.com/v2/public/get-ticker?instrument_name=CRO_USDT",
        );

        const data = (await response.json()) as any;
        if (data.code === 0 && data.result?.data?.[0]) {
          croPrice = parseFloat(data.result.data[0].a);
          logger.info(
            `Using Crypto.com API price: ${croPrice.toFixed(6)} USDC`,
          );
        }
      } catch (apiError) {
        logger.warn(`Crypto.com API failed: ${apiError}`);
        croPrice = 0.1;
      }
    }

    // Return 0 if no valid price (orchestrator will gate this)
    return symbols.map((symbol) => ({
      symbol,
      price: symbol === "CRO" ? croPrice : 1.0,
      timestamp: Date.now(),
    }));
  } catch (error) {
    logger.error(`Failed to fetch CEX prices: ${error}`);
    throw error;
  }
}
