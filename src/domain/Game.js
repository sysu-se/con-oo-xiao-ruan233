/**
 * 游戏会话类
 * 负责管理一局游戏的完整流程
 * 
 * @module Game
 * 
 * 职责：
 * 1. 持有当前的 Sudoku 实例
 * 2. 管理历史记录（undo/redo）
 * 3. 对外提供面向 UI 的游戏操作入口
 * 4. 验证操作合法性后再保存历史
 */

import { Sudoku } from './Sudoku.js';
import { History } from './History.js';

export class Game {
  /**
   * 创建一个新的游戏会话
   * 
   * @param {Object} params - 参数对象
   * @param {Sudoku} params.sudoku - Sudoku 实例
   * @param {boolean} [params.recordHistory=true] - 是否记录历史
   * @throws {Error} 当传入的不是 Sudoku 实例时抛出错误
   * 
   * @example
   * const sudoku = new Sudoku(givens);
   * const game = new Game({ sudoku });
   */
  constructor({ sudoku, recordHistory = true }) {
    if (!(sudoku instanceof Sudoku)) {
      throw new Error('sudoku must be an instance of Sudoku');
    }
    
    /** @type {Sudoku} 当前游戏局面 */
    this._currentSudoku = sudoku.clone();
    
    /** @type {Sudoku} 原始题目，用于重置 */
    this._originalSudoku = sudoku.clone();
    
    /** @type {History|null} 历史记录管理器 */
    this._history = recordHistory ? new History() : null;
  }

  /**
   * 获取当前的 Sudoku 对象
   * 
   * @returns {Sudoku} 当前 Sudoku 实例
   */
  getSudoku() {
    return this._currentSudoku;
  }

  /**
   * 获取当前棋盘的完整数据,用深拷贝
   * 
   * @returns {number[][]} 9x9 棋盘数据，0 表示空格
   */
  getGrid() {
    return this._currentSudoku.getGrid();
  }

  /**
   * 获取题目预设
   * 
   * @returns {number[][]} 9x9 题目数据
   */
  getGivens() {
    return this._currentSudoku.getGivens();
  }

  /**
   * 获取玩家填写的数据
   * 
   * @returns {number[][]} 9x9 玩家填写数据
   */
  getPlayers() {
    return this._currentSudoku.getPlayers();
  }

  /**
   * 获取指定位置的值
   * 
   * @param {number} row - 行索引 0-8
   * @param {number} col - 列索引 0-8
   * @returns {number} 0-9 的值
   * @throws {Error} 当 row/col 超出范围时抛出错误
   */
  getCell(row, col) {
    return this._currentSudoku.getCell(row, col);
  }

  /**
   * 判断指定位置是否是固定格
   * 
   * @param {number} row - 行索引 0-8
   * @param {number} col - 列索引 0-8
   * @returns {boolean} true 表示固定格
   */
  isFixed(row, col) {
    return this._currentSudoku.isFixed(row, col);
  }

  /**
   * 检查在指定位置放置数字是否合法
   * 
   * @param {number} row - 行索引 0-8
   * @param {number} col - 列索引 0-8
   * @param {number} value - 要检查的数字 0-9
   * @returns {boolean} true 表示可以放置
   */
  canGuess(row, col, value) {
    return this._currentSudoku.canGuess(row, col, value);
  }

  /**
    * 在指定位置填入数字
    * 
    * @param {number|Object} rowOrMove - 行索引 0-8 或移动对象 {row, col, value}
    * @param {number} [col] - 列索引 0-8（当第一个参数是数字时）
    * @param {number} [value] - 要填入的数字 0-9（当第一个参数是数字时）
    * @returns {{success: boolean, reason: string|null}} 操作结果
    */
  guess(rowOrMove, col, value) {
    let row, colNum, val;
    
    // 判断参数格式
    if (typeof rowOrMove === 'object' && rowOrMove !== null) {
        row = rowOrMove.row;
        colNum = rowOrMove.col;
        val = rowOrMove.value;
    } else {
        row = rowOrMove;
        colNum = col;
        val = value;
    }
    
    // 边界检查
    if (!Number.isInteger(row) || row < 0 || row >= 9) {
        return { success: false, reason: 'invalid_row' };
    }
    if (!Number.isInteger(colNum) || colNum < 0 || colNum >= 9) {
        return { success: false, reason: 'invalid_col' };
    }
    if (!Number.isInteger(val) || val < 0 || val > 9) {
        return { success: false, reason: 'invalid_value' };
    }
    
    // 先检查是否真的有改变
    const currentValue = this._currentSudoku.getCell(row, colNum);
    if (currentValue === val) {
        return { success: false, reason: 'value_unchanged' };
    }
    
    // 再检查是否允许改变
    if (!this._currentSudoku.canGuess(row, colNum, val)) {
        if (this._currentSudoku.isFixed(row, colNum)) {
        return { success: false, reason: 'cell_is_fixed' };
        }
        return { success: false, reason: 'conflict' };
    }
    
    // 确认后才保存历史
    if (this._history) {
        this._history.push(this._currentSudoku.clone());
    }
    
    // 执行猜测
    const success = this._currentSudoku.guess(row, colNum, val);
    return { success, reason: success ? null : 'unknown_error' };
  }

  /**
   * 笔记模式：添加或移除候选数
   * 
   * @param {number} row - 行索引 0-8
   * @param {number} col - 列索引 0-8
   * @param {number} candidate - 候选数 1-9
   * @returns {{success: boolean, reason: string|null}} 操作结果
   */
  toggleCandidate(row, col, candidate) {
    // 边界检查
    if (!Number.isInteger(row) || row < 0 || row >= 9) {
        return { success: false, reason: 'invalid_row' };
    }
    if (!Number.isInteger(col) || col < 0 || col >= 9) {
        return { success: false, reason: 'invalid_col' };
    }
    if (!Number.isInteger(candidate) || candidate < 1 || candidate > 9) {
        return { success: false, reason: 'invalid_candidate' };
    }
    
    // 保存历史
    if (this._history) {
        this._history.push(this._currentSudoku.clone());
    }
    
    const success = this._currentSudoku.toggleCandidate(row, col, candidate);
    return { success, reason: success ? null : 'cannot_add_candidate' };
  }

  /**
   * 获取指定位置的候选数
   * 
   * @param {number} row - 行索引 0-8
   * @param {number} col - 列索引 0-8
   * @returns {number[]} 候选数数组
   */
  getCandidates(row, col) {
    return this._currentSudoku.getCandidates(row, col);
  }

  /**
   * 撤销上一步操作
   * 
   * @returns {{success: boolean, reason: string|null}} 
   * 
   * @example
   * const result = game.undo();
   * if (result.success) {
   *   // UI 已更新
   * }
   */
  undo() {
    if (!this._history) {
      return { success: false, reason: 'history_disabled' };
    }
    
    if (!this._history.canUndo()) {
      return { success: false, reason: 'no_undo_history' };
    }
    
    const previousState = this._history.undo(this._currentSudoku);
    if (previousState) {
      this._currentSudoku = previousState;
      return { success: true, reason: null };
    }
    
    return { success: false, reason: 'undo_failed' };
  }

  /**
   * 重做被撤销的操作
   * 
   * @returns {{success: boolean, reason: string|null}} 
   */
  redo() {
    if (!this._history) {
      return { success: false, reason: 'history_disabled' };
    }
    
    if (!this._history.canRedo()) {
      return { success: false, reason: 'no_redo_history' };
    }
    
    const nextState = this._history.redo(this._currentSudoku);
    if (nextState) {
      this._currentSudoku = nextState;
      return { success: true, reason: null };
    }
    
    return { success: false, reason: 'redo_failed' };
  }

  /**
   * 检查是否可以撤销
   * 
   * @returns {boolean} true 表示可以撤销
   */
  canUndo() {
    return this._history ? this._history.canUndo() : false;
  }

  /**
   * 检查是否可以重做
   * 
   * @returns {boolean} true 表示可以重做
   */
  canRedo() {
    return this._history ? this._history.canRedo() : false;
  }

  /**
   * 检查棋盘是否有效
   * 
   * @returns {boolean} true 表示无冲突
   */
  isValid() {
    return this._currentSudoku.isValid();
  }

  /**
   * 检查游戏是否胜利
   * 
   * @returns {boolean} true 表示胜利
   */
  isComplete() {
    return this._currentSudoku.isComplete();
  }

  /**
   * 获取无效单元格列表
   * 
   * @returns {Array<{row: number, col: number}>} 冲突单元格列表
   */
  getInvalidCells() {
    return this._currentSudoku.getInvalidCells();
  }

  /**
   * 重置游戏到初始状态
   * 
   * @returns {boolean} true 表示重置成功
   */
  reset() {
    this._currentSudoku = this._originalSudoku.clone();
    if (this._history) {
      this._history.clear();
    }
    return true;
  }

  /**
   * 从另一个 Sudoku 恢复状态,用于加载存档
   * 
   * @param {Sudoku} sudoku - 要恢复的 Sudoku 实例
   * @returns {boolean} true 表示恢复成功
   */
  restore(sudoku) {
    if (!(sudoku instanceof Sudoku)) {
      return false;
    }
    this._currentSudoku = sudoku.clone();
    if (this._history) {
      this._history.clear();
    }
    return true;
  }

  /**
   * 序列化为 JSON 对象
   * 
   * @returns {Object} 包含当前局面和原始题目的对象
   * @returns {Object} returns.currentSudoku - 当前局面
   * @returns {Object} returns.originalSudoku - 原始题目
   * @returns {Object|null} returns.history - 历史记录
   */
  toJSON() {
    return {
      currentSudoku: this._currentSudoku.toJSON(),
      originalSudoku: this._originalSudoku.toJSON(),
      history: this._history ? this._history.toJSON(s => s.toJSON()) : null
    };
  }

  /**
   * 从 JSON 恢复 Game 实例
   * 
   * @param {Object} data - 序列化后的数据
   * @returns {Game} 恢复的 Game 实例
   * @throws {Error} 当数据无效时抛出错误
   */
  static fromJSON(data) {
    if (!data || !data.currentSudoku || !data.originalSudoku) {
      throw new Error('Invalid JSON: missing currentSudoku or originalSudoku');
    }
    
    const originalSudoku = Sudoku.fromJSON(data.originalSudoku);
    const game = new Game({ sudoku: originalSudoku, recordHistory: !!data.history });
    
    const currentSudoku = Sudoku.fromJSON(data.currentSudoku);
    game._currentSudoku = currentSudoku;
    
    if (data.history && game._history) {
      game._history.fromJSON(data.history, (s) => Sudoku.fromJSON(s));
    }
    
    return game;
  }
}