# 🎯 ArbiTrace AI Agent - System Architecture & Tool Reference

## Complete System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ArbiTrace AI Agent                              │
│                      (Claude Sonnet 4 + Tools)                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                   ┌────────────────┼────────────────┐
                   ▼                                 ▼
        ┌─────────────────────┐         ┌──────────────────────┐
        │   DATA FEED LOOP    │         │   EXECUTION LOOP     │
        │   (Tools 1-5)       │         │   (Tools 6-10)       │
        └─────────────────────┘         └──────────────────────┘
                   │                             │
        ┌──────────┼──────────┬──────────┐      │
        ▼          ▼          ▼          ▼      │
     ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐│
     │ 1   │  │ 2   │  │ 3   │  │ 4   ││
     │CEX  │  │DEX  │  │CALC │  │GAS  ││
     │PRICE│  │DATA │  │SPRD │  │INFO ││
     └─────┘  └─────┘  └─────┘  └─────┘│
        │          │          │          │
        └──────────┴──────────┴──────────┘
                   ▼
        ┌──────────────────────┐
        │ Tool 5: Historical   │
        │ Trade Analytics      │
        └──────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  DECISION: PROFITABLE?
        │  Spread > 0.5% &&    │
        │  Net Profit > 0?     │
        └──────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼ YES                 ▼ NO (SKIP)
    ┌─────────┐            EXIT LOOP
    │Tool 6   │         (Wait 30s)
    │VALIDATE │
    │ TRADE   │
    └────┬────┘
         │
    ┌────┴─────┐
    ▼ PASS     ▼ FAIL (SKIP)
┌─────────┐  EXIT LOOP
│ Tool 7  │
│ BUILD   │
│SWAP     │
└────┬────┘
     ▼
┌─────────┐
│ Tool 8  │
│ SIGN    │
│ x402    │
└────┬────┘
     ▼
┌─────────────────────────────────────────┐
│          Tool 9: EXECUTE               │
│    Submit Transaction to Blockchain     │
└────┬────────────────────────────────────┘
     │
  (Wait for confirmation)
     │
     ▼
┌─────────────────────────────────────────┐
│          Tool 10: TRACK                │
│    Log Result & Update Analytics       │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│       Update Agent State:               │
│  - totalTrades += 1                     │
│  - totalProfit += result.profit         │
│  - Check circuit breaker                │
└─────────────────────────────────────────┘
     │
     └─→ Wait 30 seconds, repeat loop
```

---

## 🛠️ All 10 Tools - Complete Reference

### DATA FEED TOOLS (1-5)

#### **Tool 1: `fetch_crypto_com_prices(symbols: string[])`**
```
Input:  symbols = ["CRO", "USDC", "BTC"]
Output: TokenPrice[] = [
  {
    symbol: "CRO",
    price: 0.0850,
    timestamp: 1705094400000,
    source: "crypto.com",
    change24h: +2.5,
    volume24h: 50000000
  },
  ...
]
Calls:  Crypto.com MCP Server API
Time:   ~500ms
```

#### **Tool 2: `fetch_vvs_pool_data(poolAddress: string)`**
```
Input:  poolAddress = "0x123ABC..."
Output: PoolData = {
  poolAddress: "0x123ABC...",
  token0: "0xUSDC",
  token1: "0xCRO",
  reserve0: BigInt("10000000000000000000"),  // 10k USDC
  reserve1: BigInt("20000000000000000000"),  // 20k CRO
  price0In1: 2.0,                             // 1 USDC = 2 CRO
  volume24h: 1000000,
  liquidity: 141421
}
Calls:  VVS Finance contracts (on-chain)
Time:   ~1000ms
```

#### **Tool 3: `calculate_spread(cexPrice, dexPrice, positionSize, gasCost)`**
```
Input:  cexPrice = 0.0850, dexPrice = 0.0856, positionSize = 1000, gasCost = 0.45
Output: ArbitrageOpportunity = {
  tokenIn: "USDC",
  tokenOut: "CRO",
  buyExchange: "crypto.com",
  sellExchange: "vvs",
  spreadPercent: 0.706,
  estimatedProfit: 7.06,
  netProfit: 6.65,
  confidence: 89,
  recommendation: "BUY"
}
Calls:  Pure calculation (local)
Time:   <1ms
```

#### **Tool 4: `get_gas_prices()`**
```
Output: GasInfo = {
  gasPrice: 125.5,           // gwei
  estimatedCost: 0.45,       // USDC (rough)
  isOptimalTime: true,
  congestionLevel: "medium"
}
Calls:  Cronos RPC (eth_gasPrice) or gas oracle
Time:   ~500ms
```

#### **Tool 5: `fetch_historical_trades(limit = 100)`**
```
Output: HistoricalStats = {
  totalTrades: 342,
  winRate: 76.3,
  avgProfit: 127.45,
  maxDrawdown: -4.2,
  sharpeRatio: 2.34,
  trades: [ ... 342 TradeResult objects ... ]
}
Calls:  Database or contract event logs
Time:   ~2000ms
```

---

### EXECUTION TOOLS (6-10)

#### **Tool 6: `validate_trade_opportunity(positionSize, currentExposure, dailyLoss, MAX_POSITION_SIZE, MAX_DAILY_LOSS)`**
```
Input:  positionSize = 1000, currentExposure = 2000, dailyLoss = -150,
        MAX_POSITION_SIZE = 5000, MAX_DAILY_LOSS = 5

Output: TradeValidation = {
  isValid: true,
  riskScore: 35,                    // 0-100 (lower = safer)
  reason: "✅ All checks passed",
  maxPositionSize: 5000,
  portfolio_exposure: 3000,
  daily_loss_remaining: 100
}

Checks:
  ✓ Position size < MAX? (1000 < 5000) YES
  ✓ New exposure < 3x MAX? (3000 < 15000) YES
  ✓ Daily loss < limit? (-150 < -250) YES

Time:   <1ms
```

#### **Tool 7: `build_swap_instruction(tokenIn, tokenOut, amountIn, minPrice, gasCost)`**
```
Input:  tokenIn = "0xUSDC", tokenOut = "0xCRO",
        amountIn = 1000 * 10^18, minPrice = 1.98, gasCost = 0.45

Output: SwapInstruction = {
  path: ["0xUSDC", "0xCRO"],
  amountIn: BigInt("1000000000000000000"),    // 1000 USDC
  minAmountOut: BigInt("1976000000000000000"), // 1976 CRO (with slippage)
  gasCost: 0.45,
  expectedProfit: 6.65,
  slippage: 0.3
}

Formula: minAmountOut = amountIn * minPrice * (1 - 0.003)

Time:   <1ms
```

#### **Tool 8: `sign_x402_settlement(token, amount, recipient, agentPrivateKey)`**
```
Input:  token = "0xCRO", amount = 1976000000000000000,
        recipient = "0xUserWallet", agentPrivateKey = "0xAB..."

Process:
  1. Generate nonce: 0x1a2b3c4d...
  2. Build message hash: keccak256(token + amount + recipient + nonce)
  3. Sign with agent wallet using EIP-191
  4. Return signature

Output: X402Settlement = {
  signature: "0x1a2b3c4d5e6f...",
  nonce: "0x1a2b3c4d5e6f...",
  messageHash: "0x5a6b7c8d9e0f...",
  payload: {
    token: "0xCRO",
    amount: 1976000000000000000,
    recipient: "0xUserWallet",
    nonce: "0x1a2b3c4d5e6f..."
  }
}

Security:
  - Uses EIP-191 standard signing
  - Includes nonce for replay protection
  - Signature recoverable for verification

Time:   ~1000ms
```

#### **Tool 9: `execute_arbitrage_trade(routerAddress, swapPath, amountIn, minAmountOut, signer)`**
```
Input:  routerAddress = "0xRouter...",
        swapPath = ["0xUSDC", "0xCRO"],
        amountIn = 1000 * 10^18,
        minAmountOut = 1976 * 10^18,
        signer = ethers.Signer

Process:
  1. Connect to ArbiTraceRouter contract
  2. Call: router.executeStrategy(
       USDC,
       1000 * 10^18,
       [USDC, CRO],
       1976 * 10^18
     )
  3. Broadcast to Cronos blockchain
  4. Wait for mempool confirmation

Output: TradeExecution = {
  txHash: "0x1a2b3c4d5e6f...",
  status: "pending",
  timestamp: 1705094400000,
  confirmationTime: 0
}

On-Chain: Router pulls from Vault, swaps on VVS, captures profit

Time:   ~2000ms (broadcast) + ~3000ms (confirmation)
```

#### **Tool 10: `track_trade_result(tradeId, txHash, amountIn, amountOut, gasCost, success)`**
```
Input:  tradeId = "trade_123",
        txHash = "0x1a2b3c4d5e6f...",
        amountIn = 1000 * 10^18,
        amountOut = 1978 * 10^18,
        gasCost = 0.45,
        success = true

Calculation:
  profit = (amountOut - amountIn) - gasCost
         = (1978 - 1000) - 0.45
         = 977.55 (in USDC equivalent)
  gasUsed = gasCost / 0.0000005 ≈ 1,955,000
  efficiency = profit / gasCost = 977.55 / 0.45 ≈ 2171.33x

Output: TradeResult = {
  tradeId: "trade_123",
  timestamp: 1705094405000,
  txHash: "0x1a2b3c4d5e6f...",
  tokenIn: "USDC",
  amountIn: 1000 * 10^18,
  tokenOut: "CRO",
  amountOut: 1978 * 10^18,
  profit: 977.55,
  gasUsed: 1955000,
  efficiency: 2171.33,
  success: true
}

Storage: Saved to database for analytics

Time:   ~500ms
```

---

## 🔄 Complete Trade Example

**Scenario**: CRO/USDC arbitrage on Jan 12, 2026

```
[14:32:15.000] Agent Loop Start
├─ Tool 1: fetch_crypto_com_prices(["CRO"])
│  └─ Response: {symbol: "CRO", price: 0.0850}
│
├─ Tool 2: fetch_vvs_pool_data("0x123ABC...")
│  └─ Response: {price0In1: 0.0856}
│
├─ Tool 3: calculate_spread(0.0850, 0.0856, 1000, 0.45)
│  └─ Response: {
│       spreadPercent: 0.706,
│       netProfit: 6.65,
│       confidence: 89,
│       recommendation: "BUY"
│     }
│
├─ Recommendation = "BUY" → Continue
│
├─ Tool 4: get_gas_prices()
│  └─ Response: {gasPrice: 125.5, estimatedCost: 0.45}
│
├─ Tool 5: fetch_historical_trades(50)
│  └─ Response: {winRate: 76.3%, sharpeRatio: 2.34}
│
├─ Decision: Spread > 0.5% ✓, Win Rate > 70% ✓
│   → Proceed to execution
│
├─ Tool 6: validate_trade_opportunity(1000, 2000, -150, 5000, 5)
│  └─ Response: {isValid: true, riskScore: 35}
│
├─ Tool 7: build_swap_instruction(...)
│  └─ Response: {
│       path: ["0xUSDC", "0xCRO"],
│       minAmountOut: 1976 * 10^18,
│       expectedProfit: 6.65
│     }
│
├─ Tool 8: sign_x402_settlement(...)
│  └─ Response: {
│       signature: "0x1a2b3c...",
│       nonce: "0x5a6b7c...",
│     }
│
├─ Tool 9: execute_arbitrage_trade(...)
│  └─ Response: {
│       txHash: "0xabcd1234...",
│       status: "pending"
│     }
│
├─ Wait for confirmation... (3 seconds)
│
├─ Tool 10: track_trade_result(...)
│  └─ Response: {
│       tradeId: "trade_342",
│       profit: 6.65,
│       efficiency: 14.78x,
│       success: true
│     }
│
├─ Update State:
│  ├─ totalTrades: 341 → 342
│  ├─ winCount: 261 → 262
│  ├─ totalProfit: 34,126.50 → 34,133.15
│  ├─ winRate: 76.2% → 76.3%
│  └─ circuitBreakerActive: false
│
└─ Next loop in 30 seconds...

[14:32:45.000] Agent Loop Start (cycle 2)
```

---

## 📊 Tool Performance Targets

| Tool | Time | Calls/Min | Success Rate | Notes |
|------|------|-----------|--------------|-------|
| 1: CEX Prices | 500ms | 120 | 99.9% | API-dependent |
| 2: DEX Data | 1000ms | 60 | 99.5% | On-chain read |
| 3: Spread Calc | <1ms | 60000 | 100% | Local computation |
| 4: Gas Prices | 500ms | 120 | 99.8% | RPC-dependent |
| 5: Historical | 2000ms | 30 | 99% | DB query |
| 6: Validate | <1ms | 60000 | 100% | Local validation |
| 7: Build Swap | <1ms | 60000 | 100% | Local computation |
| 8: Sign x402 | 1000ms | 60 | 100% | Crypto signing |
| 9: Execute | 2000ms | 30 | 98% | Blockchain tx |
| 10: Track | 500ms | 120 | 99.5% | DB write |

---

## 🎯 Tool Dependencies & Ordering

```
Tool 1 ──┐
Tool 2 ──┤──→ Tool 3 ──→ Decision: Profitable?
Tool 4 ──┘                    │
Tool 5 ─────────────→ (No) ─→ Exit
                        │
                      (Yes)
                        │
Tool 6 ─→ Decision: Risk OK?
              │
            (No) ─→ Exit
              │
            (Yes)
              │
Tool 7 ─→ Tool 8 ─→ Tool 9 ─→ Tool 10
```

**Critical Path**: Tool 1, 2, 3, 6, 7, 8, 9, 10
**Optional Path**: Tool 4, 5 (for information only)

---

## ⚡ Optimization Tips

1. **Parallel Calls**: Tools 1, 2, 4, 5 can run in parallel
2. **Caching**: Cache historical trades for 60 seconds
3. **Batch Calls**: Check multiple token pairs per cycle
4. **Early Exit**: Skip execution if spread < 0.3%
5. **Circuit Breaker**: Stop checking after 3 losses in a row

---

This reference covers **EVERY tool, every parameter, every output**, 
and **how they connect together**.

You now have everything you need to understand, modify, and deploy the agent! 🚀
