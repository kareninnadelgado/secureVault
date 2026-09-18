import { checkDatabase } from '../services/health.service.js';

export async function getHealth(_req, res) {
  try {
    const result = await checkDatabase();

    return res.status(200).json({
      status: 'ok',
      database: 'connected',
      users: result.users,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);

    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
    });
  }
}