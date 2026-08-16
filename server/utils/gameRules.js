// server/utils/gameRules.js

/**
 * Game Rules and Board Evaluation
 * Contains the core logic for detecting win conditions and draws.
 * This module is strictly designed for server-side execution to prevent client manipulation.
 */

/**
 * Matrix of all possible winning line indices on a standard 3x3 grid.
 */
const WINNING_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/**
 * @typedef {Object} GameResult
 * @property {'playing'|'won'|'draw'} status
 * @property {'X'|'O'|null} winner
 * @property {number[]|null} winningLine
 */

/**
 * Evaluates the current state of the board to determine if there is a winner or a draw.
 *
 * @param {string[]} board - Array representing the nine cells of the grid
 * @returns {GameResult} The evaluated outcome of the current board state
 */
function evaluateBoard(board) {
  for (const line of WINNING_COMBINATIONS) {
    const [a, b, c] = line;
    const mark = board[a];
    if (mark && mark === board[b] && mark === board[c]) {
      return { status: 'won', winner: mark, winningLine: line };
    }
  }

  const isDraw = board.every((cell) => cell !== '');
  if (isDraw) {
    return { status: 'draw', winner: null, winningLine: null };
  }

  return { status: 'playing', winner: null, winningLine: null };
}

/**
 * Initializes a standard empty 3x3 board array.
 * 
 * @returns {string[]} An array of nine empty strings
 */
function createEmptyBoard() {
  return ['', '', '', '', '', '', '', '', ''];
}

module.exports = {
  WINNING_COMBINATIONS,
  evaluateBoard,
  createEmptyBoard,
};