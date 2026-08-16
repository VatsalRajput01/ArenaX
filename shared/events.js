// shared/events.js

// shared/events.js
/**
 * Socket Event Constants
 * Centralized definitions for client-server communication.
 */

// Connection and Session Management
const S2C_SESSION_ASSIGNED = 's2c:session_assigned';
const C2S_AUTHENTICATE = 'c2s:authenticate';

// Lobby and Room Lifecycle
const C2S_CREATE_ROOM = 'c2s:create_room';
const C2S_JOIN_ROOM = 'c2s:join_room';
const C2S_PLAYER_READY = 'c2s:player_ready';

const S2C_ROOM_CREATED = 's2c:room_created';
const S2C_ROOM_JOINED = 's2c:room_joined';
const S2C_PLAYER_JOINED = 's2c:player_joined';
const S2C_PLAYER_LEFT = 's2c:player_left';
const S2C_PLAYER_READY_CHANGED = 's2c:player_ready_changed';
const S2C_GAME_START = 's2c:game_start';

// In-Game Actions and State
const C2S_MAKE_MOVE = 'c2s:make_move';
const C2S_REMATCH = 'c2s:rematch';
const C2S_LEAVE_ROOM = 'c2s:leave_room';

const S2C_BOARD_UPDATE = 's2c:board_update';
const S2C_ERROR = 's2c:error';
const S2C_ROOM_RESET = 's2c:room_reset';
const S2C_REMATCH_REQUESTED = 's2c:rematch_requested';

// Session Recovery and Reconnection
const S2C_PLAYER_DISCONNECTED_WAITING = 's2c:player_disconnected_waiting';
const S2C_PLAYER_RECONNECTED = 's2c:player_reconnected';
const S2C_ROOM_RESTORED = 's2c:room_restored';

// Network Latency Checks
const C2S_PING = 'c2s:ping';
const S2C_PONG = 's2c:pong';

// Live Chat Communication
const C2S_CHAT_MESSAGE = 'c2s:chat_message';
const S2C_CHAT_MESSAGE = 's2c:chat_message';

// Typing Indicators
const C2S_TYPING = 'c2s:typing';
const S2C_TYPING = 's2c:typing';

// Player Identity
const C2S_SET_USERNAME = 'c2s:set_username';
const S2C_USERNAMES_UPDATE = 's2c:usernames_update';

module.exports = {
  S2C_SESSION_ASSIGNED,
  C2S_AUTHENTICATE,
  C2S_CREATE_ROOM,
  C2S_JOIN_ROOM,
  C2S_PLAYER_READY,
  S2C_ROOM_CREATED,
  S2C_ROOM_JOINED,
  S2C_PLAYER_JOINED,
  S2C_PLAYER_LEFT,
  S2C_PLAYER_READY_CHANGED,
  S2C_GAME_START,
  C2S_MAKE_MOVE,
  C2S_REMATCH,
  C2S_LEAVE_ROOM,
  S2C_BOARD_UPDATE,
  S2C_ERROR,
  S2C_ROOM_RESET,
  S2C_REMATCH_REQUESTED,
  S2C_PLAYER_DISCONNECTED_WAITING,
  S2C_PLAYER_RECONNECTED,
  S2C_ROOM_RESTORED,
  C2S_PING,
  S2C_PONG,
  C2S_CHAT_MESSAGE,
  S2C_CHAT_MESSAGE,
  C2S_TYPING,
  S2C_TYPING,
  C2S_SET_USERNAME,
  S2C_USERNAMES_UPDATE
};