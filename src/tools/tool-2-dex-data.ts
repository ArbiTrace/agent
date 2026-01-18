import { ethers } from "ethers";
import { contracts, logger } from "../providers/contract-provider.js";

export interface PoolData {
  reserve0: bigint;
  reserve1: bigint;
  price0In1: number; // token0 price in token1
  price1In0: number;
  lastUpdate: number;
}

export async function fetchVVSPoolData(
  tokenA: string,
  tokenB: string
): Promise<PoolData> {
  try {
    const vvsRouter = contracts.vvsRouterReadOnly();

    const amounts = await vvsRouter.getAmountsOut(ethers.parseEther("1"), [
      tokenA,
      tokenB,
    ]);

    const reserve0 = ethers.parseEther("1000");
    const reserve1 = ethers.parseEther("2000");

    const price0In1 = parseFloat(ethers.formatEther(amounts[1]));
    const price1In0 = 1 / price0In1;

    logger.debug(`DEX (VVS): 1 TokenA = ${price0In1.toFixed(6)} TokenB`);

    return {
      reserve0,
      reserve1,
      price0In1,
      price1In0,
      lastUpdate: Date.now(),
    };
  } catch (error) {
    logger.error(`Failed to fetch VVS pool data: ${error}`);
    throw error;
  }
}

export async function fetchCEXPoolData(
  tokenA: string,
  tokenB: string
): Promise<PoolData> {
  try {
    const cexRouter = contracts.cexRouterReadOnly();

    const amounts = await cexRouter.getAmountsOut(ethers.parseEther("1"), [
      tokenA,
      tokenB,
    ]);

    const reserve0 = ethers.parseEther("1000");
    const reserve1 = ethers.parseEther("1000");

    const price0In1 = parseFloat(ethers.formatEther(amounts[1]));
    const price1In0 = 1 / price0In1;

    logger.debug(`DEX (CEX): 1 TokenA = ${price0In1.toFixed(6)} TokenB`);

    return {
      reserve0,
      reserve1,
      price0In1,
      price1In0,
      lastUpdate: Date.now(),
    };
  } catch (error) {
    logger.error(`Failed to fetch CEX pool data: ${error}`);
    throw error;
  }
}
