import { ethers } from "ethers";
import { logger } from "../config/config-prod.js";

export interface SwapInstruction {
  router: string;
  path: string[];
  amountIn: bigint;
  amountOutMin: bigint;
  deadline: number;
}

export function buildSwapInstruction(
  routerAddress: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  minAmountOut: bigint,
  deadlineSeconds: number = 300
): SwapInstruction {
  const deadline = Math.floor(Date.now() / 1000) + deadlineSeconds;

  const instruction: SwapInstruction = {
    router: routerAddress,
    path: [tokenIn, tokenOut],
    amountIn,
    amountOutMin: minAmountOut,
    deadline,
  };

  logger.debug(
    `Built swap instruction: ${ethers.getAddress(tokenIn).substring(0, 10)}... -> ${ethers.getAddress(tokenOut).substring(0, 10)}... (${ethers.formatEther(amountIn)} in, ${ethers.formatEther(minAmountOut)} min out)`
  );

  return instruction;
}
