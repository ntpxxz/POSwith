import express from 'express';
import prisma from '../db/prisma.js';

const router = express.Router();

const startTime = Date.now();

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  database: {
    connected: boolean;
    responseTime?: number;
  };
  version?: string;
}

router.get('/', async (req, res) => {
  try {
    const startCheck = Date.now();

    // Test database connectivity
    let dbConnected = false;
    let dbResponseTime = 0;

    try {
      const dbStartTime = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
      dbResponseTime = Date.now() - dbStartTime;
    } catch (error) {
      dbConnected = false;
    }

    const uptime = Date.now() - startTime;

    const response: HealthCheckResponse = {
      status: dbConnected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime,
      database: {
        connected: dbConnected,
        ...(dbConnected && { responseTime: dbResponseTime }),
      },
      version: process.env.API_VERSION || '1.0.0',
    };

    const statusCode = dbConnected ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      database: {
        connected: false,
      },
    });
  }
});

// Liveness probe (quick check that app is running)
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe (checks if app is ready to handle traffic)
router.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      reason: 'Database unavailable',
    });
  }
});

export default router;
