/**
 * 历史记录管理器
 * 负责维护 undo/redo 栈
 * 
 * @module History
 */

export class History {
  /**
   * 创建一个新的历史记录管理器
   */
  constructor() {
    /** @type {Array} 撤销栈，存储历史快照 */
    this._undoStack = [];
    /** @type {Array} 重做栈，存储被撤销的快照 */
    this._redoStack = [];
  }

  /**
   * 保存新状态到历史栈
   * 
   * @param {any} state - 要保存的状态快照,用深拷贝
   * @returns {boolean} true 表示保存成功，false 表示失败
   * 
   * @example
   * history.push(sudoku.clone());
   */
  push(state) {
    if (!state) return false;
    this._undoStack.push(state);
    this._redoStack = [];
    return true;
  }

  /**
   * 撤销操作，返回上个状态
   * 
   * @param {any} currentState - 当前状态（会被保存到 redoStack）
   * @returns {any|null} 上个状态，如果没有历史则返回 null
   * 
   * @example
   * const previousState = history.undo(currentSudoku);
   * if (previousState) {
   *   currentSudoku = previousState;
   * }
   */
  undo(currentState) {
    if (!this.canUndo()) return null;
    this._redoStack.push(currentState);
    return this._undoStack.pop();
  }

  /**
   * 重做操作，返回下一个状态
   * 
   * @param {any} currentState - 当前状态（会被保存到 undoStack）
   * @returns {any|null} 下个状态，如果没有可重做的历史则返回 null
   * 
   * @example
   * const nextState = history.redo(currentSudoku);
   * if (nextState) {
   *   currentSudoku = nextState;
   * }
   */
  redo(currentState) {
    if (!this.canRedo()) return null;
    this._undoStack.push(currentState);
    return this._redoStack.pop();
  }

  /**
   * 检查是否可以撤销
   * 
   * @returns {boolean} true 表示可以撤销，false 表示不能
   */
  canUndo() {
    return this._undoStack.length > 0;
  }

  /**
   * 检查是否可以重做
   * 
   * @returns {boolean} true 表示可以重做，false 表示不能
   */
  canRedo() {
    return this._redoStack.length > 0;
  }

  /**
   * 清空历史记录
   * 
   * @returns {boolean} true 表示清空成功
   */
  clear() {
    this._undoStack = [];
    this._redoStack = [];
    return true;
  }

  /**
   * 获取撤销栈长度
   * 
   * @returns {number} 历史记录数量
   */
  getUndoCount() {
    return this._undoStack.length;
  }

  /**
   * 获取重做栈长度
   * 
   * @returns {number} 可重做记录数量
   */
  getRedoCount() {
    return this._redoStack.length;
  }

  /**
   * 序列化为 JSON
   * 
   * @param {Function} serializer - 序列化函数，将状态转换为 JSON
   * @returns {Object} 包含 undoStack 和 redoStack 的对象
   * 
   * @example
   * const json = history.toJSON(state => state.toJSON());
   */
  toJSON(serializer) {
    if (typeof serializer !== 'function') {
      throw new Error('serializer must be a function');
    }
    return {
      undoStack: this._undoStack.map(s => serializer(s)),
      redoStack: this._redoStack.map(s => serializer(s))
    };
  }

  /**
   * 从 JSON 恢复
   * 
   * @param {Object} data - 序列化后的数据
   * @param {Array} data.undoStack - 撤销栈的 JSON 数据
   * @param {Array} data.redoStack - 重做栈的 JSON 数据
   * @param {Function} deserializer - 反序列化函数，将 JSON 转换为状态
   * @returns {boolean} true 表示恢复成功，false 表示失败
   * 
   * @example
   * history.fromJSON(data, json => Sudoku.fromJSON(json));
   */
  fromJSON(data, deserializer) {
    if (!data || !Array.isArray(data.undoStack) || !Array.isArray(data.redoStack)) {
      return false;
    }
    if (typeof deserializer !== 'function') {
      return false;
    }
    
    try {
      this._undoStack = data.undoStack.map(s => deserializer(s));
      this._redoStack = data.redoStack.map(s => deserializer(s));
      return true;
    } catch (e) {
      return false;
    }
  }
}