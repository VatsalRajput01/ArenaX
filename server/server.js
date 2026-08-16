// server/server.js

/**
 * Server Entry Point (PURE BACKEND)
 * Initializes Express for Health Checks and Socket.IO for real-time communication.
 * Maintains authoritative game state on the server.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { registerEventHandlers } = require('./socket/eventHandlers');

// Configuration setup
const PORT = process.env.PORT || 3000;

const app = express();

// Health check endpoint for deployment monitoring (Render uses this to check if server is awake)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'arenax-backend', timestamp: Date.now() });
});

// Initialize HTTP server and Socket.IO
const server = http.createServer(app);

// CORS Configured to accept connections from ANY frontend (Netlify, Localhost, etc.)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 25000,
  pingTimeout: 20000,
});

// Register real-time event handlers
registerEventHandlers(io);

// Start the server
server.listen(PORT, () => {
  console.log(`[ArenaX Backend] Socket Server listening on port: ${PORT}`);
  console.log('[ArenaX Backend] Running in Decoupled Mode (No UI Serving)');
});

// Process-level exception handler to prevent process termination
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception prevented server crash:', err);
});