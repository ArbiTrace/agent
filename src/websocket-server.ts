import { Server } from 'socket.io';
import { createServer } from 'http';
import { logger } from './config/config-prod.js';

// ============================================================================
// In-Memory Storage (Updated with AI features)
// ============================================================================

export const inMemoryStore = {
  opportunities: [] as any[],
  trades: [] as any[],
  skippedTrades: [] as any[], // NEW: Track AI-rejected trades
  agentStatus: {
    status: 'paused' as 'active' | 'paused' | 'error',
    uptime: 0,
    lastUpdate: Date.now(),
    totalTrades: 0,
    successfulTrades: 0,
    skippedTrades: 0, // NEW
    totalProfit: '0',
    aiEngine: 'Google Gemini 3 Flash', // NEW
    aiResponseTime: 0, // NEW
  },
  portfolio: {
    totalValue: 12450,
    dailyPnL: 234.5,
    dailyPnLPercent: 1.92,
    weeklyPnL: 456.78,
    monthlyPnL: 1234.56,
    currentPositionSize: 0,
    totalExposure: 0,
  },
  aiInsights: { // NEW: Latest AI insights
    lastDecision: null as any,
    lastPerformanceAnalysis: '',
    averageConfidence: 0,
  },
};

// ============================================================================
// WebSocket Server
// ============================================================================

let io: Server | null = null;

export function startWebSocketServer(port: number = 3001) {
  const httpServer = createServer();
  
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`Frontend connected: ${socket.id}`);

    // Send initial data
    socket.emit('agent:status', inMemoryStore.agentStatus);
    socket.emit('portfolio:updated', inMemoryStore.portfolio);
    socket.emit('opportunities:initial', inMemoryStore.opportunities.slice(0, 10));
    socket.emit('trades:initial', inMemoryStore.trades.slice(0, 20));
    console.log('first', inMemoryStore.trades.slice(0, 20));
    socket.emit('ai:insights', inMemoryStore.aiInsights); // NEW

    // Handle client requests
    socket.on('agent:start', () => {
      inMemoryStore.agentStatus.status = 'active';
      inMemoryStore.agentStatus.uptime = Date.now();
      broadcastAgentStatus();
      logger.info('Agent started via frontend');
    });

    socket.on('agent:stop', () => {
      inMemoryStore.agentStatus.status = 'paused';
      broadcastAgentStatus();
      logger.info('Agent stopped via frontend');
    });

    socket.on('disconnect', () => {
      logger.info(`Frontend disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, () => {
    logger.info(`WebSocket server running on port ${port}`);
  });

  return io;
}

// ============================================================================
// Broadcast Functions (Updated)
// ============================================================================

export function broadcastOpportunity(opportunity: any) {
  if (!io) return;
  
  // Add to in-memory store
  inMemoryStore.opportunities.unshift(opportunity);
  if (inMemoryStore.opportunities.length > 50) {
    inMemoryStore.opportunities = inMemoryStore.opportunities.slice(0, 50);
  }
  
  io.emit('opportunity:detected', opportunity);
}

export function broadcastTradeExecuting(trade: any) {
  if (!io) return;
  io.emit('trade:executing', trade);
}

export function broadcastTradeCompleted(trade: any) {
  if (!io) return;
  
  // Add to in-memory store
  inMemoryStore.trades.unshift(trade);
  if (inMemoryStore.trades.length > 100) {
    inMemoryStore.trades = inMemoryStore.trades.slice(0, 100);
  }
  
  // Update stats
  inMemoryStore.agentStatus.totalTrades++;
  if (trade.status === 'success') {
    inMemoryStore.agentStatus.successfulTrades++;
  }
  
  io.emit('trade:completed', trade);
  broadcastAgentStatus();
}

// NEW: Broadcast AI-rejected trade
export function broadcastTradeSkipped(data: any) {
  if (!io) return;
  
  inMemoryStore.skippedTrades.unshift(data);
  if (inMemoryStore.skippedTrades.length > 50) {
    inMemoryStore.skippedTrades = inMemoryStore.skippedTrades.slice(0, 50);
  }
  
  inMemoryStore.agentStatus.skippedTrades++;
  
  io.emit('trade:skipped', data);
  broadcastAgentStatus();
}

// NEW: Broadcast AI decision
export function broadcastAIDecision(decision: any) {
  if (!io) return;
  
  inMemoryStore.aiInsights.lastDecision = decision;
  
  // Calculate average confidence
  if (decision.confidence) {
    const recentDecisions = inMemoryStore.opportunities
      .filter((o: any) => o.aiDecision?.confidence)
      .slice(0, 10);
    
    if (recentDecisions.length > 0) {
      const avgConfidence = recentDecisions.reduce(
        (sum: number, o: any) => sum + o.aiDecision.confidence, 
        0
      ) / recentDecisions.length;
      inMemoryStore.aiInsights.averageConfidence = avgConfidence;
    }
  }
  
  io.emit('ai:decision', decision);
  io.emit('ai:insights', inMemoryStore.aiInsights);
}

// NEW: Broadcast AI performance insights
export function broadcastAIInsights(insights: string) {
  if (!io) return;
  
  inMemoryStore.aiInsights.lastPerformanceAnalysis = insights;
  
  io.emit('ai:insights', inMemoryStore.aiInsights);
}

export function broadcastAgentStatus() {
  if (!io) return;
  inMemoryStore.agentStatus.lastUpdate = Date.now();
  io.emit('agent:status_changed', inMemoryStore.agentStatus);
}

export function broadcastPortfolio(portfolio: any) {
  if (!io) return;
  inMemoryStore.portfolio = { ...inMemoryStore.portfolio, ...portfolio };
  io.emit('portfolio:updated', inMemoryStore.portfolio);
}

export function broadcastRiskWarning(warning: any) {
  if (!io) return;
  io.emit('risk:warning', warning);
}