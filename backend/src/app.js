import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { AppError } from './utils/AppError.js';

// Route imports — Phase 1 & 2
import healthRoutes from './modules/health/health.routes.js';
import authRoutes from './routes/authRoutes.js';
import serviceCategoryRoutes from './modules/services/serviceCategory.routes.js';
import providerRoutes from './modules/providers/provider.routes.js';
import availabilityRoutes from './modules/availability/availability.routes.js';
import bookingRoutes from './modules/bookings/booking.routes.js';

// Route imports — Phase 3
import conversationRoutes from './modules/conversations/conversation.routes.js';
import bookingPhase3Routes from './modules/bookings/booking.phase3.routes.js';
import providerReviewRoutes from './modules/providers/provider.review.routes.js';
import locationRoutes from './modules/location/location.routes.js';

// Route imports — Phase 4
import aiRoutes from './modules/ai/ai.routes.js';

const app = express();


// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL || '*',
    credentials: true,
  })
);

// Body Parsers & Logger
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// API Routes — Phase 1 & 2
app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/services', serviceCategoryRoutes);
app.use('/api/v1/providers', providerRoutes);
app.use('/api/v1/availability', availabilityRoutes);
app.use('/api/v1/bookings', bookingRoutes);

// API Routes — Phase 3
app.use('/api/v1/conversations', conversationRoutes);
app.use('/api/v1/bookings',      bookingPhase3Routes);   // OTP, proof, review (merged with existing booking base)
app.use('/api/v1/providers',     providerReviewRoutes);  // reviews + trust (merged after provider router)
app.use('/api/v1/location',      locationRoutes);

// API Routes — Phase 4
app.use('/api/v1/ai',            aiRoutes);

// Handle Unknown Routes

app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Centralized Global Error Handler
app.use(errorHandler);

export default app;
