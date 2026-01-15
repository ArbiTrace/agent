// ============================================================================
// agent/src/orchestrator.ts
// Main Agent Orchestrator & Decision Loop
// ============================================================================

import { AgentState, ArbitrageOpportunity } from "./models/types";
import {
  fetch_crypto_com_prices,
  fetch_vvs_pool_data,
  calculate_spread,
  get_gas_prices,
  fetch_historical_trades,
} from "./tools/dataFeeds";
import {
  validate_trade_opportunity,
  build_swap_instruction,
  sign_x402_settlement,
  execute_arbitrage_trade,
  track_trade_result,
} from "./tools/execution";

export class ArbiTraceOrchestrator {
  private state: AgentState;
  private config: any;

  constructor(config: any) {
    this.config = config;
    this.state = {
      isRunning: false,
      lastScan: 0,
      totalTrades: 0,
      winCount: 0,
      totalProfit: 0,
      maxDrawdown: 0,
      currentExposure: 0,
      dailyLoss: 0,
      circuitBreakerActive: false,
    };
  }

  /**
   * Main agent loop - runs every 30 seconds
   */
  async runAgentLoop(): Promise<void> {
    console.log(
      "\n🤖 ========== ARBITRACE AGENT LOOP ========== ",
      new Date().toISOString()
    );

    if (this.state.circuitBreakerActive) {
      console.log("🛑 CIRCUIT BREAKER ACTIVE - Pausing agent");
      return;
    }

    try {
      // ==================== PHASE 1: MARKET SCAN ====================
      console.log("\n📊 [PHASE 1] Market Scanning...");
      
      const cexPrices = await fetch_crypto_com_prices(["CRO", "USDC"]);
      const croPrice = cexPrices.find((p) => p.symbol === "CRO")?.price || 0.0850;
      
      const vvsPool = await fetch_vvs_pool_data(this.config.VVS_POOL_ADDRESS);
      const dexPrice = vvsPool.price0In1; // 1 USDC = X CRO

      // Calculate spread
      const opportunity = calculate_spread(
        croPrice,
        dexPrice,
        this.config.DEFAULT_POSITION_SIZE,
        0.05 // Mock gas cost
      );

      console.log(`   CEX Price: $${croPrice}`);
      console.log(`   DEX Price: $${dexPrice}`);
      console.log(`   Spread: ${opportunity.spreadPercent.toFixed(3)}%`);
      console.log(`   Net Profit: $${opportunity.netProfit.toFixed(2)}`);
      console.log(`   Confidence: ${opportunity.confidence.toFixed(0)}%`);
      console.log(`   Recommendation: ${opportunity.recommendation}`);

      // ==================== PHASE 2: OPPORTUNITY EVALUATION ====================
      if (opportunity.recommendation === "SKIP") {
        console.log("\n⏭️ [PHASE 2] No profitable opportunity - Skipping");
        return;
      }

      console.log("\n💡 [PHASE 2] Opportunity Evaluation...");
      
      const gasInfo = await get_gas_prices();
      const historicalStats = await fetch_historical_trades(50);

      console.log(`   Gas Price: ${gasInfo.gasPrice.toFixed(2)} gwei`);
      console.log(`   Gas Cost: $${gasInfo.estimatedCost.toFixed(2)}`);
      console.log(`   Congestion: ${gasInfo.congestionLevel}`);
      console.log(`   Historical Win Rate: ${historicalStats.winRate.toFixed(1)}%`);
      console.log(`   Sharpe Ratio: ${historicalStats.sharpeRatio.toFixed(2)}`);

      // ==================== PHASE 3: RISK VALIDATION ====================
      console.log("\n🛡️ [PHASE 3] Risk Validation...");
      
      const validation = validate_trade_opportunity(
        opportunity.positionSize,
        this.state.currentExposure,
        this.state.dailyLoss,
        this.config.MAX_POSITION_SIZE,
        this.config.MAX_DAILY_LOSS
      );

      console.log(`   Risk Score: ${validation.riskScore}/100`);
      console.log(`   Portfolio Exposure: $${validation.portfolio_exposure.toFixed(2)}`);
      console.log(`   Daily Loss Remaining: $${validation.daily_loss_remaining.toFixed(2)}`);
      console.log(`   Valid: ${validation.isValid ? "✅ YES" : "❌ NO"}`);
      
      if (!validation.isValid) {
        console.log(`   Reason: ${validation.reason}`);
        return;
      }

      // ==================== PHASE 4: EXECUTION ====================
      console.log("\n⚡ [PHASE 4] Trade Execution...");
      
      const instruction = build_swap_instruction(
        this.config.USDC_ADDRESS,
        this.config.CRO_ADDRESS,
        BigInt(Math.floor(opportunity.positionSize * 1e18)),
        dexPrice,
        gasInfo.estimatedCost
      );

      console.log(`   Path: ${instruction.path.join(" -> ")}`);
      console.log(`   Amount In: ${instruction.amountIn.toString()}`);
      console.log(`   Min Amount Out: ${instruction.minAmountOut.toString()}`);
      console.log(`   Expected Profit: $${instruction.expectedProfit.toFixed(2)}`);

      // Sign settlement
      const settlement = await sign_x402_settlement(
        this.config.CRO_ADDRESS,
        instruction.minAmountOut,
        this.config.RECIPIENT_ADDRESS,
        this.config.AGENT_PRIVATE_KEY
      );

      console.log(`   ✍️ Settlement Signed`);
      console.log(`   Nonce: ${settlement.nonce.substring(0, 16)}...`);
      console.log(`   Signature: ${settlement.signature.substring(0, 20)}...`);

      // Execute on-chain
      const execution = await execute_arbitrage_trade(
        this.config.ROUTER_ADDRESS,
        instruction.path,
        instruction.amountIn,
        instruction.minAmountOut,
        null // Would be ethers.Signer in production
      );

      console.log(`   🎯 Trade Submitted!`);
      console.log(`   Tx Hash: ${execution.txHash.substring(0, 16)}...`);

      // ==================== PHASE 5: POST-TRADE ANALYSIS ====================
      console.log("\n📈 [PHASE 5] Post-Trade Analysis...");
      
      // Wait for confirmation (mocked - in production would wait for receipt)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockAmountOut = BigInt(
        Math.floor(Number(instruction.amountIn) * dexPrice * 0.997)
      );
      const result = track_trade_result(
        `trade_${this.state.totalTrades + 1}`,
        execution.txHash,
        instruction.amountIn,
        mockAmountOut,
        gasInfo.estimatedCost,
        true
      );

      console.log(`   Profit: $${result.profit.toFixed(2)}`);
      console.log(`   Gas Used: ${result.gasUsed}`);
      console.log(`   Efficiency: ${result.efficiency.toFixed(2)}x`);

      // Update state
      this.state.totalTrades++;
      if (result.profit > 0) {
        this.state.winCount++;
      }
      this.state.totalProfit += result.profit;
      this.state.currentExposure = Math.max(0, this.state.currentExposure - opportunity.positionSize);
      this.state.dailyLoss += Math.min(0, result.profit);

      // Check circuit breaker
      if (
        this.state.dailyLoss < -(this.config.MAX_POSITION_SIZE * (this.config.MAX_DAILY_LOSS / 100))
      ) {
        console.log("🛑 Daily loss limit hit - CIRCUIT BREAKER ACTIVATED");
        this.state.circuitBreakerActive = true;
      }

      console.log("\n✅ Trade cycle complete!");
      console.log(`   Total Trades: ${this.state.totalTrades}`);
      console.log(`   Win Rate: ${((this.state.winCount / this.state.totalTrades) * 100).toFixed(1)}%`);
      console.log(`   Total Profit: $${this.state.totalProfit.toFixed(2)}`);
    } catch (error) {
      console.error("❌ Agent Error:", error);
      this.state.lastError = String(error);
    }

    this.state.lastScan = Date.now();
  }

  /**
   * Start agent with polling interval
   */
  async start(intervalMs: number = 30000): Promise<void> {
    console.log("🚀 Starting ArbiTrace Agent...");
    this.state.isRunning = true;

    // Initial run
    await this.runAgentLoop();

    // Set up polling
    setInterval(() => {
      if (this.state.isRunning) {
        this.runAgentLoop().catch(console.error);
      }
    }, intervalMs);

    console.log(`⏱️ Agent running with ${intervalMs}ms polling interval`);
  }

  /**
   * Stop the agent
   */
  stop(): void {
    console.log("⏹️ Stopping ArbiTrace Agent...");
    this.state.isRunning = false;
  }

  /**
   * Get current agent state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Reset daily stats (call at 00:00 UTC)
   */
  resetDailyStats(): void {
    console.log("🔄 Resetting daily stats...");
    this.state.dailyLoss = 0;
    this.state.circuitBreakerActive = false;
  }
}

// Export factory function
export function createOrchestrator(config: any): ArbiTraceOrchestrator {
  return new ArbiTraceOrchestrator(config);
}
