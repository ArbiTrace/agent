// agent/src/tools/tool2-fetchVvsPoolData.ts

import { ethers } from "ethers";
import { CONFIG } from "../config/config";
import { logger } from "../utils/logger";
import { PoolData } from "../utils/types";

// Minimal VVS Pair ABI (just what we need)
const VVS_PAIR_ABI = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
];

/**
 * TOOL 2: Fetch VVS Finance pool data from blockchain
 */
export async function tool2_fetchVvsPoolData(
  poolAddress: string
): Promise<PoolData> {
  const start = Date.now();

  try {
    logger.info(`📊 Fetching VVS pool data: ${poolAddress}`);

    // Connect to blockchain
    const provider = new ethers.JsonRpcProvider(CONFIG.CRONOS_RPC_URL);
    const pair = new ethers.Contract(poolAddress, VVS_PAIR_ABI, provider);

    // Get reserves
    const [reserve0, reserve1] = await pair.getReserves();
    const token0 = await pair.token0();
    const token1 = await pair.token1();

    // Calculate prices
    const price0In1 = Number(reserve1) / Number(reserve0); // How much token1 per token0
    const price1In0 = Number(reserve0) / Number(reserve1); // How much token0 per token1

    const poolData: PoolData = {
      poolAddress,
      token0,
      token1,
      reserve0: reserve0 as bigint,
      reserve1: reserve1 as bigint,
      price0In1,
      price1In0,
      liquidity: Math.sqrt(Number(reserve0) * Number(reserve1)),
    };

    const elapsed = Date.now() - start;
    logger.success(`✅ Got VVS pool data in ${elapsed}ms`, {
      price0In1: poolData.price0In1,
      liquidity: poolData.liquidity,
    });

    return poolData;
  } catch (error) {
    logger.error("❌ Failed to fetch VVS pool data", error);
    throw error;
  }
}
