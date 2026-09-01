import app from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 ServMate Backend Running`);
  console.log(`🌐 Environment: ${env.NODE_ENV}`);
  console.log(`📡 Port: ${env.PORT}`);
  console.log(`🏥 Health Check: http://localhost:${env.PORT}/api/v1/health`);
  console.log(`=================================`);
});

// Handle Unhandled Rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle Uncaught Exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', err);
  process.exit(1);
});
