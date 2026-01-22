export async function main() {
  try {
    const { initializeSigner, getSigner, contracts, formatTokenAmount } = await import("./providers/contract-provider.js");
    const { AGENT_PRIVATE_KEY, CONTRACTS, RECIPIENT_ADDRESS, validateConfig, logger } = await import("./config/config-prod.js");
    const { orchestratorLoop } = await import("./orchestrator-prod.js");

    // ========== ADD THESE IMPORTS ==========
    const { startWebSocketServer, broadcastAgentStatus, inMemoryStore } = await import("./websocket-server.js");
    // =======================================

    console.log("\n🚀 ========== ARBITRACE AGENT STARTING ==========\n");

    validateConfig();

    // ========== START WEBSOCKET SERVER FIRST ==========
    const WS_PORT = parseInt(process.env.WS_PORT || '3001');
    startWebSocketServer(WS_PORT);
    console.log(`\n🌐 WebSocket server started on port ${WS_PORT}`);
    console.log(`   Frontend can connect at: ws://localhost:${WS_PORT}\n`);
    // ==================================================

    const signer = await initializeSigner(AGENT_PRIVATE_KEY);
    const agentAddress = await signer.getAddress();

    console.log("\n💰 ========== CHECKING TOKEN BALANCES ==========\n");

    try {
      const hre = global.hre;

      // Get USDC balance (6 decimals!)
      const usdcContract = contracts.usdc();
      const usdcBalance = await usdcContract.balanceOf(agentAddress);
      const usdcFormatted = hre.ethers.formatUnits(usdcBalance, 6);
      console.log(`   USDC Balance: ${usdcFormatted} USDC`);

      // Get CRO balance
      const croContract = contracts.cro();
      const croBalance = await croContract.balanceOf(agentAddress);
      const croFormatted = hre.ethers.formatUnits(croBalance, 18);
      console.log(`   CRO Balance:  ${croFormatted} CRO`);

      // Get native CRO
      const nativeBalance = await hre.ethers.provider.getBalance(agentAddress);
      const nativeFormatted = hre.ethers.formatEther(nativeBalance);
      console.log(`   Native CRO:   ${nativeFormatted} CRO\n`);

      if (usdcBalance === 0n) {
        console.log("⚠️  WARNING: USDC balance is 0. Fund your wallet to execute trades.\n");
      }
    } catch (error) {
      logger.warn(`Could not fetch balances: ${error}`);
    }

    // FUND STRATEGY VAULT (ONE-TIME SETUP)
    console.log("💰 ========== CHECKING STRATEGY VAULT ==========\n");

    try {
      const hre = global.hre;
      const vault = contracts.strategyVault();
      const targetUser = inMemoryStore.connectedUser || RECIPIENT_ADDRESS;
      const vaultBalance = await vault.userBalances(targetUser, CONTRACTS.USDC);

      console.log(`   User (${targetUser}) Vault Balance: ${hre.ethers.formatEther(vaultBalance)} USDC`);

      const requiredBalance = hre.ethers.parseEther("100");

      if (vaultBalance < requiredBalance) {
        console.log(`   ⚠️  Vault needs funding. Depositing 100 USDC...`);

        const usdcContract = contracts.usdc();
        const depositAmount = hre.ethers.parseEther("100");

        const approveTx = await usdcContract.approve(CONTRACTS.StrategyVault, depositAmount);
        await approveTx.wait();
        console.log(`   ✅ Vault approved`);

        const depositTx = await vault.deposit(CONTRACTS.USDC, depositAmount);
        await depositTx.wait();
        console.log(`   ✅ Vault funded with 100 USDC\n`);
      } else {
        console.log(`   ✅ Vault has sufficient funds\n`);
      }
    } catch (error) {
      logger.warn(`Could not fund vault: ${error}`);
    }

    console.log("🚀 ========== ARBITRACE AGENT STARTED ==========\n");
    console.log("   🧠 AI Engine: Google Gemini 3 Flash");
    console.log("   ⏰ Scanning every 30 seconds for opportunities...\n");

    // ========== SET INITIAL AGENT STATUS ==========
    inMemoryStore.agentStatus.status = 'active';
    inMemoryStore.agentStatus.uptime = Date.now();
    inMemoryStore.agentStatus.aiEngine = 'Google Gemini 3 Flash';
    broadcastAgentStatus();
    // ==============================================

    // ========== ADD GRACEFUL SHUTDOWN ==========
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Received SIGINT (Ctrl+C)');
      inMemoryStore.agentStatus.status = 'paused';
      broadcastAgentStatus();
      setTimeout(() => {
        console.log('👋 Goodbye!\n');
        process.exit(0);
      }, 500);
    });

    process.on('SIGTERM', () => {
      console.log('\n\n🛑 Received SIGTERM');
      inMemoryStore.agentStatus.status = 'paused';
      broadcastAgentStatus();
      setTimeout(() => {
        console.log('👋 Goodbye!\n');
        process.exit(0);
      }, 500);
    });
    // ===========================================

    await orchestratorLoop();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}