import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { createSocketServer } from './config/socket.js';

// Create HTTP server (required for Socket.io attachment)
const server = http.createServer(app);

// Attach Socket.io to the HTTP server
const io = createSocketServer(server);

// Make io available in controllers via req.app.get('io')
app.set('io', io);

server.listen(env.PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 ServMate Backend Running`);
  console.log(`🌐 Environment: ${env.NODE_ENV}`);
  console.log(`📡 Port: ${env.PORT}`);
  console.log(`🏥 Health Check: http://localhost:${env.PORT}/api/v1/health`);
  console.log(`🔌 Socket.io: enabled`);
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
