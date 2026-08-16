// server/socket/eventHandlers.js

const crypto = require('crypto');
const RoomManager = require('../state/roomManager');
const Events = require('../../shared/events');
const TicTacToeEngine = require('../gameEngine/ticTacToeEngine');

const moveRateLimits = new Map();
const RATE_LIMIT_MS = 200;

const chatRateLimits = new Map();
const CHAT_LIMIT = 5;
const CHAT_TIME_WINDOW = 3000;
const CHAT_MUTE_DURATION = 5000;

const activeSockets = new Map();
const globalUsernames = new Map();

const sessionToRoom = new Map();

function normalizeName(name) {
  if (!name) return "Player";
  const raw = name.trim().substring(0, 12);
  if (raw.length === 0) return "Player";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

const registerEventHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`[ArenaX] New socket connection detected: ${socket.id}`);

    // Handle client authentication and session assignment
    socket.on(Events.C2S_AUTHENTICATE, (clientSessionId) => {
      // Prevent re-authenticating the same socket to avoid memory leaks
      if (socket.isAuthenticated) return;
      socket.isAuthenticated = true;

      // Validate UUID format
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      let sessionId = (clientSessionId && typeof clientSessionId === 'string' && UUID_RE.test(clientSessionId))
        ? clientSessionId
        : crypto.randomUUID();

      socket.sessionId = sessionId;

      if (activeSockets.has(sessionId)) {
        const oldSocket = activeSockets.get(sessionId);
        if (oldSocket.id !== socket.id) {
          console.log(`[ArenaX] Kicking old socket for Session ${sessionId}`);
          oldSocket.disconnect(true);
        }
      }
      activeSockets.set(sessionId, socket);

      socket.emit(Events.S2C_SESSION_ASSIGNED, sessionId);
      console.log(`[ArenaX] Socket ${socket.id} authenticated as Player ${sessionId}`);

      const playerRoomInfo = RoomManager.findPlayerRoom(sessionId);

      if (playerRoomInfo) {
        RoomManager.cancelDisconnectTimer(playerRoomInfo.roomId, sessionId);
        socket.join(playerRoomInfo.roomId);
        broadcastNamesToRoom(playerRoomInfo.roomId, io);
        socket.roomId = playerRoomInfo.roomId;
        playerRoomInfo.room.connected[sessionId] = true;

        const snapshot = {
          roomId: playerRoomInfo.roomId,
          room: playerRoomInfo.room,
          mySymbol: playerRoomInfo.symbol,
          status: playerRoomInfo.status,
          shouldResumeGame: playerRoomInfo.status === 'playing'
        };

        if (playerRoomInfo.status === 'playing') {
          RoomManager.startTurnTimer(playerRoomInfo.roomId, io);
          snapshot.room.gameState.turnDeadline = RoomManager.getRoom(playerRoomInfo.roomId).gameState.turnDeadline;
        }

        socket.emit(Events.S2C_ROOM_RESTORED, snapshot);
        socket.to(playerRoomInfo.roomId).emit(Events.S2C_PLAYER_RECONNECTED, playerRoomInfo.room);
      }
    });

    // Register event listeners for the authenticated session
    socket.on(Events.C2S_CHAT_MESSAGE, (message, callback) => {
      if (!socket.roomId || !socket.sessionId || typeof message !== 'string') return;

      const now = Date.now();
      let tracker = chatRateLimits.get(socket.sessionId) || { count: 0, windowStart: now, mutedUntil: 0 };

      if (now < tracker.mutedUntil) {
        socket.emit(Events.S2C_ERROR, { message: "Spam detected. Chat muted for 5 seconds." });
        if (typeof callback === 'function') callback({ error: "Muted" });
        return;
      }

      if (now - tracker.windowStart > CHAT_TIME_WINDOW) {
        tracker.count = 1;
        tracker.windowStart = now;
      } else {
        tracker.count++;
        if (tracker.count > CHAT_LIMIT) {
          tracker.mutedUntil = now + CHAT_MUTE_DURATION;
          socket.emit(Events.S2C_ERROR, { message: "Spam detected. Chat muted for 5 seconds." });
          chatRateLimits.set(socket.sessionId, tracker);
          if (typeof callback === 'function') callback({ error: "Spam" });
          return;
        }
      }
      chatRateLimits.set(socket.sessionId, tracker);

      const cleanMessage = message.trim().substring(0, 80);
      if (cleanMessage.length === 0) return;

      const room = RoomManager.getRoom(socket.roomId);
      if (room) {
        if (!room.chatHistory) room.chatHistory = [];
        room.chatHistory.push({ senderId: socket.sessionId, text: cleanMessage, sentAt: now });
        if (room.chatHistory.length > 50) room.chatHistory.shift();
      }

      socket.to(socket.roomId).emit(Events.S2C_CHAT_MESSAGE, {
        senderId: socket.sessionId,
        text: cleanMessage,
        sentAt: now
      });

      if (typeof callback === 'function') {
        callback({ success: true, text: cleanMessage });
      }
    });

    socket.on(Events.C2S_TYPING, (isTyping) => {
      if (!socket.roomId || !socket.sessionId) return;
      socket.to(socket.roomId).emit(Events.S2C_TYPING, {
        senderId: socket.sessionId,
        isTyping: !!isTyping
      });
    });

    socket.on(Events.C2S_SET_USERNAME, (name) => {
      if (!socket.sessionId || typeof name !== 'string') return;
      const cleanName = normalizeName(name);
      globalUsernames.set(socket.sessionId, cleanName);
      if (socket.roomId) {
        broadcastNamesToRoom(socket.roomId, io);
      }
    });

    function broadcastNamesToRoom(roomId, io) {
      const room = RoomManager.getRoom(roomId);
      if (room) {
        const nameMap = {};
        for (let sid in room.players) {
          nameMap[sid] = globalUsernames.get(sid) || 'PLAYER';
        }
        io.to(roomId).emit(Events.S2C_USERNAMES_UPDATE, nameMap);
      }
    }

    socket.on(Events.C2S_CREATE_ROOM, (callback) => {
      if (typeof callback !== 'function') return;
      if (!socket.sessionId) return callback({ error: 'Not authenticated' });
      if (socket.roomId) return callback({ error: 'You must leave your current room first.' });

      const initialState = TicTacToeEngine.createInitialState();
      const roomId = RoomManager.createRoom(socket.sessionId, initialState);

      // Handle failure in room generation
      if (!roomId) return callback({ error: 'Unable to create room. Please try again.' });

      socket.join(roomId);
      broadcastNamesToRoom(roomId, io);
      socket.roomId = roomId;

      // Store session location for retrieval
      sessionToRoom.set(socket.sessionId, roomId);

      callback({ success: true, roomId, symbol: 'X' });
    });

    socket.on(Events.C2S_JOIN_ROOM, (roomId, callback) => {
      if (typeof callback !== 'function') return;
      if (typeof roomId !== 'string' || !socket.sessionId) return callback({ error: 'Invalid request' });
      if (socket.roomId) return callback({ error: 'You must leave your current room first.' });

      const result = RoomManager.joinRoom(roomId, socket.sessionId);
      if (result.error) {
        callback({ error: result.error });
      } else {
        socket.join(roomId);
        broadcastNamesToRoom(roomId, io);
        socket.roomId = roomId;

        sessionToRoom.set(socket.sessionId, roomId);

        if (result.reconnected) {
          io.to(roomId).emit(Events.S2C_PLAYER_RECONNECTED, result.room);
        } else {
          io.to(roomId).emit(Events.S2C_PLAYER_JOINED, result.room);
        }
        callback({ success: true, room: result.room, symbol: result.symbol });
      }
    });

    socket.on(Events.C2S_PLAYER_READY, () => {
      const roomId = socket.roomId;
      const sessionId = socket.sessionId;
      if (!roomId || !sessionId) return;

      // Verify room state before processing the ready signal
      const room = RoomManager.getRoom(roomId);
      if (!room || room.status !== 'waiting' || !room.players[sessionId]) return;

      const result = RoomManager.togglePlayerReady(roomId, sessionId);
      if (result) {
        io.to(roomId).emit(Events.S2C_PLAYER_READY_CHANGED, result.room);
        if (result.isGameReady) {
          RoomManager.startTurnTimer(roomId, io);
          io.to(roomId).emit(Events.S2C_GAME_START, result.room);
        }
      }
    });

    socket.on(Events.C2S_MAKE_MOVE, (payload) => {
      if (!payload || typeof payload !== 'object') return;
      const { index } = payload;
      const roomId = socket.roomId;
      const sessionId = socket.sessionId;

      if (!roomId || !sessionId || typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index > 8) {
        return;
      }
      const now = Date.now();
      const lastMove = moveRateLimits.get(sessionId) || 0;
      if (now - lastMove < RATE_LIMIT_MS) {
        return;
      }
      moveRateLimits.set(sessionId, now);

      const room = RoomManager.getRoom(roomId);
      if (!room || room.status !== 'playing') {
        socket.emit(Events.S2C_ERROR, { message: "Desync Detected. Please Refresh the Page." });
        return;
      }

      const playerSymbol = room.players[sessionId];
      if (!playerSymbol) return;

      const moveResult = TicTacToeEngine.processMove(room.gameState, playerSymbol, index);
      if (moveResult.success) {
        RoomManager.updateGameState(roomId, moveResult.state, moveResult.isGameOver, io);

        if (!moveResult.isGameOver) {
          RoomManager.startTurnTimer(roomId, io);
          moveResult.state.turnDeadline = RoomManager.getRoom(roomId).gameState.turnDeadline;
        }

        io.to(roomId).emit(Events.S2C_BOARD_UPDATE, moveResult.state);
      }
    });

    socket.on(Events.C2S_REMATCH, () => {
      const roomId = socket.roomId;
      const sessionId = socket.sessionId;
      if (!roomId || !sessionId) return;

      // Verify room state before allowing a rematch request
      const room = RoomManager.getRoom(roomId);
      if (!room || room.status !== 'finished' || !room.players[sessionId]) return;

      const result = RoomManager.setPlayerRematch(roomId, sessionId);
      if (result) {
        if (result.isRematchReady) {
          RoomManager.clearPostGameTimers(roomId);
          const initialState = TicTacToeEngine.createInitialState();
          const newRoom = RoomManager.resetRoomState(roomId, initialState);
          if (newRoom) {
            newRoom.status = 'playing';
            for (let p in newRoom.ready) {
              newRoom.ready[p] = true;
            }
            RoomManager.startTurnTimer(roomId, io);
            io.to(roomId).emit(Events.S2C_GAME_START, newRoom);
          }
        } else {
          socket.to(roomId).emit(Events.S2C_REMATCH_REQUESTED);
          RoomManager.startRematchTimeout(roomId, io);
        }
      }
    });

    socket.on(Events.C2S_LEAVE_ROOM, () => {
      const roomId = socket.roomId;
      const sessionId = socket.sessionId;
      if (!roomId || !sessionId) return;

      const initialState = TicTacToeEngine.createInitialState();
      RoomManager.removePlayer(roomId, sessionId, initialState);
      socket.leave(roomId);
      socket.roomId = null;

      moveRateLimits.delete(sessionId);
      chatRateLimits.delete(sessionId);
      globalUsernames.delete(sessionId);

      sessionToRoom.delete(sessionId);

      io.to(roomId).emit(Events.S2C_PLAYER_LEFT);
    });

    socket.on('disconnect', () => {
      console.log(`[ArenaX] Socket disconnected: ${socket.id}`);

      if (socket.sessionId) {
        const isActiveSocket = activeSockets.get(socket.sessionId)?.id === socket.id;

        if (isActiveSocket) {
          activeSockets.delete(socket.sessionId);

          if (socket.roomId) {
            socket.to(socket.roomId).emit(Events.S2C_TYPING, { senderId: socket.sessionId, isTyping: false });
            RoomManager.handleDisconnect(socket.roomId, socket.sessionId, io);
          } else {
            moveRateLimits.delete(socket.sessionId);
            chatRateLimits.delete(socket.sessionId);
            globalUsernames.delete(socket.sessionId);
          }
        } else {
          console.log(`[ArenaX] Ignored disconnect for stale socket: ${socket.id}.`);
        }
      }
    });

    socket.on(Events.C2S_PING, (timestamp) => {
      socket.emit(Events.S2C_PONG, timestamp);
    });
  });
};

// Release memory resources for sessions that have completely disconnected
const cleanupSessionData = (sessionId) => {
  if (!sessionId) return;
  moveRateLimits.delete(sessionId);
  chatRateLimits.delete(sessionId);
  globalUsernames.delete(sessionId);

  sessionToRoom.delete(sessionId);

  console.log(`[ArenaX] Memory maps cleaned for abandoned session: ${sessionId}`);
};

module.exports = { registerEventHandlers, cleanupSessionData, sessionToRoom };