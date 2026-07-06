import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { connectDB } from './config/db';
import { logger } from './config/logger';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';
import { socketManager } from './sockets/socket.manager';

const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 5000;

// Initialize configurations
connectDB();

// Global Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routing API
app.use('/api/v1', apiRouter);

// Undefined Routes Interceptor
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Centralized Error Handler
app.use(errorHandler);

// Initialize Socket.IO server bind
socketManager.initialize(server);

// Start listening
server.listen(PORT, () => {
  logger.info(`SafeRide AI Server started on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
});

// Handle graceful terminations
const handleShutdown = (signal: string) => {
  logger.warn(`${signal} received. Initiating graceful shutdown...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
