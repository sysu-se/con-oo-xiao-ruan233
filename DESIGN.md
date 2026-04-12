# 设计文档

## 一、领域对象设计

### 1. Sudoku / Game / History 职责边界

| 类 | 职责 |
|---|------|
| Sudoku | 管理数独的 9x9 网格，提供猜数、深拷贝、序列化、外表化等功能。不关心历史记录和游戏会话。 |
| Game | 管理一局游戏的会话，拥有当前 Sudoku 对象，提供 undo/redo 功能。 |
| History | 历史记录管理器，维护 undoStack 和 redoStack，提供 push、undo、redo、clear 等操作。 |

**总结：**
- Sudoku 只关心棋盘是什么
- Game 只关心怎么操作棋盘和历史
- History 只关心如何存储和回溯状态

### 2. Move 是值对象还是实体对象？

Move 是**值对象**。

它只是 `{ row, col, value }` 的数据载体，没有独立的身份标识。两个 Move 如果字段相同则视为相等，因此不需要单独的 Move 类，使用普通对象即可。

### 3. history 中存储的是什么？为什么？

存储的是 **Sudoku 快照**。

原因：
- 9x9 数独只有 81 个数字，内存占用可以忽略
- 直接恢复到之前状态的完整局面，不易出现状态不一致

### 4. 复制策略

**复制策略：**
- 二维数组深拷贝：`grid.map(row => [...row])`
- Sudoku 深拷贝：`new Sudoku(this._givens)` 并复制 `_players`

**需要深拷贝的地方：**

| 位置 | 原因 |
|------|------|
| Sudoku 构造函数 | 防止外部传入的数组被意外修改 |
| Sudoku.getGrid() | 防止外部通过返回值修改内部数据 |
| Sudoku.clone() | 创建独立副本，用于历史快照 |
| Game.guess() | 存储当前状态的独立副本，保证历史不被后续操作影响 |

### 5. 序列化 / 反序列化设计

**序列化（toJSON）：**
- `Sudoku.toJSON()`：返回 `{ givens, players, candidates }`
- `Game.toJSON()`：返回 `{ currentSudoku, originalSudoku, history }`
- `History.toJSON()`：返回 `{ undoStack, redoStack }`

**反序列化（fromJSON）：**
- `Sudoku.fromJSON(json)`：从 JSON 恢复 Sudoku 实例
- `Game.fromJSON(json)`：从 JSON 恢复 Game 实例
- `History.fromJSON(data, deserializer)`：使用反序列化函数恢复历史栈

### 6. 外表化接口

- `Sudoku.toString()`：返回带边框的棋盘文本，用于调试
- `Sudoku.toJSON()`：返回可序列化的纯数据对象，用于保存/加载

## 二、领域对象如何被消费

### View 层直接消费的是什么？

View 层直接消费的是 **Store 适配层**（`src/node_modules/@sudoku/stores/grid.js`），而不是直接消费 Sudoku 或 Game。

具体消费：
- `userGrid` store - 棋盘数据
- `invalidCells` store - 冲突单元格
- `gamePaused` store - 暂停状态
- `gameWon` store - 胜利状态

### View 层拿到的数据是什么？

| 数据 | 类型 | 说明 |
|------|------|------|
| `$userGrid` | `number[][]` | 9x9 棋盘，0 表示空格 |
| `$invalidCells` | `string[]` | 冲突单元格，格式 "x,y" |
| `$gamePaused` | `boolean` | 游戏是否暂停 |
| `$gameWon` | `boolean` | 游戏是否胜利 |

### 用户操作如何进入领域对象？

**填入数字流程：**

用户点击数字
    ↓
Keyboard.svelte 调用 userGrid.set(pos, value)
    ↓
grid.js 中的 userGrid.set() 被调用
    ↓
gameInstance.guess(pos.y, pos.x, value)
    ↓
Game.guess() → Sudoku.guess()
    ↓
grid.set(newGrid) 触发 UI 更新

**Undo 流程：**

用户点击 Undo
    ↓
Actions.svelte 调用 userGrid.undo()
    ↓
grid.js 中的 userGrid.undo() 被调用
    ↓
gameInstance.undo()
    ↓
Game.undo() 从历史栈中恢复上一个状态
    ↓
grid.set(gameInstance.getGrid()) 触发 UI 更新

**Redo 流程：**

用户点击 Redo
    ↓
Actions.svelte 调用 userGrid.redo()
    ↓
grid.js 中的 userGrid.redo() 被调用
    ↓
gameInstance.redo()
    ↓
Game.redo() 从历史栈中恢复下一个状态
    ↓
grid.set(gameInstance.getGrid()) 触发 UI 更新

### 领域对象变化后，Svelte 为什么会更新？

适配层在每次修改后手动调用 `grid.set()`，Svelte 检测到 store 值变化，自动重新渲染所有订阅的组件。

## 三、响应式机制说明

### 依赖的 Svelte 机制

- **Writable Store**：通过 `writable()` 创建状态容器
- **Store 订阅**：组件使用 `$store` 自动订阅
- **手动触发更新**：调用 `set()` 通知所有订阅者

### 响应式边界

| 层级 | 是否响应式 | 说明 |
|------|-----------|------|
| Store 适配层（grid.js） | 是 | 暴露 Svelte store |
| 领域对象（Sudoku/Game/History） | 否 | 纯 JS 类，无响应式 |

### 哪些数据响应式暴露给 UI？

- `userGrid` - 完整棋盘
- `invalidCells` - 冲突位置
- `gamePaused` - 暂停状态

### 哪些状态留在领域对象内部？

- `Sudoku._givens` - 题目预设
- `Sudoku._players` - 玩家填写
- `Sudoku._candidates` - 笔记候选数
- `Game._history` - 历史栈
- `Game._currentSudoku` - 当前局面

### 如果直接 mutate 内部对象会出什么问题？

```javascript
// 错误：直接修改内部数组
game._currentSudoku._players[0][0] = 5;
// UI 不会更新，Svelte 不知道数据变了

// 正确：通过公开 API
game.guess(0, 0, 5);
// 适配层调用 set() 触发 UI 更新

## 四、改进说明

### 相比 HW1 的改进

| 问题 | HW1 | HW1.1 |
|------|-----|-------|
| 固定格/玩家格 | 未区分，填过后锁死 | `_givens` + `_players` 分离 |
| 冲突校验 | 无 | `_isValidPlacement()` 检查行/列/宫 |
| 历史记录 | 无效操作也进历史 | 先验证，成功才 push |
| 返回值 | `console.warn` | 返回 `{success, reason}` |
| 封装性 | 直接暴露内部引用 | 返回深拷贝 |
| UI 接入 | 领域对象未被使用 | 通过 Store 适配层接入 |

### HW1 中不足以支撑真实接入的问题

1. 没有响应式边界 - 领域对象直接暴露，Svelte 无法追踪变化
2. UI 直接操作数组 - 组件绕过领域对象直接修改数据
3. 缺少适配层 - 领域对象的变化无法触发 UI 更新

### 新设计的 Trade-off

| 优点 | 代价 |
|------|------|
| UI 和领域逻辑解耦 | 需在grid.js维护适配层 |
| 响应式行为可预测 | 每次修改需手动触发更新 |