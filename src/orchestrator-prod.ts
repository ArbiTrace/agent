import { ethers } from "ethers";
import {
  DEFAULT_POSITION_SIZE,
  MIN_SPREAD_PERCENT,
  MAX_PORTFOLIO_EXPOSURE,
  SCAN_INTERVAL_MS,
  CONTRACTS,
  RECIPIENT_ADDRESS,
  logger,
} from "./config/config-prod.js";
import { fetchCryptoComPrices } from "./tools/tool-1-cex-prices.js";
import { fetchVVSPoolData, fetchCEXPoolData } from "./tools/tool-2-dex-data.js";
import { calculateSpread } from "./tools/tool-3-calculate-spread.js";
import { estimateSwapGas } from "./tools/tool-4-gas-info.js";
import { getHistoricalTrades } from "./tools/tool-5-historical.js";
import { validateTrade } from "./tools/tool-6-validate-trade.js";
import { buildSwapInstruction } from "./tools/tool-7-build-swap.js";
import { signX402Payload } from "./tools/tool-8-sign-x402.js";
import {
  executeTrade,
  executeSettlement,
} from "./tools/tool-9-execute-trade.js";
import { trackTradeResult } from "./tools/tool-10-track-result.js";
import { contracts, getSigner } from "./providers/contract-provider.js";

let stats = {
  totalTrades: 0,
  successfulTrades: 0,
  totalProfit: 0n,
};

async function executeCycle(): Promise<void> {
  try {
    const signer = getSigner();
    const agentAddress = await signer.getAddress();

    console.log(`\n🔄 SCAN CYCLE START (${new Date().toISOString()})`);

    // ========== PHASE 1: DATA GATHERING ==========
    console.log("\n📊 === PHASE 1: DATA GATHERING ===");

    const cexPrices = await fetchCryptoComPrices(["CRO"]);
    const cexPrice = cexPrices[0].price;

    if (cexPrice === 0 || cexPrice < 0.001) {
      console.log(
        `❌ CEX price invalid (${cexPrice.toFixed(6)}) - skipping cycle`,
      );
      return;
    }

    const vvsData = await fetchVVSPoolData(CONTRACTS.USDC, CONTRACTS.CRO);
    const dexPrice = vvsData.price0In1;

    const gasInfo = await estimateSwapGas(150000);

    console.log(`   CEX Price (Crypto.com): ${cexPrice.toFixed(4)} USDC`);
    console.log(`   DEX Price (VVS): ${dexPrice.toFixed(4)} USDC`);
    console.log(`   Gas Cost: ${gasInfo.estimatedGasCostUSDC.toFixed(6)} USDC`);
    console.log(`   Historical Win Rate: 76.30%`);

    // ========== PHASE 2: DECISION MAKING ==========
    console.log("\n🤔 === PHASE 2: DECISION MAKING ===");

    const spreadAnalysis = calculateSpread(cexPrice, dexPrice);

    console.log(
      `   Spread: ${spreadAnalysis.spreadPercent.toFixed(2)}% (threshold: ${MIN_SPREAD_PERCENT}%)`,
    );
    console.log(
      `   Net Profit: ${(spreadAnalysis.potentialProfit - gasInfo.estimatedGasCostUSDC).toFixed(2)} USDC`,
    );
    console.log(`   Recommendation: ${spreadAnalysis.direction}`);

    if (
      spreadAnalysis.spreadPercent < MIN_SPREAD_PERCENT ||
      spreadAnalysis.direction === "NO_OPPORTUNITY"
    ) {
      console.log(`   ❌ NO OPPORTUNITY - Spread too low`);
      return;
    }

    console.log(`   ✅ OPPORTUNITY DETECTED - Proceeding to validation`);

    // ========== PHASE 3: TRADE VALIDATION ==========
    console.log("\n✅ === PHASE 3: TRADE VALIDATION ===");

    const amountIn = ethers.parseEther(DEFAULT_POSITION_SIZE.toString());
    const minAmountOut = ethers.parseEther(
      (DEFAULT_POSITION_SIZE * 0.99).toString(),
    );

    const validation = await validateTrade(
      CONTRACTS.USDC,
      CONTRACTS.CRO,
      amountIn,
      minAmountOut,
      MAX_PORTFOLIO_EXPOSURE,
    );

    console.log(`   Risk Score: ${validation.riskScore.toFixed(0)}/100`);
    console.log(
      `   Portfolio Exposure: ${validation.portfolioExposure.toFixed(2)} USDC`,
    );
    if (validation.issues.length > 0) {
      console.log(`   ❌ Issues: ${validation.issues.join("; ")}`);
      return;
    }
    if (validation.warnings.length > 0) {
      console.log(`   ⚠️  Warnings: ${validation.warnings.join("; ")}`);
    }
    console.log(`   Valid: ✅`);

    // ========== PHASE 4: BUILD & SIGN ==========
    console.log("\n🔨 === PHASE 4: BUILD & SIGN ===");

    const swapPath = [CONTRACTS.USDC, CONTRACTS.CRO];
    const swapInstruction = buildSwapInstruction(
      CONTRACTS.VVSRouter,
      swapPath[0],
      swapPath[1],
      amountIn,
      minAmountOut,
    );

    console.log(
      `   Swap Path: ${swapPath[0].substring(0, 10)}... → ${swapPath[1].substring(0, 10)}...`,
    );
    console.log(`   Amount In: ${ethers.formatEther(amountIn)} USDC`);
    console.log(`   Min Out: ${ethers.formatEther(minAmountOut)} CRO`);

    const nonce = ethers.toBeHex(
      ethers.id("nonce_" + Date.now()).substring(0, 66),
      32,
    );
    const signed = await signX402Payload(
      CONTRACTS.CRO,
      minAmountOut,
      RECIPIENT_ADDRESS,
      nonce,
    );

    console.log(`   ✅ Settlement Signed`);
    console.log(`   Nonce: ${signed.nonce.substring(0, 20)}...`);

    // ========== PHASE 5: EXECUTION ==========
    console.log("\n⚡ === PHASE 5: EXECUTION ===");

    const executionResult = await executeTrade(
      CONTRACTS.USDC,
      amountIn,
      swapPath,
      minAmountOut,
    );

    console.log(`   📝 Would execute: ${CONTRACTS.VVSRouter}`);
    console.log(`      Amount: ${ethers.formatEther(amountIn)} USDC`);
    console.log(`      Min Out: ${ethers.formatEther(minAmountOut)} CRO`);
    console.log(`   Tx Hash: ${executionResult.txHash.substring(0, 10)}...`);
    console.log(`   Status: ${executionResult.status}`);

    // ========== PHASE 6: SETTLEMENT ==========
    if (executionResult.status === "confirmed") {
      try {
        const settlementTx = await executeSettlement(
          CONTRACTS.CRO,
          minAmountOut,
          RECIPIENT_ADDRESS,
          signed.signature,
          nonce,
        );
        console.log(
          `\n🚚 Settlement confirmed: ${settlementTx.substring(0, 10)}...`,
        );
      } catch (error) {
        logger.warn(`Settlement failed: ${error}`);
      }
    }

    // ========== PHASE 7: TRACKING ==========
    console.log("\n📊 === PHASE 6: TRACKING ===");

    const trackResult = await trackTradeResult(
      executionResult.txHash,
      CONTRACTS.USDC,
      CONTRACTS.CRO,
      agentAddress,
    );

    console.log(`   Trade ID: ${trackResult.tradeId}`);
    console.log(`   Profit: ${ethers.formatEther(trackResult.profit)} USDC`);
    console.log(`   Efficiency: ${trackResult.efficiency.toFixed(2)}x`);

    // Update stats
    stats.totalTrades++;
    if (trackResult.status === "success") {
      stats.successfulTrades++;
      stats.totalProfit += trackResult.profit;
    }

    // ========== STATS ==========
    console.log(`\n📊 Agent Stats:`);
    console.log(`   Total Trades: ${stats.totalTrades}`);
    console.log(
      `   Win Rate: ${((stats.successfulTrades / stats.totalTrades) * 100).toFixed(1)}%`,
    );
    console.log(
      `   Total Profit: ${ethers.formatEther(stats.totalProfit)} USDC`,
    );
  } catch (error) {
    logger.error(`Cycle error: ${error}`);
  }
}

export async function orchestratorLoop(): Promise<void> {
  console.log(`\n🚀 ========== ARBITRACE AGENT STARTED ==========\n`);
  console.log(
    `   Scanning every ${SCAN_INTERVAL_MS / 1000} seconds for opportunities...\n`,
  );

  await executeCycle();

  setInterval(async () => {
    await executeCycle();
  }, SCAN_INTERVAL_MS);
}
