// client/js/app.js
import * as SocketClient from './socketClient.js';
import AudioEngine from './audioEngine.js';
import GameEngine from './gameEngine.js';
import UIManager from './uiManager.js';
import ChatManager from './chatManager.js';
import * as CONSTANTS from './constants.js';

// Initialize the chat manager
ChatManager.init();

// Synchronize active player profile highlights and visual timers
function updateTurnProfiles(currentTurn) {
  const p1 = document.getElementById('p1Profile');
  const p2 = document.getElementById('p2Profile');
  const p1Ring = document.getElementById('p1Ring');
  const p2Ring = document.getElementById('p2Ring');
  const p1Sym = document.getElementById('p1Avatar').innerText;

  p1Ring.classList.remove('glow-green', 'glow-yellow', 'glow-red');
  p2Ring.classList.remove('glow-green', 'glow-yellow', 'glow-red');

  if (currentTurn === p1Sym) {
    p1.classList.add('is-active'); p1.classList.remove('is-waiting');
    p2.classList.add('is-waiting'); p2.classList.remove('is-active');

    if (currentMode !== CONSTANTS.MODES.ONLINE) {
      p1Ring.style.setProperty('--timer-deg', '360deg');
      p1Ring.style.setProperty('--timer-color', '#00FF66');
      p1Ring.classList.add('glow-green');
      p2Ring.style.setProperty('--timer-deg', '0deg');
      p2Ring.style.setProperty('--timer-color', 'transparent');
    }
  } else {
    p2.classList.add('is-active'); p2.classList.remove('is-waiting');
    p1.classList.add('is-waiting'); p1.classList.remove('is-active');

    if (currentMode !== CONSTANTS.MODES.ONLINE) {
      p2Ring.style.setProperty('--timer-deg', '360deg');
      p2Ring.style.setProperty('--timer-color', '#00FF66');
      p2Ring.classList.add('glow-green');
      p1Ring.style.setProperty('--timer-deg', '0deg');
      p1Ring.style.setProperty('--timer-color', 'transparent');
    }
  }
}

// DOM Element References
const p1ScoreDisplay = document.getElementById('p1Score');
const p2ScoreDisplay = document.getElementById('p2Score');
const btnLeaveMatch = document.getElementById('btnLeaveMatch');

const btnToggleChat = document.getElementById('btnToggleChat');
const chatPanel = document.getElementById('chatPanel');
const btnCloseChat = document.getElementById('btnCloseChat');

const btnPlayComputer = document.getElementById('btnPlayComputer');
const btnPlayLocal = document.getElementById('btnPlayLocal');
const btnPlayOnline = document.getElementById('btnPlayOnline');
const btnBackToMenu = document.getElementById('btnBackToMenu');

const btnCreateRoom = document.getElementById('btnCreateRoom');
const btnReady = document.getElementById('btnReady');
const roomHint = document.getElementById('roomHint');

const chatContainer = document.getElementById('chatContainer');
const matchSummaryModal = document.getElementById('matchSummaryModal');
const summaryTitle = document.getElementById('summaryTitle');
const summaryP1Name = document.getElementById('summaryP1Name');
const summaryP2Name = document.getElementById('summaryP2Name');
const summaryP1Score = document.getElementById('summaryP1Score');
const summaryP2Score = document.getElementById('summaryP2Score');
const summaryP2Msg = document.getElementById('summaryP2Msg');
const btnSummaryRematch = document.getElementById('btnSummaryRematch');
const btnSummaryLeave = document.getElementById('btnSummaryLeave');

const cells = document.querySelectorAll('.grid-cell');
const btnLeaveLobby = document.getElementById('btnLeaveLobby');

const menuViewDefault = document.getElementById('menuViewDefault');
const menuViewAI = document.getElementById('menuViewAI');
const btnBackFromAI = document.getElementById('btnBackFromAI');
const diffButtons = document.querySelectorAll('.diff-btn');

const btnCopyCode = document.getElementById('btnCopyCode');
const btnShareCode = document.getElementById('btnShareCode');

// Manage header visibility across different application states
const siteHeader = document.querySelector('.site-header');
function setHeaderVisibility(isVisible) {
  const headerEl = document.querySelector('header');
  if (headerEl) {
    if (isVisible) {
      headerEl.classList.remove('hidden-header');
    } else {
      headerEl.classList.add('hidden-header');
    }
  }
}

// Global application state variables
let currentRoomId = null;
let mySymbol = null;
let currentMode = null;

let turnTimerInterval = null;
let autoRematchTimeout = null;

let aiMoveTimeout = null;
let currentMatchGeneration = 0;

let localStartingTurn = CONSTANTS.SYMBOLS.P1;
let aiStartingTurn = CONSTANTS.SYMBOLS.P1;
let wasDisconnected = false;

let localBoard = Array(9).fill(CONSTANTS.SYMBOLS.EMPTY);
let localTurn = CONSTANTS.SYMBOLS.P1;
let isLocalGameOver = false;
let localScore = { [CONSTANTS.SYMBOLS.P1]: 0, [CONSTANTS.SYMBOLS.P2]: 0 };

let onlineScore = { [CONSTANTS.SYMBOLS.P1]: 0, [CONSTANTS.SYMBOLS.P2]: 0 };
let isOnlineGameOverProcessed = false;

let aiDifficulty = CONSTANTS.DIFFICULTIES.HARD;
let isComputerThinking = false;

const modalUsernameInput = document.getElementById('modalUsernameInput');
const btnSaveModalName = document.getElementById('btnSaveModalName');
const btnCloseEditName = document.getElementById('btnCloseEditName');

let currentRoomData = null;
let roomUsernames = {};
let myUsername = localStorage.getItem('arenaX_username') || '';

// Transmit username to server upon initialization if one exists locally
if (myUsername) {
  setTimeout(() => { SocketClient.setUsername(myUsername); }, 1200);
}

// Player identity and username modal handling
function saveCustomName() {
  const rawName = modalUsernameInput.value.trim();

  if (rawName.length > 0) {
    myUsername = rawName;
    localStorage.setItem('arenaX_username', myUsername);
    SocketClient.setUsername(myUsername);

    UIManager.showToast("Player Name Updated Successfully!", "success");
    AudioEngine.success();
    UIManager.hideModal('editNameModal');
    if (currentRoomData) updateRoomUI(currentRoomData);
  }
}

btnSaveModalName.addEventListener('click', saveCustomName);
modalUsernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') saveCustomName();
});
btnCloseEditName.addEventListener('click', () => {
  UIManager.hideModal('editNameModal');
});

// Main menu navigation and screen transitions
btnPlayOnline.addEventListener('click', () => {
  currentMode = CONSTANTS.MODES.ONLINE;
  ChatManager.setMode(currentMode);
  UIManager.showScreen('lobbyPanel');
  setHeaderVisibility(false);

  setTimeout(() => {
    const firstBox = document.querySelector('.code-box');
    if (firstBox) firstBox.focus();
  }, 100);
});

btnBackToMenu.addEventListener('click', () => {
  stopPing();
  currentMode = null;
  ChatManager.setMode(null);
  UIManager.showScreen('mainMenuPanel');
  setHeaderVisibility(true);
});

if (btnCopyCode) {
  btnCopyCode.addEventListener('click', () => {
    if (currentRoomId) {
      navigator.clipboard.writeText(currentRoomId).then(() => {
        UIManager.showToast("Room Code Copied Successfully!", "success");
      });
    }
  });
}

if (btnShareCode) {
  btnShareCode.addEventListener('click', () => {
    if (currentRoomId) {
      const shareUrl = `${window.location.origin}?room=${currentRoomId}`;
      const shareData = {
        title: 'ArenaX — Premium Multiplayer Match',
        text: `⚔️ You've been challenged to a match in ArenaX!\n\n🛡️ Room Code: ${currentRoomId}\n\nTap the link below to securely join the battle arena:`,
        url: shareUrl
      };

      if (navigator.share) {
        navigator.share(shareData).catch((err) => console.log('Share canceled:', err));
      } else {
        navigator.clipboard.writeText(shareUrl).then(() => {
          UIManager.showToast("Invite Link Copied!", "success");
        });
      }
    }
  });
}

// Computer game logic and initialization
function startComputerGame(difficulty, isRematch = false) {
  aiDifficulty = difficulty;
  currentMode = CONSTANTS.MODES.COMPUTER;
  ChatManager.setMode(currentMode);

  if (!isRematch) {
    aiStartingTurn = CONSTANTS.SYMBOLS.P1;
    localScore = { [CONSTANTS.SYMBOLS.P1]: 0, [CONSTANTS.SYMBOLS.P2]: 0 };
  } else {
    aiStartingTurn = aiStartingTurn === CONSTANTS.SYMBOLS.P1 ? CONSTANTS.SYMBOLS.P2 : CONSTANTS.SYMBOLS.P1;
  }

  localBoard = Array(9).fill(CONSTANTS.SYMBOLS.EMPTY);
  localTurn = aiStartingTurn;
  isLocalGameOver = false;
  isComputerThinking = false;
  mySymbol = CONSTANTS.SYMBOLS.P1;

  UIManager.hideModal('gameOverModal');
  UIManager.showScreen('gamePanel');
  setHeaderVisibility(false);
  chatContainer.classList.add('hidden');

  const aiNames = { [CONSTANTS.DIFFICULTIES.EASY]: 'Easy', [CONSTANTS.DIFFICULTIES.MEDIUM]: 'Medium', [CONSTANTS.DIFFICULTIES.HARD]: 'Hard' };

  document.getElementById('p1Name').innerText = "You";
  document.getElementById('p1Role').innerText = "";
  document.getElementById('p2Name').innerText = `AI (${aiNames[aiDifficulty]})`;
  document.getElementById('p2Role').innerText = "";

  document.getElementById('p1Ring').style.setProperty('--timer-deg', '360deg');
  document.getElementById('p2Ring').style.setProperty('--timer-deg', '360deg');
  document.getElementById('p1Ring').style.setProperty('--timer-color', '#00f2ff');
  document.getElementById('p2Ring').style.setProperty('--timer-color', '#FF0055');

  if (turnTimerInterval) clearInterval(turnTimerInterval);
  updateTurnProfiles(localTurn);

  cells.forEach(cell => {
    cell.innerText = '';
    cell.className = 'grid-cell glass-cell';
    cell.style.boxShadow = '';
    cell.style.zIndex = '';
  });

  if (!isRematch) UIManager.showToast(`Engaging ${aiNames[aiDifficulty]}`, "success");

  currentMatchGeneration++;
  if (aiMoveTimeout) clearTimeout(aiMoveTimeout);

  if (localTurn === CONSTANTS.SYMBOLS.P2) {
    isComputerThinking = true;
    const activeGeneration = currentMatchGeneration;

    aiMoveTimeout = setTimeout(() => {
      if (activeGeneration !== currentMatchGeneration) return;

      const aiMoveIndex = GameEngine.calculateAiMove(localBoard, aiDifficulty);
      if (aiMoveIndex !== null) {
        AudioEngine.placeMove();
        handleLocalMove(aiMoveIndex);
      }
      isComputerThinking = false;
    }, 800);
  }
}

btnPlayComputer.addEventListener('click', () => {
  menuViewDefault.classList.remove('active-view');
  menuViewDefault.classList.add('hidden-view-left');
  menuViewAI.classList.remove('hidden-view-right');
  menuViewAI.classList.add('active-view');
});

btnBackFromAI.addEventListener('click', () => {
  menuViewAI.classList.remove('active-view');
  menuViewAI.classList.add('hidden-view-right');
  menuViewDefault.classList.remove('hidden-view-left');
  menuViewDefault.classList.add('active-view');
});

diffButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    const diff = e.target.closest('.diff-btn').getAttribute('data-diff');
    setTimeout(() => {
      menuViewAI.classList.remove('active-view');
      menuViewAI.classList.add('hidden-view-right');
      menuViewDefault.classList.remove('hidden-view-left');
      menuViewDefault.classList.add('active-view');
    }, 500);
    startComputerGame(diff, false);
  });
});

// Local multiplayer game logic
function startLocalGame(isRematch = false) {
  currentMode = CONSTANTS.MODES.LOCAL;
  ChatManager.setMode(currentMode);

  if (!isRematch) {
    localStartingTurn = CONSTANTS.SYMBOLS.P1;
    localScore = { [CONSTANTS.SYMBOLS.P1]: 0, [CONSTANTS.SYMBOLS.P2]: 0 };
  } else {
    localStartingTurn = localStartingTurn === CONSTANTS.SYMBOLS.P1 ? CONSTANTS.SYMBOLS.P2 : CONSTANTS.SYMBOLS.P1;
  }

  localBoard = Array(9).fill(CONSTANTS.SYMBOLS.EMPTY);
  localTurn = localStartingTurn;
  isLocalGameOver = false;
  mySymbol = CONSTANTS.SYMBOLS.P1;

  UIManager.hideModal('gameOverModal');
  UIManager.showScreen('gamePanel');
  setHeaderVisibility(false);
  chatContainer.classList.add('hidden');

  document.getElementById('p1Name').innerText = "Player 1";
  document.getElementById('p1Role').innerText = "";
  document.getElementById('p2Name').innerText = "Player 2";
  document.getElementById('p2Role').innerText = "";

  document.getElementById('p1Ring').style.setProperty('--timer-deg', '360deg');
  document.getElementById('p2Ring').style.setProperty('--timer-deg', '360deg');
  document.getElementById('p1Ring').style.setProperty('--timer-color', '#00f2ff');
  document.getElementById('p2Ring').style.setProperty('--timer-color', '#FF0055');

  if (turnTimerInterval) clearInterval(turnTimerInterval);
  updateTurnProfiles(localTurn);

  cells.forEach(cell => {
    cell.innerText = '';
    cell.className = 'grid-cell glass-cell';
    cell.style.boxShadow = '';
    cell.style.zIndex = '';
  });

  if (!isRematch) UIManager.showToast("Pass & Play Mode Activated!", "success");
}

btnPlayLocal.addEventListener('click', () => {
  startLocalGame(false);
});

// Online multiplayer lobby functionality
btnCreateRoom.addEventListener('click', () => {
  SocketClient.createRoom((response) => {
    if (response.success) {
      currentRoomId = response.roomId;
      mySymbol = response.symbol;
      document.getElementById('roomCodeDisplay').innerText = currentRoomId;
      updateRoomUI({ players: { [SocketClient.getSessionId()]: mySymbol }, ready: {} });
      UIManager.showScreen('roomPanel');
      UIManager.showToast("Room Created Successfully!", "success");
      startPing();
    }
  });
});

const codeBoxes = document.querySelectorAll('.code-box');
if (codeBoxes.length > 0) {
  codeBoxes.forEach((box, index) => {
    box.addEventListener('input', (e) => {
      box.value = box.value.toUpperCase();
      if (box.value.length === 1 && index < codeBoxes.length - 1) {
        codeBoxes[index + 1].focus();
      }
      checkAndSubmitCode();
    });

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && box.value === '' && index > 0) {
        codeBoxes[index - 1].focus();
      }
    });

    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text').toUpperCase().trim().slice(0, 6);
      if (pastedData) {
        for (let i = 0; i < pastedData.length; i++) {
          if (codeBoxes[i]) codeBoxes[i].value = pastedData[i];
        }
        if (pastedData.length < 6) codeBoxes[pastedData.length].focus();
        else codeBoxes[5].focus();
        checkAndSubmitCode();
      }
    });
  });
}

function checkAndSubmitCode() {
  const code = Array.from(codeBoxes).map(b => b.value).join('');

  if (code.length === 6) {
    codeBoxes.forEach(b => b.disabled = true);
    SocketClient.joinRoom(code, (response) => {
      codeBoxes.forEach(b => b.disabled = false);
      if (response.success) {
        currentRoomId = code;
        mySymbol = response.symbol;
        document.getElementById('roomCodeDisplay').innerText = currentRoomId;
        updateRoomUI(response.room);
        UIManager.showScreen('roomPanel');
        UIManager.showToast("Room Joined Successfully!", "success");
        codeBoxes.forEach(b => b.value = '');
        startPing();
      } else {
        UIManager.showToast('Access Denied: ' + response.error, "error");
        AudioEngine.invalidMove();
        codeBoxes.forEach(b => b.value = '');
        codeBoxes[0].focus();
      }
    });
  }
}

btnReady.addEventListener('click', () => {
  if (currentRoomId) SocketClient.sendReadySignal();
});

SocketClient.onUsernamesUpdate((nameMap) => {
  roomUsernames = nameMap;
  if (currentRoomData) updateRoomUI(currentRoomData);
});

// Update the lobby waiting screen and participant statuses
function updateRoomUI(room) {
  currentRoomData = room;
  const playerList = document.getElementById('playerList');
  playerList.innerHTML = '';
  let isOpponentHere = false;
  const myId = SocketClient.getSessionId();

  for (let socketId in room.players) {
    const symbol = room.players[socketId];
    const isMe = socketId === myId;
    const isReady = room.ready[socketId];

    const isConnected = room.connected ? room.connected[socketId] : true;

    const defaultName = symbol === CONSTANTS.SYMBOLS.P1 ? 'Player 1' : 'Player 2';
    let playerName = roomUsernames[socketId];
    if (!playerName || playerName === 'PLAYER') {
      playerName = isMe ? (myUsername || defaultName) : defaultName;
    }

    if (!isMe) isOpponentHere = true;

    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'center';

    const dot = document.createElement('span');
    let statusClass = 'status-dot';
    let statusText = '';

    if (!isConnected) {
      statusClass = 'status-dot offline';
      statusText = ' - Offline';
    } else if (isReady) {
      statusClass = 'status-dot ready';
      statusText = ' - Ready';
    } else {
      statusClass = 'status-dot online';
      statusText = ' - Online';
    }

    dot.className = statusClass;

    const textSpan = document.createElement('span');
    textSpan.innerText = `${playerName} ${isMe ? '(You)' : ''} - [ ${symbol} ]${statusText}`;
    textSpan.style.flex = '1';

    if (isReady) textSpan.style.color = "#00f2ff";
    if (!isConnected) textSpan.style.opacity = "0.4";

    li.appendChild(dot);
    li.appendChild(textSpan);

    if (isMe) {
      const editIcon = document.createElement('button');
      editIcon.type = 'button';
      editIcon.className = 'edit-name-icon flex-center';
      editIcon.title = "Edit Name";
      editIcon.style.padding = '0';
      editIcon.style.minWidth = '32px';
      editIcon.style.minHeight = '32px';
      editIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
      editIcon.addEventListener('click', () => {
        modalUsernameInput.value = myUsername;
        UIManager.showModal('editNameModal');
        setTimeout(() => modalUsernameInput.focus(), 100);
      });
      li.appendChild(editIcon);
    }
    if (isReady) li.style.color = "#00f2ff";
    playerList.appendChild(li);
  }

  if (isOpponentHere) {
    btnReady.disabled = false;
    if (room.ready[myId]) {
      roomHint.innerText = "You are ready. Waiting for opponent...";
      btnReady.innerHTML = "Cancel Ready";
    } else {
      roomHint.innerText = "Both players connected. Press Ready to Play!";
      btnReady.innerHTML = "Ready to Play";
    }
  } else {
    roomHint.innerText = "Waiting for second player to join...";
    btnReady.disabled = true;
    btnReady.innerHTML = 'Waiting<span class="loading-dots"></span>';
  }
}

// Attach input processors to the game board
cells.forEach(cell => {
  cell.addEventListener('click', (e) => {
    const index = e.target.getAttribute('data-index');
    const isEmpty = currentMode === CONSTANTS.MODES.ONLINE ? !e.target.innerText : localBoard[index] === CONSTANTS.SYMBOLS.EMPTY;

    if (!isEmpty || isLocalGameOver || (currentMode === CONSTANTS.MODES.COMPUTER && localTurn !== CONSTANTS.SYMBOLS.P1)) {
      AudioEngine.invalidMove();
      return;
    }

    // Immediate Speed-Breaker: Halt the visual timer and audio feedback upon valid input
    if (turnTimerInterval) {
      clearInterval(turnTimerInterval);
      turnTimerInterval = null;
      if (typeof AudioEngine.stopTickSequence === 'function') {
        AudioEngine.stopTickSequence();
      }
    }

    if (currentMode !== CONSTANTS.MODES.ONLINE) {
      AudioEngine.placeMove();
    }

    if (currentMode === CONSTANTS.MODES.ONLINE && currentRoomId) {
      SocketClient.makeMove(Number(index));
    } else if (currentMode === CONSTANTS.MODES.LOCAL) {
      handleLocalMove(Number(index));
    } else if (currentMode === CONSTANTS.MODES.COMPUTER) {
      handleLocalMove(Number(index));
      if (!isLocalGameOver) {
        isComputerThinking = true;
        const activeGeneration = currentMatchGeneration;

        if (aiMoveTimeout) clearTimeout(aiMoveTimeout);

        aiMoveTimeout = setTimeout(() => {
          if (activeGeneration !== currentMatchGeneration) return;

          const aiMoveIndex = GameEngine.calculateAiMove(localBoard, aiDifficulty);
          if (aiMoveIndex !== null) {
            AudioEngine.placeMove();
            handleLocalMove(aiMoveIndex);
          }
          isComputerThinking = false;
        }, 500);
      }
    }
  });
});

// Network event responders
SocketClient.onPlayerJoined((room) => {
  updateRoomUI(room);
  if (mySymbol === CONSTANTS.SYMBOLS.P1) {
    UIManager.showToast("A new player has joined the room.", "info");
  }
});

SocketClient.onReadyUpdate((room) => {
  updateRoomUI(room);
});

SocketClient.onError((data) => {
  if (data && data.message) {
    UIManager.showSystemAlert(data.message);
    AudioEngine.invalidMove();

    if (data.message.toLowerCase().includes("muted")) {
      ChatManager.disable();

      setTimeout(() => {
        if (currentMode === CONSTANTS.MODES.ONLINE && currentRoomId) {
          ChatManager.enable();
        }
      }, 5000);
    }
  }
});

SocketClient.onGameStart((roomState) => {
  isOnlineGameOverProcessed = false;
  isLocalGameOver = false;

  clearBoardGhosting();

  UIManager.showScreen('gamePanel');
  UIManager.hideModal('matchSummaryModal');
  setHeaderVisibility(false);

  chatContainer.classList.remove('hidden');
  ChatManager.enable();

  // Synchronize scores directly from the server structure upon match start
  if (currentMode === CONSTANTS.MODES.ONLINE && roomState && roomState.scores) {
    onlineScore[CONSTANTS.SYMBOLS.P1] = roomState.scores[CONSTANTS.SYMBOLS.P1] || 0;
    onlineScore[CONSTANTS.SYMBOLS.P2] = roomState.scores[CONSTANTS.SYMBOLS.P2] || 0;

    const myScore = onlineScore[mySymbol] || 0;
    const oppScore = onlineScore[mySymbol === CONSTANTS.SYMBOLS.P1 ? CONSTANTS.SYMBOLS.P2 : CONSTANTS.SYMBOLS.P1] || 0;
    updateScoreAnimated('p1Score', myScore);
    updateScoreAnimated('p2Score', oppScore);
  }

  const myId = SocketClient.getSessionId();
  let oppId = null;
  for (let sid in roomState.players) if (sid !== myId) oppId = sid;

  let mName = myUsername;
  if (!mName || mName === 'PLAYER') mName = 'You';

  let oName = roomUsernames[oppId];
  if (!oName || oName === 'PLAYER') oName = 'Opponent';

  const oppSymbol = mySymbol === CONSTANTS.SYMBOLS.P1 ? CONSTANTS.SYMBOLS.P2 : CONSTANTS.SYMBOLS.P1;

  document.getElementById('p1Avatar').innerText = mySymbol;
  document.getElementById('p1Name').innerText = mName;
  document.getElementById('p1Role').innerText = "";

  document.getElementById('p2Avatar').innerText = oppSymbol;
  document.getElementById('p2Name').innerText = oName;
  document.getElementById('p2Role').innerText = "";

  updateBoardUI(roomState.gameState, false);

  if (roomState.gameState.turn === mySymbol) {
    UIManager.showToast("Game started! You go first.", "success");
  } else {
    UIManager.showToast("Game started! Opponent's turn.", "info");
  }
});

SocketClient.onBoardUpdate((gameState) => {
  updateBoardUI(gameState, true);
});

SocketClient.onRematchRequested(() => {
  UIManager.showToast("Opponent wants to play again! Click 'Play Again' to accept.", "success");
});

SocketClient.onPlayerDisconnected(() => {
  if (!matchSummaryModal.classList.contains('hidden')) {
    summaryP2Msg.classList.remove('hidden');
    btnSummaryRematch.disabled = true;
    btnSummaryRematch.innerText = "Opponent Left";

    setTimeout(() => {
      if (currentRoomId) SocketClient.leaveRoom();
      UIManager.hideModal('matchSummaryModal');
      executeLeaveMatch();
    }, 4000);
  } else {
    if (currentRoomId) SocketClient.leaveRoom();
    executeLeaveMatch();
    UIManager.showSystemAlert("Opponent left the match.");
  }
});

SocketClient.onPlayerDisconnectedWaiting(() => {
  UIManager.showSystemAlert("Opponent lost connection! Game paused.");
  pauseVisualTimer();
});

SocketClient.onPlayerReconnected((room) => {
  UIManager.showSystemAlert("Opponent reconnected! Game is resuming.");
  updateRoomUI(room);
  updateBoardUI(room.gameState, false);
});

SocketClient.onClientDisconnect(() => {
  wasDisconnected = true;
});

function pauseVisualTimer() {
  if (turnTimerInterval) {
    clearInterval(turnTimerInterval);
    turnTimerInterval = null;
    if (typeof AudioEngine.stopTickSequence === 'function') {
      AudioEngine.stopTickSequence();
    }
  }
}

function startVisualTimer(deadline, currentTurn) {
  if (turnTimerInterval) clearInterval(turnTimerInterval);

  const p1Sym = document.getElementById('p1Avatar').innerText;
  const activeRing = currentTurn === p1Sym ? document.getElementById('p1Ring') : document.getElementById('p2Ring');
  const inactiveRing = currentTurn === p1Sym ? document.getElementById('p2Ring') : document.getElementById('p1Ring');

  inactiveRing.style.setProperty('--timer-deg', '0deg');
  inactiveRing.style.setProperty('--timer-color', 'transparent');
  inactiveRing.classList.remove('glow-green', 'glow-yellow', 'glow-red');

  const totalTime = 30000;
  let hasTriggeredTick = false;

  const updateUI = () => {
    const now = Date.now();
    const timeLeft = Math.max(0, deadline - now);
    const timeSecs = Math.ceil(timeLeft / 1000);

    const percentage = (timeLeft / totalTime) * 360;
    activeRing.style.setProperty('--timer-deg', `${percentage}deg`);

    activeRing.classList.remove('glow-green', 'glow-yellow', 'glow-red');

    let ringColor = '#00FF66';
    let glowClass = 'glow-green';

    if (timeSecs <= 20 && timeSecs > 5) {
      ringColor = '#FFD700';
      glowClass = 'glow-yellow';
    } else if (timeSecs <= 5) {
      ringColor = '#FF0055';
      glowClass = 'glow-red';
    }

    activeRing.style.setProperty('--timer-color', ringColor);
    activeRing.classList.add(glowClass);

    if (timeLeft <= 5000 && timeLeft > 0 && !hasTriggeredTick) {
      if (currentTurn === mySymbol) {
        AudioEngine.playTickSequence();
      }
      hasTriggeredTick = true;
    }

    if (timeLeft <= 0) {
      if (currentTurn === mySymbol) {
        AudioEngine.timeUpTing();
      }
      clearInterval(turnTimerInterval);
    }
  };

  updateUI();
  turnTimerInterval = setInterval(updateUI, 50);
}

function updateBoardUI(gameState, playSound = false) {
  updateTurnProfiles(gameState.turn);

  if (turnTimerInterval) {
    clearInterval(turnTimerInterval);
    turnTimerInterval = null;
    if (typeof AudioEngine.stopTickSequence === 'function') {
      AudioEngine.stopTickSequence();
    }
  }

  if (turnTimerInterval) clearInterval(turnTimerInterval);

  let newMoveDetected = false;
  gameState.board.forEach((val, index) => {
    if (cells[index].innerText !== val && val !== CONSTANTS.SYMBOLS.EMPTY) newMoveDetected = true;
    cells[index].innerText = val;
    cells[index].className = 'grid-cell glass-cell';

    cells[index].style.boxShadow = '';
    cells[index].style.zIndex = '';

    if (val === CONSTANTS.SYMBOLS.P1) cells[index].classList.add('x');
    if (val === CONSTANTS.SYMBOLS.P2) cells[index].classList.add('o');
  });

  if (playSound && newMoveDetected && gameState.turn === mySymbol) {
    AudioEngine.placeMove();
  }

  if (gameState.winner) {
    triggerVictoryStrike(gameState.board, gameState.winner, () => {
      if (currentMode === CONSTANTS.MODES.ONLINE && !isOnlineGameOverProcessed) {
        isOnlineGameOverProcessed = true;

        if (gameState.winner !== CONSTANTS.OUTCOMES.DRAW) {
          onlineScore[gameState.winner]++;
        }

        const myScore = onlineScore[mySymbol] || 0;
        const oppScore = onlineScore[mySymbol === CONSTANTS.SYMBOLS.P1 ? CONSTANTS.SYMBOLS.P2 : CONSTANTS.SYMBOLS.P1] || 0;

        updateScoreAnimated('p1Score', myScore);
        updateScoreAnimated('p2Score', oppScore);

        if (gameState.winner === CONSTANTS.OUTCOMES.DRAW) {
          AudioEngine.draw();
          UIManager.showToast("It's a draw!", "info");
        } else {
          if (gameState.winner === mySymbol) {
            AudioEngine.victory();
            UIManager.showToast("You win this match!", "success");
          } else {
            AudioEngine.defeat();
            UIManager.showToast("Opponent wins this match!", "error");
          }
        }

        setTimeout(() => {
          showGameOver(gameState.winner, gameState.winReason);
        }, 1500);
      }
    });
  } else if (gameState.turnDeadline) {
    startVisualTimer(gameState.turnDeadline, gameState.turn);
  }
}

// Match summary and outcome modal presentation
function showGameOver(winner, winReason) {
  if (currentMode !== CONSTANTS.MODES.ONLINE) return;

  UIManager.showModal('matchSummaryModal');

  if (summaryP1Msg) summaryP1Msg.classList.add('hidden');
  if (summaryP2Msg) summaryP2Msg.classList.add('hidden');
  btnSummaryRematch.disabled = false;
  btnSummaryRematch.innerHTML = "Request Rematch";

  summaryP1Name.innerText = document.getElementById('p1Name').innerText;
  summaryP2Name.innerText = document.getElementById('p2Name').innerText;

  const oppSymbol = mySymbol === CONSTANTS.SYMBOLS.P1 ? CONSTANTS.SYMBOLS.P2 : CONSTANTS.SYMBOLS.P1;
  const p1AvatarEl = document.getElementById('summaryP1Avatar');
  const p2AvatarEl = document.getElementById('summaryP2Avatar');
  if (p1AvatarEl) p1AvatarEl.innerText = mySymbol;
  if (p2AvatarEl) p2AvatarEl.innerText = oppSymbol;

  summaryP1Score.innerText = onlineScore[mySymbol] || 0;
  summaryP2Score.innerText = onlineScore[oppSymbol] || 0;

  if (winner === CONSTANTS.OUTCOMES.DRAW) {
    summaryTitle.innerText = "Draw!";
    summaryTitle.style.color = "#e2e8f0";
  } else {
    const isMe = winner === mySymbol;
    summaryTitle.innerText = isMe ? "Victory!" : "Defeat";
    summaryTitle.style.color = isMe ? "#ffffff" : "#FF0055";
  }
}

function clearBoardGhosting() {
  cells.forEach(cell => {
    cell.innerText = '';
    cell.className = 'grid-cell glass-cell';
    cell.style.boxShadow = '';
    cell.style.zIndex = '';
  });

  const gb = document.getElementById('gameBoard');
  if (gb) {
    gb.style.transform = 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  }
}

btnLeaveLobby.addEventListener('click', () => {
  if (currentRoomId) SocketClient.leaveRoom();

  ChatManager.disable();
  ChatManager.clearHistory();
  currentRoomId = null; mySymbol = null;
  if (turnTimerInterval) clearInterval(turnTimerInterval);

  clearBoardGhosting();
  stopPing();

  UIManager.showScreen('mainMenuPanel');
});

// Manage chat panel state and presentation
if (btnToggleChat && chatPanel && btnCloseChat) {
  btnToggleChat.addEventListener('click', () => {
    chatPanel.classList.remove('hidden');
    btnToggleChat.classList.add('icon-hidden');
    btnToggleChat.setAttribute('aria-expanded', 'true');

    // Store the current room ID to persist chat state only for this specific match
    if (currentRoomId) {
      localStorage.setItem('arenaX_chatOpen', currentRoomId);
    }

    setTimeout(() => {
      chatPanel.classList.add('chat-opened');
    }, 10);
    const msgs = document.getElementById('chatMessages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  });

  btnCloseChat.addEventListener('click', () => {
    chatPanel.classList.remove('chat-opened');
    btnToggleChat.classList.remove('icon-hidden');
    btnToggleChat.setAttribute('aria-expanded', 'false');

    localStorage.removeItem('arenaX_chatOpen');

    setTimeout(() => {
      chatPanel.classList.add('hidden');
    }, 300);
    AudioEngine.hover();
  });
}

if (btnSummaryRematch) {
  btnSummaryRematch.addEventListener('click', () => {
    SocketClient.requestRematch();
    btnSummaryRematch.innerHTML = 'Waiting<span class="loading-dots"></span>';
    btnSummaryRematch.disabled = true;
  });
}

if (btnSummaryLeave) {
  btnSummaryLeave.addEventListener('click', () => {
    if (currentRoomId) SocketClient.leaveRoom();
    UIManager.hideModal('matchSummaryModal');
    executeLeaveMatch();
  });
}

SocketClient.onRematchRequested(() => {
  AudioEngine.success();
  btnSummaryRematch.innerHTML = "Accept Rematch";
  btnSummaryRematch.disabled = false;
});

// Process a local game move
function handleLocalMove(index) {
  localBoard[index] = localTurn;
  cells[index].innerText = localTurn;
  cells[index].classList.add(localTurn.toLowerCase());

  const winner = GameEngine.checkWin(localBoard);

  if (winner) {
    isLocalGameOver = true;
    if (winner !== CONSTANTS.OUTCOMES.DRAW) localScore[winner]++;

    triggerVictoryStrike(localBoard, winner, () => {

      updateScoreAnimated('p1Score', localScore[CONSTANTS.SYMBOLS.P1] || 0);
      updateScoreAnimated('p2Score', localScore[CONSTANTS.SYMBOLS.P2] || 0);

      if (winner === CONSTANTS.OUTCOMES.DRAW) {
        AudioEngine.draw();
        UIManager.showToast("It's a draw!", "info");
      } else {
        if (currentMode === CONSTANTS.MODES.COMPUTER) {
          if (winner === CONSTANTS.SYMBOLS.P1) {
            AudioEngine.victory();
            UIManager.showToast("You win!", "success");
          } else {
            AudioEngine.defeat();
            UIManager.showToast("AI wins!", "error");
          }
        } else if (currentMode === CONSTANTS.MODES.LOCAL) {
          AudioEngine.victory();
          const playerName = winner === CONSTANTS.SYMBOLS.P1 ? 'Player 1' : 'Player 2';
          UIManager.showToast(`${playerName} wins!`, "success");
        }
      }

      if (autoRematchTimeout) clearTimeout(autoRematchTimeout);
      autoRematchTimeout = setTimeout(() => {
        if (currentMode === CONSTANTS.MODES.LOCAL) startLocalGame(true);
        else if (currentMode === CONSTANTS.MODES.COMPUTER) startComputerGame(aiDifficulty, true);
      }, 3000);
    });

  } else {
    localTurn = localTurn === CONSTANTS.SYMBOLS.P1 ? CONSTANTS.SYMBOLS.P2 : CONSTANTS.SYMBOLS.P1;
    updateTurnProfiles(localTurn);
  }
}

SocketClient.onRoomRestored((snapshot) => {
  applySnapshot(snapshot);
});

// Rebuild the client state using the server snapshot
function applySnapshot(snapshot) {
  currentRoomId = snapshot.roomId;
  mySymbol = snapshot.mySymbol;
  currentMode = CONSTANTS.MODES.ONLINE;
  ChatManager.setMode(currentMode);
  isLocalGameOver = false;

  if (wasDisconnected) {
    UIManager.showSystemAlert("Session recovered successfully!");
    wasDisconnected = false;
  }

  ChatManager.clearHistory();
  if (snapshot.room.chatHistory && snapshot.room.chatHistory.length > 0) {
    snapshot.room.chatHistory.forEach(msg => {
      const isMe = msg.senderId === SocketClient.getSessionId();
      ChatManager.appendMessage(msg.text, isMe ? 'self' : 'opponent');
    });
    const msgsDiv = document.getElementById('chatMessages');
    if (msgsDiv) msgsDiv.scrollTop = msgsDiv.scrollHeight;
  }

  if (snapshot.status === 'finished') {
    isOnlineGameOverProcessed = true;
  } else {
    isOnlineGameOverProcessed = false;
  }

  if (snapshot.room && snapshot.room.scores) {
    onlineScore[CONSTANTS.SYMBOLS.P1] = snapshot.room.scores[CONSTANTS.SYMBOLS.P1] || 0;
    onlineScore[CONSTANTS.SYMBOLS.P2] = snapshot.room.scores[CONSTANTS.SYMBOLS.P2] || 0;
  }

  const myScore = onlineScore[mySymbol] || 0;
  const oppScore = onlineScore[mySymbol === CONSTANTS.SYMBOLS.P1 ? CONSTANTS.SYMBOLS.P2 : CONSTANTS.SYMBOLS.P1] || 0;

  updateScoreAnimated('p1Score', myScore);
  updateScoreAnimated('p2Score', oppScore);

  if (snapshot.status === 'waiting') {
    document.getElementById('roomCodeDisplay').innerText = currentRoomId;
    updateRoomUI(snapshot.room);
    UIManager.showScreen('roomPanel');
    setHeaderVisibility(false);
  }
  else if (snapshot.status === 'playing' || snapshot.status === 'finished') {
    const myId = SocketClient.getSessionId();
    let oppId = null;
    for (let sid in snapshot.room.players) if (sid !== myId) oppId = sid;

    let mName = myUsername;
    if (!mName || mName === 'PLAYER') mName = 'You';

    let oName = roomUsernames[oppId];
    if (!oName || oName === 'PLAYER') oName = 'Opponent';

    const oppSymbol = mySymbol === CONSTANTS.SYMBOLS.P1 ? CONSTANTS.SYMBOLS.P2 : CONSTANTS.SYMBOLS.P1;

    document.getElementById('p1Avatar').innerText = mySymbol;
    document.getElementById('p1Name').innerText = mName;
    document.getElementById('p1Role').innerText = "";

    document.getElementById('p2Avatar').innerText = oppSymbol;
    document.getElementById('p2Name').innerText = oName;
    document.getElementById('p2Role').innerText = "";

    updateBoardUI(snapshot.room.gameState, false);
    UIManager.showScreen('gamePanel');
    setHeaderVisibility(false);
    chatContainer.classList.remove('hidden');

    ChatManager.enable();
    startPing();

    // Restore chat panel state if it was open for this specific room
    if (localStorage.getItem('arenaX_chatOpen') === currentRoomId) {
      setTimeout(() => { btnToggleChat.click(); }, 100);
    }

    if (snapshot.status === 'finished') {
      setTimeout(() => {
        showGameOver(snapshot.room.gameState.winner, snapshot.room.gameState.winReason);

        if (oppId && snapshot.room.rematch && snapshot.room.rematch[oppId]) {
          const btnRematch = document.getElementById('btnSummaryRematch');
          if (btnRematch) {
            btnRematch.innerHTML = "Accept Rematch";
            btnRematch.disabled = false;
          }
        }
      }, 300);
    }
  }
}

let pingInterval;
function startPing() {
  UIManager.togglePingBadge(true);
  UIManager.updatePing("--");
  if (pingInterval) clearInterval(pingInterval);
  pingInterval = setInterval(() => { SocketClient.sendPing(Date.now()); }, 2000);
}

function stopPing() {
  if (pingInterval) clearInterval(pingInterval);
  UIManager.togglePingBadge(false);
}

SocketClient.onPong((serverTimestamp) => {
  const latency = Date.now() - serverTimestamp;
  UIManager.updatePing(latency);
});

document.querySelectorAll('button, .emoji-opt').forEach(el => {
  el.addEventListener('mouseenter', () => { if (!el.disabled) AudioEngine.hover(); });
  el.addEventListener('mousedown', () => { if (!el.disabled) AudioEngine.click(); });
});

document.querySelectorAll('.grid-cell').forEach(el => {
  el.addEventListener('mouseenter', () => {
    if (!el.innerText.trim()) AudioEngine.hover();
  });
});

// Evaluate the board geometry to trace the winning configuration
function getWinningLine(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (let combo of lines) {
    if (board[combo[0]] !== CONSTANTS.SYMBOLS.EMPTY && board[combo[0]] === board[combo[1]] && board[combo[0]] === board[combo[2]]) {
      return combo;
    }
  }
  return null;
}

// Highlight the winning combination on the game board
function triggerVictoryStrike(board, winner, callback) {
  if (winner === CONSTANTS.OUTCOMES.DRAW) {
    setTimeout(callback, 500);
    return;
  }

  const winLine = getWinningLine(board);
  if (winLine) {
    cells.forEach((cell, idx) => {
      if (winLine.includes(idx)) {
        cell.classList.add('winner-cell');
        if (winner === CONSTANTS.SYMBOLS.P1) cell.style.boxShadow = '0 0 35px rgba(0, 242, 255, 0.9)';
        if (winner === CONSTANTS.SYMBOLS.P2) cell.style.boxShadow = '0 0 35px rgba(255, 0, 85, 0.9)';
      } else {
        cell.classList.add('dim-cell');
      }
    });

    setTimeout(callback, 1500);
  } else {
    callback();
  }
}

const gameBoardElement = document.getElementById('gameBoard');

if (gameBoardElement) {
  gameBoardElement.parentElement.style.perspective = '1000px';
  let baseRect = null;

  gameBoardElement.addEventListener('mouseenter', () => {
    // Only apply the 3D effect if the browser is running on a desktop environment
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    gameBoardElement.style.transition = 'transform 0.1s ease-out';
    baseRect = gameBoardElement.getBoundingClientRect();
  });

  gameBoardElement.addEventListener('mousemove', (e) => {
    if (!baseRect || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const x = e.clientX - baseRect.left;
    const y = e.clientY - baseRect.top;
    const centerX = baseRect.width / 2;
    const centerY = baseRect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;
    gameBoardElement.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
  });

  gameBoardElement.addEventListener('mouseleave', () => {
    if (!baseRect) return;
    baseRect = null;
    gameBoardElement.style.transform = 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    gameBoardElement.style.transition = 'transform 0.5s ease-out';
  });
}

function updateScoreAnimated(elementId, newScore) {
  const el = document.getElementById(elementId);
  if (el.innerText !== String(newScore)) {
    el.classList.remove('score-animate');
    void el.offsetWidth;
    el.innerText = newScore;
    el.classList.add('score-animate');
  }
}

const leaveConfirmModal = document.getElementById('leaveConfirmModal');
const btnCancelLeave = document.getElementById('btnCancelLeave');
const btnConfirmLeave = document.getElementById('btnConfirmLeave');

btnLeaveMatch.addEventListener('click', () => {
  if (currentMode === CONSTANTS.MODES.ONLINE && currentRoomId) {
    UIManager.showModal('leaveConfirmModal');
    AudioEngine.invalidMove();
  } else {
    executeLeaveMatch();
  }
});

btnCancelLeave.addEventListener('click', () => {
  UIManager.hideModal('leaveConfirmModal');
});

btnConfirmLeave.addEventListener('click', () => {
  UIManager.hideModal('leaveConfirmModal');
  if (currentMode === CONSTANTS.MODES.ONLINE && currentRoomId) {
    SocketClient.leaveRoom();
  }
  executeLeaveMatch();
});

// Completely reset application state and user interface upon leaving a match
function executeLeaveMatch() {
  if (autoRematchTimeout) clearTimeout(autoRematchTimeout);
  if (turnTimerInterval) clearInterval(turnTimerInterval);

  if (aiMoveTimeout) clearTimeout(aiMoveTimeout);
  currentMatchGeneration++;

  stopPing();
  ChatManager.disable();
  ChatManager.clearHistory();
  clearBoardGhosting();

  // Reset the chat panel visual state 
  if (chatPanel && btnToggleChat) {
    chatPanel.classList.remove('chat-opened');
    chatPanel.classList.add('hidden');
    btnToggleChat.classList.remove('icon-hidden');
    btnToggleChat.setAttribute('aria-expanded', 'false');
  }

  // Clear persistent chat state when leaving the room
  localStorage.removeItem('arenaX_chatOpen');

  currentRoomId = null;
  mySymbol = null;
  currentMode = null;
  isLocalGameOver = false;
  isOnlineGameOverProcessed = false;
  isComputerThinking = false;
  wasDisconnected = false;

  localBoard = Array(9).fill(CONSTANTS.SYMBOLS.EMPTY);
  localTurn = CONSTANTS.SYMBOLS.P1;
  localStartingTurn = CONSTANTS.SYMBOLS.P1;
  aiStartingTurn = CONSTANTS.SYMBOLS.P1;

  localScore = { [CONSTANTS.SYMBOLS.P1]: 0, [CONSTANTS.SYMBOLS.P2]: 0 };
  onlineScore = { [CONSTANTS.SYMBOLS.P1]: 0, [CONSTANTS.SYMBOLS.P2]: 0 };
  document.getElementById('p1Score').innerText = '0';
  document.getElementById('p2Score').innerText = '0';

  UIManager.showScreen('mainMenuPanel');
  setHeaderVisibility(true);
}

// Ensure the socket maintains synchronization when returning from a background state
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (currentMode === CONSTANTS.MODES.ONLINE && currentRoomId) {
      SocketClient.sendPing(Date.now());
    }
  }
});

// Deep link auto-join implementation
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get('room');

  if (roomCode && roomCode.length === 6) {
    btnPlayOnline.click();

    const boxes = document.querySelectorAll('.code-box');
    const upperCode = roomCode.toUpperCase();

    for (let i = 0; i < 6; i++) {
      if (boxes[i]) boxes[i].value = upperCode[i];
    }

    setTimeout(() => {
      if (typeof checkAndSubmitCode === 'function') {
        checkAndSubmitCode();
      }

      window.history.replaceState({}, document.title, window.location.pathname);
    }, 600);
  }
});

// Progressive Web App (PWA) Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('[ArenaX] Service Worker registered with scope:', registration.scope);
    }).catch((error) => {
      console.error('[ArenaX] Service Worker registration failed:', error);
    });
  });
}

// Network State Observers for Offline/Online handling
window.addEventListener('offline', () => {
  UIManager.showSystemAlert("Connection Lost! Operating in offline mode.");
});

window.addEventListener('online', () => {
  UIManager.showSystemAlert("Back Online! Network connection restored.");
  if (currentMode === CONSTANTS.MODES.ONLINE && currentRoomId) {
    SocketClient.sendPing(Date.now());
  }
});