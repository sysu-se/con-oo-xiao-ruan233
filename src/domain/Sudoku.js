/**
 * 数独棋盘核心类
 * 负责管理 9x9 数独棋盘的数据和基本操作
 * 
 * @module Sudoku
 * 
 * 核心设计：
 * 1. 区分固定格（givens）和玩家格（players）
 * 2. 固定格永远不可修改
 * 3. 玩家格可以反复修改和清空
 * 4. 每次修改都进行冲突校验
 * 5. 支持笔记模式
 */

const SUDOKU_SIZE = 9;
const BOX_SIZE = 3;

export class Sudoku {
  /**
   * 创建一个新的数独实例
   * 
   * @param {number[][]} givens - 9x9 的二维数组，表示题目预设的数字
   *   - 0 表示该位置没有预设数字（空格）
   *   - 1-9 表示题目预设的固定数字
   * @throws {Error} 当 givens 不是有效的 9x9 数组或包含无效值时抛出错误
   * @throws {Error} 当题目预设数字存在冲突时抛出错误
   * 
   * @example
   * const sudoku = new Sudoku([
   *   [5, 3, 0, 0, 7, 0, 0, 0, 0],
   *   [6, 0, 0, 1, 9, 5, 0, 0, 0],
   *   // ... 共9行
   * ]);
   */
  constructor(givens) {
    // 边界检查：确保 givens 是 9x9 数组
    if (!Array.isArray(givens)) {
      throw new Error(`givens must be an array, received ${typeof givens}`);
    }
    
    if (givens.length !== SUDOKU_SIZE) {
      throw new Error(`givens must have ${SUDOKU_SIZE} rows, got ${givens.length}`);
    }
    
    for (let i = 0; i < SUDOKU_SIZE; i++) {
      if (!Array.isArray(givens[i])) {
        throw new Error(`row ${i} must be an array, received ${typeof givens[i]}`);
      }
      
      if (givens[i].length !== SUDOKU_SIZE) {
        throw new Error(`row ${i} must have ${SUDOKU_SIZE} columns, got ${givens[i].length}`);
      }
      
      for (let j = 0; j < SUDOKU_SIZE; j++) {
        const value = givens[i][j];
        if (typeof value !== 'number') {
          throw new Error(`cell (${i},${j}) must be a number, received ${typeof value}`);
        }
        if (value < 0 || value > 9) {
          throw new Error(`cell (${i},${j}) must be between 0 and 9, got ${value}`);
        }
        if (!Number.isInteger(value)) {
          throw new Error(`cell (${i},${j}) must be an integer, got ${value}`);
        }
      }
    }
    
    // 深拷贝固定格
    this._givens = givens.map(row => [...row]);
    
    // 玩家填写格，初始全为 0
    this._players = Array(SUDOKU_SIZE).fill().map(() => Array(SUDOKU_SIZE).fill(0));
    
    // 笔记模式候选数，key: "row,col", value: Set<number>
    this._candidates = new Map();
    
    // 验证题目本身是否合法（没有冲突）
    if (!this._areGivensValid()) {
      throw new Error('Invalid puzzle: given numbers conflict with each other');
    }
  }

  /**
   * 检查题目预设是否有冲突
   * @private
   * @returns {boolean} true 表示无冲突，false 表示有冲突
   */
  _areGivensValid() {
    for (let row = 0; row < SUDOKU_SIZE; row++) {
      for (let col = 0; col < SUDOKU_SIZE; col++) {
        const value = this._givens[row][col];
        if (value !== 0) {
          if (!this._isValidPlacement(row, col, value, true)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  /**
   * 检查在指定位置放置数字是否合法
   * @private
   * @param {number} row - 行索引 0-8
   * @param {number} col - 列索引 0-8
   * @param {number} value - 要检查的数字 1-9
   * @param {boolean} ignoreSelf - 是否忽略自身（用于验证题目）
   * @returns {boolean} true 表示合法，false 表示冲突
   */
  _isValidPlacement(row, col, value, ignoreSelf = false) {
    if (value === 0) return true;
    
    // 检查行
    for (let c = 0; c < SUDOKU_SIZE; c++) {
      if (ignoreSelf && c === col) continue;
      if (this.getCell(row, c) === value) return false;
    }
    
    // 检查列
    for (let r = 0; r < SUDOKU_SIZE; r++) {
      if (ignoreSelf && r === row) continue;
      if (this.getCell(r, col) === value) return false;
    }
    
    // 检查宫
    const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
    const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
    for (let r = 0; r < BOX_SIZE; r++) {
      for (let c = 0; c < BOX_SIZE; c++) {
        const currentRow = boxRow + r;
        const currentCol = boxCol + c;
        if (ignoreSelf && currentRow === row && currentCol === col) continue;
        if (this.getCell(currentRow, currentCol) === value) return false;
      }
    }
    
    return true;
  }

  /**
   * 验证位置有效性
   * @private
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @throws {Error} 当 row 或 col 超出 0-8 范围时抛出错误
   */
  _validatePosition(row, col) {
    if (!Number.isInteger(row) || row < 0 || row >= SUDOKU_SIZE) {
      throw new Error(`Invalid row: ${row}. Must be an integer between 0 and ${SUDOKU_SIZE - 1}.`);
    }
    if (!Number.isInteger(col) || col < 0 || col >= SUDOKU_SIZE) {
      throw new Error(`Invalid col: ${col}. Must be an integer between 0 and ${SUDOKU_SIZE - 1}.`);
    }
  }

  /**
   * 验证数字有效性
   * @private
   * @param {number} value - 要验证的数字
   * @throws {Error} 当 value 不是 0-9 的整数时抛出错误
   */
  _validateValue(value) {
    if (typeof value !== 'number') {
      throw new Error(`Invalid value: ${value}. Must be a number.`);
    }
    if (!Number.isInteger(value) || value < 0 || value > 9) {
      throw new Error(`Invalid value: ${value}. Must be an integer between 0 and 9.`);
    }
  }

  /**
   * 获取指定位置显示的值（优先显示玩家填写，没有则显示题目预设）
   * 
   * @param {number} row - 行索引 0-8
   * @param {number} col - 列索引 0-8
   * @returns {number} 0-9 的值，0 表示空格
   * @throws {Error} 当 row/col 超出范围时抛出错误
   * 
   * @example
   * const value = sudoku.getCell(0, 0);
   */
  getCell(row, col) {
    this._validatePosition(row, col);
    const playerValue = this._players[row][col];
    if (playerValue !== 0) return playerValue;
    return this._givens[row][col];
  }

  /**
   * 判断指定位置是否是固定格
   * 
   * @param {number} row - 行索引 0-8
   * @param {number} col - 列索引 0-8
   * @returns {boolean} true 表示是固定格，不可修改
   * @throws {Error} 当 row/col 超出范围时抛出错误
   */
  isFixed(row, col) {
    this._validatePosition(row, col);
    return this._givens[row][col] !== 0;
  }

  /**
   * 检查在指定位置放置数字是否合法（不实际修改）
   * 
   * @param {number} row - 行索引 0-8
   * @param {number} col - 列索引 0-8
   * @param {number} value - 要检查的数字 0-9
   * @returns {boolean} true 表示可以放置，false 表示不可以
   * @throws {Error} 当 row/col 超出范围或 value 无效时抛出错误
   * 
   * @example
   * if (sudoku.canGuess(0, 0, 5)) {
   *   sudoku.guess(0, 0, 5);
   * }
   */
  canGuess(row, col, value) {
    this._validatePosition(row, col);
    this._validateValue(value);
    
    // 固定格不可修改
    if (this.isFixed(row, col)) return false;
    
    // 清空操作总是允许
    if (value === 0) return true;
    
    // 检查是否与现有数字冲突
    return this._isValidPlacement(row, col, value, false);
  }

  /**
   * 在指定位置填入数字（玩家操作）
   * 
   * @param {number|Object} rowOrMove - 行索引 0-8 或移动对象 {row, col, value}
   * @param {number} [col] - 列索引 0-8（当第一个参数是数字时）
   * @param {number} [value] - 要填入的数字 0-9（当第一个参数是数字时）
   * @returns {boolean} true 表示修改成功，false 表示修改失败
   * 
   * @example
   * // 方式1：三个独立参数
   * const success = sudoku.guess(0, 0, 5);
   * 
   * @example
   * // 方式2：对象参数（兼容测试）
   * const success = sudoku.guess({ row: 0, col: 0, value: 5 });
   */
  guess(rowOrMove, col, value) {
    let row, colNum, val;
    
    // 判断参数格式：如果是对象，则解构
    if (typeof rowOrMove === 'object' && rowOrMove !== null) {
      row = rowOrMove.row;
      colNum = rowOrMove.col;
      val = rowOrMove.value;
    } else {
      row = rowOrMove;
      colNum = col;
      val = value;
    }
    
    if (!this.canGuess(row, colNum, val)) {
      return false;
    }
    
    // 清除该格子的笔记
    this._candidates.delete(`${row},${colNum}`);
    
    // 执行修改
    this._players[row][colNum] = val;
    return true;
  }

  /**
   * 笔记模式：添加或移除候选数
   * 
   * @param {number} row - 行索引 0-8
   * @param {number} col - 列索引 0-8
   * @param {number} candidate - 候选数 1-9
   * @returns {boolean} true 表示操作成功，false 表示失败（固定格或已有数字）
   * @throws {Error} 当 row/col 超出范围或 candidate 无效时抛出错误
   * 
   * @example
   * sudoku.toggleCandidate(0, 0, 5); // 添加或移除候选数5
   */
  toggleCandidate(row, col, candidate) {
    this._validatePosition(row, col);
    if (candidate < 1 || candidate > 9 || !Number.isInteger(candidate)) {
      throw new Error(`Invalid candidate: ${candidate}. Must be an integer between 1 and 9.`);
    }
    
    // 固定格或已有数字的格子不能添加笔记
    if (this.isFixed(row, col)) return false;
    if (this._players[row][col] !== 0) return false;
    
    const key = `${row},${col}`;
    if (!this._candidates.has(key)) {
      this._candidates.set(key, new Set());
    }
    
    const candidates = this._candidates.get(key);
    if (candidates.has(candidate)) {
      candidates.delete(candidate);
      if (candidates.size === 0) {
        this._candidates.delete(key);
      }
    } else {
      candidates.add(candidate);
    }
    return true;
  }

  /**
   * 获取指定位置的所有候选数（笔记）
   * 
   * @param {number} row - 行索引 0-8
   * @param {number} col - 列索引 0-8
   * @returns {number[]} 候选数数组，按升序排列
   * @throws {Error} 当 row/col 超出范围时抛出错误
   */
  getCandidates(row, col) {
    this._validatePosition(row, col);
    const key = `${row},${col}`;
    if (!this._candidates.has(key)) return [];
    return Array.from(this._candidates.get(key)).sort((a, b) => a - b);
  }

  /**
   * 清空指定位置的所有候选数
   * 
   * @param {number} row - 行索引 0-8
   * @param {number} col - 列索引 0-8
   * @throws {Error} 当 row/col 超出范围时抛出错误
   */
  clearCandidates(row, col) {
    this._validatePosition(row, col);
    this._candidates.delete(`${row},${col}`);
  }

  /**
   * 获取所有无效单元格（冲突位置）
   * 
   * @returns {Array<{row: number, col: number}>} 无效单元格列表
   * 
   * @example
   * const invalidCells = sudoku.getInvalidCells();
   * // [{row: 0, col: 1}, {row: 2, col: 3}]
   */
  getInvalidCells() {
    const invalid = new Set();
    
    // 检查行冲突
    for (let row = 0; row < SUDOKU_SIZE; row++) {
      const positions = new Map();
      for (let col = 0; col < SUDOKU_SIZE; col++) {
        const val = this.getCell(row, col);
        if (val !== 0) {
          if (positions.has(val)) {
            invalid.add(`${row},${col}`);
            invalid.add(positions.get(val));
          } else {
            positions.set(val, `${row},${col}`);
          }
        }
      }
    }
    
    // 检查列冲突
    for (let col = 0; col < SUDOKU_SIZE; col++) {
      const positions = new Map();
      for (let row = 0; row < SUDOKU_SIZE; row++) {
        const val = this.getCell(row, col);
        if (val !== 0) {
          if (positions.has(val)) {
            invalid.add(`${row},${col}`);
            invalid.add(positions.get(val));
          } else {
            positions.set(val, `${row},${col}`);
          }
        }
      }
    }
    
    // 检查宫冲突
    for (let box = 0; box < SUDOKU_SIZE; box++) {
      const positions = new Map();
      const startRow = Math.floor(box / BOX_SIZE) * BOX_SIZE;
      const startCol = (box % BOX_SIZE) * BOX_SIZE;
      for (let i = 0; i < BOX_SIZE; i++) {
        for (let j = 0; j < BOX_SIZE; j++) {
          const row = startRow + i;
          const col = startCol + j;
          const val = this.getCell(row, col);
          if (val !== 0) {
            if (positions.has(val)) {
              invalid.add(`${row},${col}`);
              invalid.add(positions.get(val));
            } else {
              positions.set(val, `${row},${col}`);
            }
          }
        }
      }
    }
    
    return Array.from(invalid).map(key => {
      const [row, col] = key.split(',').map(Number);
      return { row, col };
    });
  }

  /**
   * 检查当前棋盘是否有效
   * 
   * @returns {boolean} true 表示当前无冲突，false 表示存在冲突
   */
  isValid() {
    return this.getInvalidCells().length === 0;
  }

  /**
   * 检查棋盘是否完成（无空格且无冲突）
   * 
   * @returns {boolean} true 表示游戏胜利，false 表示未完成
   */
  isComplete() {
    if (!this.isValid()) return false;
    
    for (let row = 0; row < SUDOKU_SIZE; row++) {
      for (let col = 0; col < SUDOKU_SIZE; col++) {
        if (this.getCell(row, col) === 0) return false;
      }
    }
    return true;
  }

  /**
   * 获取完整棋盘的深拷贝（用于 UI 渲染和测试）
   * 
   * @returns {number[][]} 9x9 的二维数组，0 表示空格
   */
  getGrid() {
    const result = Array(SUDOKU_SIZE).fill().map(() => Array(SUDOKU_SIZE).fill(0));
    for (let i = 0; i < SUDOKU_SIZE; i++) {
      for (let j = 0; j < SUDOKU_SIZE; j++) {
        result[i][j] = this.getCell(i, j);
      }
    }
    return result;
  }

  /**
   * 获取题目预设的深拷贝
   * 
   * @returns {number[][]} 9x9 的二维数组
   */
  getGivens() {
    return this._givens.map(row => [...row]);
  }

  /**
   * 获取玩家填写的深拷贝
   * 
   * @returns {number[][]} 9x9 的二维数组
   */
  getPlayers() {
    return this._players.map(row => [...row]);
  }

  /**
   * 创建当前数独的深拷贝
   * 
   * @returns {Sudoku} 新的 Sudoku 实例，与原实例独立
   */
  clone() {
    const copy = new Sudoku(this._givens);
    for (let i = 0; i < SUDOKU_SIZE; i++) {
      for (let j = 0; j < SUDOKU_SIZE; j++) {
        copy._players[i][j] = this._players[i][j];
      }
    }
    // 复制笔记
    for (const [key, candidates] of this._candidates) {
      copy._candidates.set(key, new Set(candidates));
    }
    return copy;
  }

  /**
   * 序列化为 JSON 对象
   * 
   * @returns {Object} 包含 givens、players 和 candidates 的对象
   * @returns {number[][]} returns.givens - 题目预设
   * @returns {number[][]} returns.players - 玩家填写
   * @returns {Array} returns.candidates - 候选数数据
   */
  toJSON() {
    return {
      givens: this.getGivens(),
      players: this.getPlayers(),
      candidates: Array.from(this._candidates.entries()).map(([key, set]) => [key, Array.from(set)])
    };
  }

  /**
   * 从 JSON 数据恢复 Sudoku 实例
   * 
   * @param {Object} data - 序列化后的数据
   * @param {number[][]} data.givens - 题目预设
   * @param {number[][]} data.players - 玩家填写
   * @param {Array} [data.candidates] - 候选数数据
   * @returns {Sudoku} 恢复的 Sudoku 实例
   * @throws {Error} 当数据无效时抛出错误
   */
  static fromJSON(data) {
    if (!data || !data.givens || !data.players) {
      throw new Error('Invalid JSON: missing givens or players');
    }
    
    const sudoku = new Sudoku(data.givens);
    for (let i = 0; i < SUDOKU_SIZE; i++) {
      for (let j = 0; j < SUDOKU_SIZE; j++) {
        sudoku._players[i][j] = data.players[i][j];
      }
    }
    
    if (data.candidates && Array.isArray(data.candidates)) {
      for (const [key, candidates] of data.candidates) {
        sudoku._candidates.set(key, new Set(candidates));
      }
    }
    
    return sudoku;
  }

  /**
   * 返回棋盘的带边框字符串表示（用于调试）
   * 
   * @returns {string} 带边框的棋盘文本
   * 
   * @example
   * ╔═══════╤═══════╤═══════╗
   * ║ 5 3 · │ · 7 · │ · · · ║
   * ║ 6 · · │ 1 9 5 │ · · · ║
   * ╚═══════╧═══════╧═══════╝
   */
  toString() {
    let out = '╔═══════╤═══════╤═══════╗\n';

    for (let row = 0; row < SUDOKU_SIZE; row++) {
      if (row !== 0 && row % BOX_SIZE === 0) {
        out += '╟───────┼───────┼───────╢\n';
      }

      for (let col = 0; col < SUDOKU_SIZE; col++) {
        if (col === 0) {
          out += '║ ';
        } else if (col % BOX_SIZE === 0) {
          out += '│ ';
        }

        const value = this.getCell(row, col);
        const isFixed = this.isFixed(row, col);
        const display = value === 0 ? '·' : value;
        out += (isFixed ? display : display) + ' ';

        if (col === SUDOKU_SIZE - 1) {
          out += '║';
        }
      }

      out += '\n';
    }

    out += '╚═══════╧═══════╧═══════╝';
    return out;
  }
}