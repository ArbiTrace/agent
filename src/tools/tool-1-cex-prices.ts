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
      const amountIn = BigInt("1000000000000000000"); // 1 USDC with 18 decimals

      const amounts = await cexRouter.getAmountsOut(amountIn, path);
      const croOut = amounts[amounts.length - 1];
      const hre = global.hre;

      croPrice = parseFloat(hre.ethers.formatUnits(croOut, 18));

      // Validate: reject 0 or unreasonable prices
      if (croPrice === 0 || isNaN(croPrice) || croPrice < 0.0001) {
        logger.warn(`CEX pool returned invalid price: ${croPrice}`);
        throw new Error("Invalid CEX pool price");
      }

      logger.info(`Using on-chain CEX Router price: ${croPrice.toFixed(6)} CRO per USDC`);
    } catch (error) {
      logger.error(`CEX pool query failed: ${error}`);
      throw new Error("CEX Router not available - cannot determine price");
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
