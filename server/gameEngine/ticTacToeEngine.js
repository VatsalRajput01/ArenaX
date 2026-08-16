// server/gameEngine/ticTacToeEngine.js

const { evaluateBoard, createEmptyBoard } = require('../utils/gameRules');

const TicTacToeEngine = {
    /**
     * Initializes the starting state for a match.
     * Defines the standard structure required by the state manager.
     */
    createInitialState: (startingTurn = 'X') => {
        return {
            gameId: 'tic-tac-toe',
            board: createEmptyBoard(),
            turn: startingTurn,
            winner: null,
            winningLine: null
        };
    },

    /**
     * Processes a move request, validates it against the current state, 
     * and calculates the resulting game state.
     */
    processMove: (currentState, playerSymbol, index) => {
        // Validate if the move is allowed based on turn progression, match completion, and cell availability
        if (
            currentState.winner ||
            currentState.turn !== playerSymbol ||
            currentState.board[index] !== ""
        ) {
            return { success: false, state: currentState };
        }

        // Create a copy of the board array to maintain immutable state principles
        const newBoard = [...currentState.board];
        newBoard[index] = playerSymbol;

        // Determine the mathematical outcome of the proposed move
        const result = evaluateBoard(newBoard);

        // Generate the finalized state object after applying the move constraints
        const newState = {
            ...currentState,
            board: newBoard,
            turn: result.status === 'playing' ? (playerSymbol === 'X' ? 'O' : 'X') : currentState.turn,
            winner: result.winner || (result.status === 'draw' ? 'Draw' : null),
            winningLine: result.winningLine || []
        };

        return {
            success: true,
            state: newState,
            isGameOver: result.status !== 'playing'
        };
    }
};

module.exports = TicTacToeEngine;