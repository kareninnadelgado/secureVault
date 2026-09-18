import express from 'express';
import helmet from 'helmet';

import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';

import { corsMiddleware } from './middleware/cors.middleware.js';
import { globalRateLimiter } from './middleware/rateLimit.middleware.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

app.disable('x-powered-by');

app.use(helmet());
app.use(corsMiddleware);

app.use(express.json());
app.use(globalRateLimiter);

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.use(notFoundHandler);

app.use(errorHandler);

export default app;