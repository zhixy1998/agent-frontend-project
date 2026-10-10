# 面试间页面结构拆分

## 目标
- 高度还原参考图页面结构。
- 采用 `layout / chat / history` 三域拆分，命名与职责更直观。
- 保留轻量交互，不引入后端耦合。

## 目录结构
```text
src/
  components/
    layout/
      AppHeader.vue       # 顶部主导航栏
      SideBar.vue         # 左侧边栏
    chat/
      ChatWindow.vue      # 聊天主窗口
      MessageList.vue     # 消息列表
      MessageBubble.vue   # 单条消息气泡
      ChatInput.vue       # 聊天输入区
    history/
      HistoryList.vue     # 历史会话列表
      HistoryItem.vue     # 单条历史会话
  views/
    InterviewRoom.vue     # 面试间主视图（整合所有组件 + 状态管理）
```

## 组件职责
- `InterviewRoom.vue`
  - 管理路由 Tab、高亮态、会话列表与消息数据。
  - 统一处理会话切换、新建会话、发送消息、附件点击事件。

- `AppHeader.vue`
  - 展示 Logo 与顶部导航。
  - 暴露 `tabClick` 事件。

- `SideBar.vue`
  - 展示“新建会话”按钮与历史区标题。
  - 组合 `HistoryList` 并透传 `createSession / sessionClick` 事件。

- `HistoryList.vue`
  - 渲染历史会话集合。
  - 组合 `HistoryItem`，处理激活项与图标分配。

- `HistoryItem.vue`
  - 单条会话 UI 与 hover/active 状态表现。

- `ChatWindow.vue`
  - 组合消息区与输入区。
  - 透传 `send / attach` 事件。

- `MessageList.vue`
  - 渲染消息集合并监听消息变化自动滚底。

- `MessageBubble.vue`
  - 单条消息气泡，区分用户与 AI 样式。

- `ChatInput.vue`
  - 输入框、附件按钮、发送按钮。
  - 支持回车发送（`Shift+Enter` 换行）。

## 轻量交互清单
- 顶部 Tab 点击切换并高亮。
- 左侧历史会话切换高亮。
- 新建会话并自动激活。
- 输入区回车/点击发送，立即追加用户消息，并模拟 AI 回复。
- 消息列表新增内容后自动滚动到底部。
