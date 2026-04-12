import { Sudoku } from './Sudoku.js';
import { Game } from './Game.js';

/**
 * 创建 Sudoku 实例
 * @param {number[][]} grid - 9x9 的二维数组
 * @returns {Sudoku}
 */
export function createSudoku(grid) {
  return new Sudoku(grid);
}

/**
 * 从 JSON 恢复 Sudoku 实例
 * @param {Object} json - Sudoku.toJSON() 的输出
 * @returns {Sudoku}
 */
export function createSudokuFromJSON(json) {
  return Sudoku.fromJSON(json);
}

/**
 * 创建 Game 实例
 * @param {Object} params - { sudoku: Sudoku }
 * @returns {Game}
 */
export function createGame({ sudoku }) {
  if (!sudoku) {
    throw new Error('sudoku is required');
  }
  return new Game({ sudoku });
}

/**
 * 从 JSON 恢复 Game 实例
 * @param {Object} json - Game.toJSON() 的输出
 * @returns {Game}
 */
export function createGameFromJSON(json) {
  return Game.fromJSON(json);
}

export { Sudoku, Game };