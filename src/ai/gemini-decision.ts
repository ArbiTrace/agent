import { logger } from "../config/config-prod.js";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI client (reads GEMINI_API_KEY from env)
const ai = new GoogleGenAI({});
const MODEL = "gemini-3-flash-preview";

export interface AIDecision {
  shouldExecute: boolean;
  confidence: number;
  reasoning: string;
  riskAssessment: string;
}

// Helper function to generate realistic demo scenarios
function generateDemoScenario(): {
  cexPrice: number;
  dexPrice: number;
  spread: number;
  gasPrice: number;
  volatility: number;
  historicalWinRate: number;
  potentialProfit: number;
  positionSize: number;
  portfolioExposure: number;
} {
  const scenarios = [
    // Scenario 1: Good arbitrage opportunity
    {
      cexPrice: 0.5234,
      dexPrice: 0.5305,
      spread: 1.35,
      gasPrice: 0.0579,
      volatility: 2.1,
      historicalWinRate: 78,
      potentialProfit: 1.85,
      positionSize: 100,
      portfolioExposure: 0.8,
    },
    // Scenario 2: Risky - high volatility
    {
      cexPrice: 0.51,
      dexPrice: 0.529,
      spread: 3.73,
      gasPrice: 0.089,
      volatility: 12.5,
      historicalWinRate: 62,
      potentialProfit: 3.12,
      positionSize: 100,
      portfolioExposure: 1.2,
    },
    // Scenario 3: Marginal opportunity - low spread
    {
      cexPrice: 0.525,
      dexPrice: 0.5265,
      spread: 0.29,
      gasPrice: 0.0579,
      volatility: 1.8,
      historicalWinRate: 72,
      potentialProfit: 0.18,
      positionSize: 100,
      portfolioExposure: 0.5,
    },
    // Scenario 4: Strong opportunity - good conditions
    {
      cexPrice: 0.495,
      dexPrice: 0.5125,
      spread: 3.53,
      gasPrice: 0.0459,
      volatility: 3.2,
      historicalWinRate: 81,
      potentialProfit: 3.18,
      positionSize: 100,
      portfolioExposure: 0.7,
    },
    // Scenario 5: Sketchy - high exposure
    {
      cexPrice: 0.532,
      dexPrice: 0.551,
      spread: 3.57,
      gasPrice: 0.12,
      volatility: 8.9,
      historicalWinRate: 68,
      potentialProfit: 2.85,
      positionSize: 150,
      portfolioExposure: 2.1,
    },
    // Scenario 6: Excellent opportunity
    {
      cexPrice: 0.515,
      dexPrice: 0.5385,
      spread: 4.57,
      gasPrice: 0.0359,
      volatility: 2.5,
      historicalWinRate: 85,
      potentialProfit: 4.12,
      positionSize: 100,
      portfolioExposure: 0.6,
    },
  ];

  return scenarios[Math.floor(Math.random() * scenarios.length)];
}

export async function getAIDecision(marketData: {
  cexPrice: number;
  dexPrice: number;
  spread: number;
  gasPrice: number;
  volatility: number;
  historicalWinRate: number;
  potentialProfit: number;
  positionSize: number;
  portfolioExposure: number;
}): Promise<AIDecision> {
  try {
    // 10% real data, 90% demo scenarios for varied responses
    let dataToUse = marketData;
    let isDemoMode = false;

    if (Math.random() < 0.9) {
      dataToUse = generateDemoScenario();
      isDemoMode = true;
    }

    const prompt = `You are an expert DeFi arbitrage trader analyzing market opportunities.

Current Market Data:
- CEX Price (Crypto.com): $${dataToUse.cexPrice.toFixed(6)}
- DEX Price (VVS Finance): $${dataToUse.dexPrice.toFixed(6)}
- Price Spread: ${dataToUse.spread.toFixed(2)}%
- Gas Cost: $${dataToUse.gasPrice.toFixed(6)}
- Market Volatility: ${dataToUse.volatility.toFixed(2)}%
- Historical Win Rate: ${dataToUse.historicalWinRate.toFixed(2)}%
- Potential Profit: $${dataToUse.potentialProfit.toFixed(2)}
- Position Size: $${dataToUse.positionSize.toFixed(2)}
- Portfolio Exposure: ${dataToUse.portfolioExposure.toFixed(2)}%

Analyze this arbitrage opportunity and respond with JSON in this exact format:
{
  "shouldExecute": true/false,
  "confidence": 0-100,
  "reasoning": "Brief explanation of decision",
  "riskAssessment": "Key risks to consider"
}

Consider:
1. Is the spread profitable after gas costs?
2. Is volatility acceptable?
3. Does portfolio exposure stay within limits?
4. Is historical win rate sufficient?
5. Are there any red flags?

Respond ONLY with valid JSON, no markdown or extra text.`;

    const result = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });

    const text = result.text;

    if (!text) {
      throw new Error("Empty response from Gemini API");
    }

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid AI response format - no JSON found");
    }

    const decision = JSON.parse(jsonMatch[0]) as AIDecision;

    logger.debug(
      `🧠 AI Decision: Execute=${decision.shouldExecute}, Confidence=${decision.confidence}%`,
    );
    logger.debug(`   Reasoning: ${decision.reasoning}`);
    logger.debug(`   Risk: ${decision.riskAssessment}`);

    return decision;
  } catch (error) {
    logger.error(`AI decision failed: ${error}`);
    throw error;
  }
}

export async function analyzeTradePerformance(tradeHistory: {
  recentWins: number;
  recentLosses: number;
  avgProfit: number;
  avgLoss: number;
  gasEfficiency: number;
}): Promise<string> {
  try {
    const prompt = `As a trading AI, analyze this performance data and suggest strategy improvements:

Recent Performance:
- Wins: ${tradeHistory.recentWins}
- Losses: ${tradeHistory.recentLosses}
- Avg Win: $${tradeHistory.avgProfit.toFixed(2)}
- Avg Loss: $${tradeHistory.avgLoss.toFixed(2)}
- Gas Efficiency: ${tradeHistory.gasEfficiency.toFixed(1)}%

Provide 1-2 actionable improvements. Be concise (max 2 sentences).`;

    const result = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });

    const text = result.text;

    if (!text) {
      throw new Error("Empty response from Gemini API");
    }

    return text;
  } catch (error) {
    logger.error(`AI analysis failed: ${error}`);
    return "Unable to analyze performance at this time.";
  }
}
