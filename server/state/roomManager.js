// server/state/roomManager.js

const { generateRoomId, normalizeRoomId } = require('../utils/idGenerator');

const rooms = new Map();
const disconnectTimers = new Map();
const turnTimers = new Map();
const postGameTimers = new Map();
const TURN_TIMEOUT_MS = 30000;

const RoomManager = {
  createRoom: (hostId, initialGameState) => {
    let roomId;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    do {
      roomId = generateRoomId();
      attempts++;
      if (attempts > MAX_ATTEMPTS) return null;
    } while (rooms.has(roomId));

    rooms.set(roomId, {
      id: roomId,
      players: { [hostId]: 'X' },
      ready: { [hostId]: false },
      rematch: { [hostId]: false },
      connected: { [hostId]: true },
      startingTurn: 'X',
      status: 'waiting',
      gameState: initialGameState,
      chatHistory: [],
      scores: { 'X': 0, 'O': 0 }
    });

    console.log(`[RoomManager] Room created: ${roomId} by Player ${hostId}`);
    return roomId;
  },

  joinRoom: (rawRoomId, playerId) => {
    const roomId = normalizeRoomId(rawRoomId);
    const room = rooms.get(roomId);

    if (!room) return { error: 'ROOM NOT FOUND' };

    if (room.players[playerId]) {
      room.connected[playerId] = true;
      const timerKey = `${roomId}_${playerId}`;

      if (disconnectTimers.has(timerKey)) {
        clearTimeout(disconnectTimers.get(timerKey));
        disconnectTimers.delete(timerKey);
      }
      console.log(`[RoomManager] Player ${playerId} RECONNECTED to Room ${roomId}`);
      return { success: true, room, reconnected: true, symbol: room.players[playerId] };
    }

    if (Object.keys(room.players).length >= 2) return { error: 'ROOM IS FULL' };

    // Assign the remaining character symbol to the joining participant
    const existingSymbols = Object.values(room.players);
    const assignedSymbol = existingSymbols.includes('X') ? 'O' : 'X';

    room.players[playerId] = assignedSymbol;
    room.ready[playerId] = false;
    room.rematch[playerId] = false;
    room.connected[playerId] = true;

    console.log(`[RoomManager] Player ${playerId} joined Room ${roomId} as [${assignedSymbol}]`);
    return { success: true, room, reconnected: false, symbol: assignedSymbol };
  },

  togglePlayerReady: (roomId, playerId) => {
    const room = rooms.get(roomId);
    if (room) {
      room.ready[playerId] = !room.ready[playerId];
      const players = Object.keys(room.ready);
      if (players.length === 2 && room.ready[players[0]] && room.ready[players[1]]) {
        room.status = 'playing';
        return { isGameReady: true, room };
      }
      return { isGameReady: false, room };
    }
    return null;
  },

  setPlayerRematch: (roomId, playerId) => {
    const room = rooms.get(roomId);
    if (room) {
      room.rematch[playerId] = true;
      const players = Object.keys(room.rematch);
      if (players.length === 2 && room.rematch[players[0]] && room.rematch[players[1]]) {
        return { isRematchReady: true, room };
      }
      return { isRematchReady: false, room };
    }
    return null;
  },

  resetRoomState: (roomId, initialGameState) => {
    const room = rooms.get(roomId);
    if (room) {
      room.status = 'waiting';
      for (let p in room.ready) {
        room.ready[p] = false;
        room.rematch[p] = false;
      }

      // Alternate the starting turn for sequential matches
      room.startingTurn = room.startingTurn === 'X' ? 'O' : 'X';

      room.gameState = initialGameState;
      // Override the default configuration with the alternated turn
      room.gameState.turn = room.startingTurn;

      RoomManager.clearTurnTimer(roomId);
    }
    return room;
  },

  getRoom: (roomId) => {
    return rooms.get(normalizeRoomId(roomId));
  },

  updateGameState: (roomId, newState, isGameOver, io) => {
    const room = rooms.get(normalizeRoomId(roomId));
    if (room) {
      room.gameState = newState;
      if (isGameOver) {
        room.status = 'finished';
        RoomManager.clearTurnTimer(roomId);

        // Persist match scores within the server memory structure
        if (newState.winner && newState.winner !== 'Draw') {
          if (!room.scores) room.scores = { 'X': 0, 'O': 0 };
          room.scores[newState.winner]++;
        }

        // Initialize inactivity timers upon match completion
        if (io) RoomManager.startPostGameTimer(roomId, io);
      }
      return true;
    }
    return false;
  },

  removePlayer: (roomId, playerId) => {
    const normalizedId = normalizeRoomId(roomId);
    const room = rooms.get(normalizedId);

    if (room) {
      RoomManager.clearPostGameTimers(normalizedId);
      RoomManager.clearTurnTimer(normalizedId);

      // Execute absolute room destruction upon any permanent participant exit
      rooms.delete(normalizedId);
      console.log(`[RoomManager] Room destroyed: ${normalizedId} (Participant ${playerId} exited)`);
    }
  },

  handleDisconnect: (roomId, playerId, io) => {
    const normalizedId = normalizeRoomId(roomId);
    const room = rooms.get(normalizedId);

    if (room && room.players[playerId]) {
      room.connected[playerId] = false;
      console.log(`[RoomManager] Player ${playerId} offline. Countdown started for Room ${normalizedId}`);

      // Calculate remaining duration and suspend the active turn timer
      if (room.gameState && room.gameState.turnDeadline) {
        room.gameState.remainingTime = Math.max(0, room.gameState.turnDeadline - Date.now());
        room.gameState.turnDeadline = null;
      }
      RoomManager.clearTurnTimer(normalizedId);

      const Events = require('../../shared/events');
      io.to(normalizedId).emit(Events.S2C_PLAYER_DISCONNECTED_WAITING);

      const timerId = setTimeout(() => {
        console.log(`[RoomManager] Player ${playerId} failed to reconnect. Destroying room.`);
        RoomManager.removePlayer(normalizedId, playerId);
        io.to(normalizedId).emit(Events.S2C_PLAYER_LEFT);
        disconnectTimers.delete(`${normalizedId}_${playerId}`);

        // Trigger external handler cleanup to free associated memory
        const { cleanupSessionData } = require('../socket/eventHandlers');
        if (typeof cleanupSessionData === 'function') {
          cleanupSessionData(playerId);
        }

      }, 30000);

      disconnectTimers.set(`${normalizedId}_${playerId}`, timerId);
    }
  },

  // Initialize active turn timer
  startTurnTimer: (roomId, io) => {
    const normalizedId = normalizeRoomId(roomId);
    const room = rooms.get(normalizedId);
    if (!room || room.status !== 'playing') return;

    const turnPlayerId = Object.keys(room.players).find(pid => room.players[pid] === room.gameState.turn);
    if (turnPlayerId && room.connected[turnPlayerId] === false) {
      console.log(`[RoomManager] Turn timer paused because active player is offline.`);
      return;
    }

    RoomManager.clearTurnTimer(normalizedId);

    // Handle timer precision and zero-value fallback
    const duration = (room.gameState.remainingTime !== null && room.gameState.remainingTime !== undefined)
      ? room.gameState.remainingTime
      : TURN_TIMEOUT_MS;
    room.gameState.remainingTime = null;

    // Record deadline for subsequent validation
    room.gameState.turnDeadline = Date.now() + duration;

    const timerId = setTimeout(() => {
      // Remove the expired timer reference to maintain memory hygiene
      turnTimers.delete(normalizedId);

      const currentRoom = rooms.get(normalizedId);
      if (currentRoom && currentRoom.status === 'playing') {
        console.log(`[RoomManager] Timeout in Room ${normalizedId}`);

        // Process default win condition upon duration expiration
        const loserSymbol = currentRoom.gameState.turn;
        const winnerSymbol = loserSymbol === 'X' ? 'O' : 'X';

        currentRoom.gameState.winner = winnerSymbol;
        currentRoom.gameState.winReason = 'timeout';
        currentRoom.status = 'finished';

        // Persist the timeout match outcome
        if (winnerSymbol && winnerSymbol !== 'Draw') {
          if (!currentRoom.scores) currentRoom.scores = { 'X': 0, 'O': 0 };
          currentRoom.scores[winnerSymbol]++;
        }

        RoomManager.startPostGameTimer(normalizedId, io);

        const Events = require('../../shared/events');
        io.to(normalizedId).emit(Events.S2C_BOARD_UPDATE, currentRoom.gameState);
      }
    }, duration);

    turnTimers.set(normalizedId, timerId);
  },

  // Cancel active turn timer
  clearTurnTimer: (roomId) => {
    const normalizedId = normalizeRoomId(roomId);
    if (turnTimers.has(normalizedId)) {
      clearTimeout(turnTimers.get(normalizedId));
      turnTimers.delete(normalizedId);
    }
  },

  // Search active session mapping across all instances
  findPlayerRoom: (sessionId) => {
    for (let [roomId, room] of rooms.entries()) {
      if (room.players[sessionId]) {
        return {
          roomId: roomId,
          room: room,
          symbol: room.players[sessionId],
          status: room.status
        };
      }
    }
    return null;
  },

  // Cancel pending disconnection sequence upon successful network recovery
  cancelDisconnectTimer: (roomId, playerId) => {
    const timerKey = `${roomId}_${playerId}`;
    if (disconnectTimers.has(timerKey)) {
      clearTimeout(disconnectTimers.get(timerKey));
      disconnectTimers.delete(timerKey);
      console.log(`[RoomManager] Disconnect timer cancelled for Player ${playerId}`);
    }
  },

  // Inactivity and Idle Session Management
  startPostGameTimer: (roomId, io) => {
    const normalizedId = normalizeRoomId(roomId);
    RoomManager.clearPostGameTimers(normalizedId);

    const timerId = setTimeout(() => {
      postGameTimers.delete(normalizedId);

      const room = rooms.get(normalizedId);
      if (room && room.status === 'finished') {
        console.log(`[RoomManager] Room ${normalizedId} destroyed due to inactivity.`);
        const Events = require('../../shared/events');
        io.to(normalizedId).emit(Events.S2C_ERROR, { message: "Room Closed due to Inactivity." });
        io.to(normalizedId).emit(Events.S2C_PLAYER_LEFT);
        rooms.delete(normalizedId);
      }
    }, 60000);

    postGameTimers.set(normalizedId, timerId);
  },

  startRematchTimeout: (roomId, io) => {
    const normalizedId = normalizeRoomId(roomId);
    RoomManager.clearPostGameTimers(normalizedId);

    const timerId = setTimeout(() => {
      postGameTimers.delete(normalizedId);

      const room = rooms.get(normalizedId);
      if (room && room.status === 'finished') {
        console.log(`[RoomManager] Room ${normalizedId} destroyed due to ignored rematch request.`);
        const Events = require('../../shared/events');
        io.to(normalizedId).emit(Events.S2C_ERROR, { message: "Opponent is not Responding. Room Closed." });
        io.to(normalizedId).emit(Events.S2C_PLAYER_LEFT);
        rooms.delete(normalizedId);
      }
    }, 30000);

    postGameTimers.set(normalizedId, timerId);
  },

  clearPostGameTimers: (roomId) => {
    const normalizedId = normalizeRoomId(roomId);
    if (postGameTimers.has(normalizedId)) {
      clearTimeout(postGameTimers.get(normalizedId));
      postGameTimers.delete(normalizedId);
    }
  },
};

module.exports = RoomManager;