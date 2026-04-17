# con-oo-xiao-ruan233 - Review

## Review 结论

领域层已经有了 `Sudoku` / `Game` / `History` 的基本分层，但当前 Svelte 接入仍然以数组 store 为中心而不是以领域对象导出的稳定视图模型为中心。结果是 givens、玩家输入、候选数、冲突校验、胜利判定等关键业务语义在多个 store 和组件里被重复建模，已经出现了可编辑性、规则一致性和 UI 语义错位的问题。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | fair |
| Sudoku Business | poor |
| OOD | poor |

## 缺点

### 1. 把 givens 和当前局面压成了同一份响应式状态

- 严重程度：core
- 位置：src/node_modules/@sudoku/stores/grid.js:19-68
- 原因：`grid` 在开局后保存的是 `gameInstance.getGrid()` 的当前快照，`userGrid` 又只是镜像 `grid`。这样 UI 拿不到稳定的 givens/player 分界，后续 `src/node_modules/@sudoku/stores/keyboard.js:6-10` 会把玩家自己填过的非空格子也判成不可编辑，`src/components/Board/index.svelte:48-51` 的 `userNumber` 也会误判，说明接入层已经破坏了核心业务语义。

### 2. 把“校验能力”实现成了“禁止一切冲突输入”

- 严重程度：core
- 位置：src/domain/Sudoku.js:217-228
- 原因：`canGuess/guess` 直接拒绝任何行、列、宫冲突的输入，使玩家无法试填也看不到错误态；但接入层又保留了 `src/node_modules/@sudoku/stores/grid.js:120-154` 的 `invalidCells` 和 `src/components/Board/index.svelte:51` 的冲突高亮。这说明领域模型和现有数独 UI 的业务语义并不一致，冲突相关流程实际上已经失效。

### 3. 胜利判定没有消费领域规则

- 严重程度：major
- 位置：src/node_modules/@sudoku/stores/game.js:6-13
- 原因：`gameWon` 只检查 `grid` 里是否还存在 `0`，没有调用 `Game.isComplete()`。游戏结束流程因此依赖数组快照而不是领域对象的完成条件，未来一旦调整 `Sudoku` 的合法性规则、恢复存档逻辑或允许冲突输入，UI 判赢会和领域层分叉。

### 4. 候选数状态绕开了 Game/Sudoku 和历史系统

- 严重程度：major
- 位置：src/node_modules/@sudoku/stores/candidates.js:1-29
- 原因：领域层已经实现了 `toggleCandidate/getCandidates`，但 Svelte 侧又单独维护了一个 `candidates` store，并在 `src/components/Controls/Keyboard.svelte:12-25` 中直接修改它。结果是候选数不参与 `Game` 的 undo/redo、快照和序列化，View 也没有真正消费领域对象提供的 notes 状态，OOD 边界被打散了。

### 5. 反序列化入口会绕过领域不变式

- 严重程度：major
- 位置：src/domain/Sudoku.js:514-532
- 原因：`fromJSON` 只检查 `givens/players` 是否存在，就直接把 `players` 和 `candidates` 写入私有字段；它没有验证尺寸、值域、是否覆盖 fixed cell，也没有重新校验候选数结构。这样可以构造出构造函数本来不允许的非法 `Sudoku`，对象封装被序列化入口破坏。

## 优点

### 1. 构造阶段对棋盘基础不变式有较完整的防守

- 位置：src/domain/Sudoku.js:35-80
- 原因：会验证 9x9 结构、数值范围、整数约束以及 givens 自身是否冲突，这比只接受“裸数组”更符合领域对象应维护自身合法性的思路。

### 2. Undo/Redo 被抽成了独立对象

- 位置：src/domain/History.js:12-69
- 原因：`History` 独立维护 undo/redo 栈，`Game` 只负责在合适时机推送快照和切换当前局面，这个职责拆分是清晰的。

### 3. 快照复制覆盖了玩家输入和候选数

- 位置：src/domain/Sudoku.js:474-485
- 原因：`clone()` 同时深拷贝 givens、players 和 candidates，为历史记录和序列化提供了比较稳定的状态基线，没有把可变集合直接共享出去。

### 4. 开局、输入、撤销、重做已经部分接入领域层

- 位置：src/node_modules/@sudoku/stores/grid.js:26-38,73-95
- 原因：真实界面的新开局会创建 `Sudoku` / `Game`，用户输入与 undo/redo 也确实调用了 `gameInstance.guess/undo/redo`，说明这次提交不是“只在测试里有领域对象”。

## 补充说明

- 本次结论仅基于静态阅读，未运行测试、未启动 UI、未做交互验证。
- Svelte 接入的审查范围包含直接消费领域层的 `src/node_modules/@sudoku/stores/*`、`src/App.svelte`、`src/components/Board/*`、`src/components/Controls/*`、`src/components/Modal/Types/Welcome.svelte`、`src/components/Header/Dropdown.svelte`；其余目录未展开。
- 关于“玩家已填数字会被当成不可编辑格”“冲突高亮流程失效”“判赢逻辑与领域层分叉”等判断，均来自对代码路径的静态推导，而非实际运行结果。
