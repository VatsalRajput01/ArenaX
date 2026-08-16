// client/js/socketClient.js
import * as Events from '/shared/events.js';

// Define Backend URL dynamically
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : 'https://arenax-tt62.onrender.com';

// Connect explicitly to the backend URL
const socket = io(BACKEND_URL);

// Session Identity Management
socket.on('connect', () => {
  let savedSessionId = null;
  try {
    savedSessionId = localStorage.getItem('arenaX_sessionId');
  } catch (error) {
    console.warn('Local storage is not accessible. Proceeding with temporary session.');
  }
  socket.emit(Events.C2S_AUTHENTICATE, savedSessionId);
});

socket.on(Events.S2C_SESSION_ASSIGNED, (newSessionId) => {
  try {
    localStorage.setItem('arenaX_sessionId', newSessionId);
  } catch (error) {
    console.warn('Could not persist session identity to local storage.');
  }
});

export const getSessionId = () => {
  try {
    return localStorage.getItem('arenaX_sessionId');
  } catch (error) {
    return null;
  }
};

export const getSocketId = () => socket.id;

// Client to Server Transmissions
export const createRoom = (callback) => {
  socket.emit(Events.C2S_CREATE_ROOM, callback);
};

export const joinRoom = (roomId, callback) => {
  socket.emit(Events.C2S_JOIN_ROOM, roomId, callback);
};

export const makeMove = (index) => {
  socket.emit(Events.C2S_MAKE_MOVE, { index });
};

export const sendReadySignal = () => {
  socket.emit(Events.C2S_PLAYER_READY);
};

export const requestRematch = () => {
  socket.emit(Events.C2S_REMATCH);
};

export const leaveRoom = () => {
  socket.emit(Events.C2S_LEAVE_ROOM);
};

export const sendPing = (timestamp) => {
  socket.emit(Events.C2S_PING, timestamp);
};

export const sendChatMessage = (message, callback) => {
  socket.emit(Events.C2S_CHAT_MESSAGE, message, callback);
};

export const sendTypingState = (isTyping) => {
  socket.emit(Events.C2S_TYPING, isTyping);
};

export const setUsername = (name) => {
  socket.emit(Events.C2S_SET_USERNAME, name);
};

// Server to Client Listeners
export const onPlayerJoined = (callback) => {
  socket.on(Events.S2C_PLAYER_JOINED, callback);
};

export const onReadyUpdate = (callback) => {
  socket.on(Events.S2C_PLAYER_READY_CHANGED, callback);
};

export const onGameStart = (callback) => {
  socket.on(Events.S2C_GAME_START, callback);
};

export const onBoardUpdate = (callback) => {
  socket.on(Events.S2C_BOARD_UPDATE, callback);
};

export const onError = (callback) => {
  socket.on(Events.S2C_ERROR, callback);
};

export const onRoomReset = (callback) => {
  socket.on(Events.S2C_ROOM_RESET, callback);
};

export const onPlayerDisconnected = (callback) => {
  socket.on(Events.S2C_PLAYER_LEFT, callback);
};

export const onRematchRequested = (callback) => {
  socket.on(Events.S2C_REMATCH_REQUESTED, callback);
};

export const onPlayerDisconnectedWaiting = (callback) => {
  socket.on(Events.S2C_PLAYER_DISCONNECTED_WAITING, callback);
};

export const onPlayerReconnected = (callback) => {
  socket.on(Events.S2C_PLAYER_RECONNECTED, callback);
};

export const onRoomRestored = (callback) => {
  socket.on(Events.S2C_ROOM_RESTORED, callback);
};

export const onClientDisconnect = (callback) => {
  socket.on('disconnect', callback);
};

export const onPong = (callback) => {
  socket.on(Events.S2C_PONG, callback);
};

export const onChatMessage = (callback) => {
  socket.on(Events.S2C_CHAT_MESSAGE, callback);
};

export const onTypingState = (callback) => {
  socket.on(Events.S2C_TYPING, callback);
};

export const onUsernamesUpdate = (callback) => {
  socket.on(Events.S2C_USERNAMES_UPDATE, callback);
};