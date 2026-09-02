/**
 * Socket.io Client Singleton (Phase 3)
 *
 * - Creates a single socket connection for the app
 * - Authenticates using the JWT token from localStorage
 * - Connection is lazy (only established when getSocket() is first called)
 * - Automatically reconnects on disconnect
 */

import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api/v1', '')
  : 'http://localhost:5000';

let socket = null;

export const getSocket = () => {
  if (!socket || !socket.connected) {
    const token = localStorage.getItem('token');
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
