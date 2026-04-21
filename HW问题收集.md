# HW 问题收集

列举在 HW 1、HW1.1 过程里，你所遇到的 2~3 个通过自己学习已经解决的问题，和 2~3 个尚未解决的问题与挑战。

## 已解决

### 1. 为什么网页只有蓝白相间，不显示棋盘？

**上下文**：运行 `npm run dev` 后打开浏览器，页面只有蓝白背景，没有棋盘格子，控制台报错 `Cannot read properties of undefined (reading '0')`。

**解决手段**：
- 询问 Coding Agent 后发现是代码中的 `$userGrid` 初始值为 `undefined`，导致 `{#each $userGrid as row}` 无法遍历
- 在 `grid.js` 的 `createUserGrid` 中，给 `writable` 传入正确的初始值 `deepCopyGrid(emptyGrid)`
- 在 `Board/index.svelte` 中添加安全检查：`{#if $userGrid && $userGrid.length === 9}` 确保数据存在后再渲染
- 确保 `grid.subscribe` 在 `gameInstance` 创建后会正确更新 `userGrid`

---

### 2. 为什么Undo/Redo 按钮点击没反应，我明明在History.js里面写了啊？

**上下文**：测试时在填入数字后，点击 Undo/Redo 按钮，棋盘没有任何变化，控制台也没有报错。

**解决手段**：
- 询问 Coding Agent 后发现在 `Actions.svelte`，Undo/Redo 按钮没有绑定 `on:click` 事件
- 添加 `handleUndo` 和 `handleRedo` 函数，调用 `userGrid.undo()` 和 `userGrid.redo()`
- 在 `grid.js` 的 `createUserGrid` 返回值中添加 `undo` 和 `redo` 方法，内部调用 `gameInstance.undo/redo()`
- 每次操作成功后调用 `grid.set(gameInstance.getGrid())` 触发 UI 更新

---

### 3. 计时器为什么不动？

**上下文**：测试时计时器一直显示 `00:00`，没有开始走动。

**解决手段**：
- 询问 Coding Agent 后发现在 `Timer.svelte`，它依赖 `timer` store 和 `gamePaused` 状态
- 在 `game.js` 的 `startNew` 和 `startCustom` 函数中添加 `timer.start()` 调用
- 确保 `pauseGame` 和 `resumeGame` 中正确调用 `timer.stop()` 和 `timer.start()`
- 确认 `timer.js` 中的 `start()` 方法会每隔 10ms 更新时间

---

### 4. 提示功能怎么用不了？

**上下文**：测试时点击 Hint 按钮，没有任何反应，格子没有自动填入数字。

**解决手段**：
- 询问 Coding Agent 后发现在 `Actions.svelte`，`handleHint` 函数调用了 `userGrid.applyHint($cursor)`
- 在 `grid.js` 的 `createUserGrid` 中实现 `applyHint` 方法
- 使用 `solveSudoku` 获取完整解，找到当前位置的正确数字
- 调用 `gameInstance.guess()` 填入正确答案，成功后调用 `grid.set()` 更新 UI
- 同时调用 `hints.useHint()` 减少提示次数

---

## 未解决

### 1. 笔记模式如何正确接入 Undo/Redo？

**上下文**：当前笔记模式直接操作独立的 `candidates` store，绕过了 `Game` 的历史记录系统。测试时尝试在笔记模式下添加/删除候选数，发现无法进行 Undo/Redo 回退。

**尝试解决手段**：
- 询问 Coding Agent 后提示说：“要在 `Game` 类中添加 `toggleCandidate` 方法，内部保存历史；要修改 `Keyboard.svelte`，把 `candidates.add()` 改为调用 `userGrid.toggleCandidate()`。”
- 不确定是应该完全废弃独立的 `candidates` store，还是让 `candidates` store 与 Game 同步。担心改动范围太大，可能影响其他依赖 `candidates` store 的组件，最后没有改动。

---

### 2. 红色高亮显示冲突的提示缺失？

**上下文**：测试时发现错误的数字无法输入，并没有红色高亮显示冲突的提示。数独游戏通常允许玩家试填然后红色提示，但我不确定原有 UI 是否就是这种设计，还是另有其他机制，然后就忽略了。

**尝试解决手段**：
- 尝试看代码时没看懂 `Board/index.svelte` 组件中冲突高亮的逻辑。使用 Coding Agent 时提示不够，它也没有发现我领域层 `canGuess()` 直接拒绝冲突输入返回 false，把反馈`codex_review.md`发给 CA 了以后才发现UI 层期望的是"允许输入 + 红色高亮显示冲突"，而非"禁止输入"。