import cors from 'cors';

const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

export const corsMiddleware = cors({
  origin: allowedOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
});