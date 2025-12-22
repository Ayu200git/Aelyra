import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import { StatusCodes } from 'http-status-codes';

import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import userRoutes from './routes/userRoutes.js';
import imageRoutes from './routes/imageRoutes.js';

import { logger } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 8080;

connectDB();
 
app.use(helmet());
 
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

 
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(compression());
app.use(mongoSanitize());
 
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/user', userRoutes);
app.use('/api/image', imageRoutes);

app.get('/api/health', (req, res) => {
  res.status(StatusCodes.OK).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

app.all('*', (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err.message);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err.message);
});

export default app;
