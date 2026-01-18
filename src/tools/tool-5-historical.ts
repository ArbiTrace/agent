import { ethers } from "ethers";
import { logger } from "../config/config-prod.js";

export interface HistoricalTrade {
  timestamp: number;
  cexPrice: number;
  dexPrice: number;
  spread: number;
  profit: number;
  txHash: string;
}

export async function getHistoricalTrades(
  limit: number = 100
): Promise<HistoricalTrade[]> {
  try {
    logger.debug(
      `Querying historical trades (limit: ${limit})`
    );

    const mockTrades: HistoricalTrade[] = [
      {
        timestamp: Date.now() - 60000,
        cexPrice: 0.085,
        dexPrice: 2.0,
        spread: 1.915,
        profit: 99.32,
        txHash: "0x6f38b78d...",
      },
    ];

    return mockTrades.slice(0, limit);
  } catch (error) {
    logger.error(`Failed to fetch historical trades: ${error}`);
    throw error;
  }
}
