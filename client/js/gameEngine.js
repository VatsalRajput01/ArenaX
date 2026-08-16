// client/js/gameEngine.js
import * as CONSTANTS from './constants.js';

const GameEngine = {

    // Evaluates the board to determine if there is a winner or a draw
    checkWin: function (board) {
        const winningCombinations = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];

        for (let combo of winningCombinations) {
            const [a, b, c] = combo;

            if (board[a] !== CONSTANTS.SYMBOLS.EMPTY &&
                board[a] === board[b] &&
                board[a] === board[c]) {
                return board[a];
            }
        }

        if (!board.includes(CONSTANTS.SYMBOLS.EMPTY)) return CONSTANTS.OUTCOMES.DRAW;
        return null;
    },

    // Determines the next move for the computer opponent based on the selected difficulty level
    calculateAiMove: function (board, difficulty) {
        const emptySpots = board.map((val, idx) => val === CONSTANTS.SYMBOLS.EMPTY ? idx : null).filter(val => val !== null);

        if (emptySpots.length === 0) return null;

        if (difficulty === CONSTANTS.DIFFICULTIES.EASY) {
            return emptySpots[Math.floor(Math.random() * emptySpots.length)];
        }
        else if (difficulty === CONSTANTS.DIFFICULTIES.MEDIUM) {
            if (Math.random() > 0.5) return this.getBestMove(board);
            return emptySpots[Math.floor(Math.random() * emptySpots.length)];
        }
        else {
            return this.getBestMove(board);
        }
    },

    // Implements the minimax algorithm to calculate the optimal move
    getBestMove: function (board) {
        let bestScore = -Infinity;
        let move = null;

        for (let i = 0; i < 9; i++) {
            if (board[i] === CONSTANTS.SYMBOLS.EMPTY) {
                board[i] = CONSTANTS.SYMBOLS.P2;
                let score = this.minimax(board, 0, false);
                board[i] = CONSTANTS.SYMBOLS.EMPTY;

                if (score > bestScore) {
                    bestScore = score;
                    move = i;
                }
            }
        }
        return move;
    },

    // Recursive function to evaluate all possible future board states
    minimax: function (board, depth, isMaximizing) {
        let result = this.checkWin(board);
        if (result === CONSTANTS.SYMBOLS.P2) return 10 - depth;
        if (result === CONSTANTS.SYMBOLS.P1) return depth - 10;
        if (result === CONSTANTS.OUTCOMES.DRAW) return 0;

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === CONSTANTS.SYMBOLS.EMPTY) {
                    board[i] = CONSTANTS.SYMBOLS.P2;
                    let score = this.minimax(board, depth + 1, false);
                    board[i] = CONSTANTS.SYMBOLS.EMPTY;
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === CONSTANTS.SYMBOLS.EMPTY) {
                    board[i] = CONSTANTS.SYMBOLS.P1;
                    let score = this.minimax(board, depth + 1, true);
                    board[i] = CONSTANTS.SYMBOLS.EMPTY;
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    }
};

export default GameEngine;