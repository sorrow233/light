# 📘 Flow Studio 代码库深度文档

本文档基于源代码逐行分析，详尽记录 Flow Studio 的核心架构、每个模块的功能、关键函数的实现逻辑以及用户界面的设计意图。

---

## 目录

1.  [全局架构与技术栈](#1-全局架构与技术栈)
2.  [路由与导航](#2-路由与导航)
3.  [数据同步层 (sync)](#3-数据同步层-sync)
4.  [认证层 (auth)](#4-认证层-auth)
5.  [国际化 (i18n)](#5-国际化-i18n)
6.  [生命周期模块 (lifecycle)](#6-生命周期模块-lifecycle)
    *   [6.1 InspirationModule](#61-inspirationmodule)
    *   [6.2 PendingModule](#62-pendingmodule)
    *   [6.3 PrimaryDevModule](#63-primarydevmodule)
    *   [6.4 FinalDevModule](#64-finaldevmodule)
    *   [6.5 AdvancedDevModule](#65-advanceddevmodule)
    *   [6.6 CommercialModule](#66-commercialmodule)
7.  [指令中心 (commands)](#7-指令中心-commands)
8.  [设置与数据管理 (settings)](#8-设置与数据管理-settings)
9.  [视觉系统与色彩](#9-视觉系统与色彩)

---

## 1. 全局架构与技术栈

**路径**: `src/App.jsx`, `src/main.jsx`

### 技术栈
| 类别 | 技术 | 说明 |
| :--- | :--- | :--- |
| 框架 | React 18 + Vite | 现代化 SPA 构建 |
| 路由 | react-router-dom v7 | 客户端路由 |
| 状态同步 | **Yjs** + **y-indexeddb** | CRDT 本地优先同步 |
| 云端存储 | **Firebase Firestore** | 用于跨设备同步 |
| 样式 | Tailwind CSS | 原子化 CSS |
| 动画 | Framer Motion | 声明式动画 |
| 通知 | Sonner | Toast 消息 |

### Provider 层级
```
<ThemeProvider>         // 暗色/亮色模式
  <LanguageProvider>    // i18n (zh, en, ja, ko)
    <KeymapProvider>    // 全局快捷键
      <App />
    </KeymapProvider>
  </LanguageProvider>
</ThemeProvider>
```
`App` 内部再包裹 `SyncProvider` 和 `AuthProvider`，确保 sync 和 auth context 对所有页面可用。

---

## 2. 路由与导航

**路径**: `src/App.jsx`, `src/components/Navbar.jsx`

### 路由表
| 路径 | 模块 | 说明 |
| :--- | :--- | :--- |
| `/` | `<Navigate to="/inspiration" />` | 默认重定向 |
| `/inspiration` | `InspirationModule` | 灵感捕捉 |
| `/commands` | `CommandCenterModule` | 指令中心 |
| `/pending` | `PendingModule` | 孵化/待办 |
| `/primary` | `PrimaryDevModule` | 主开发流程 (Stage 1-5) |
| `/advanced` | `AdvancedDevModule` | 高级项目 (Stage 6+) |
| `/final` | `FinalDevModule` | 迭代维护 |
| `/commercial` | `CommercialModule` | 商业化配置 |
| `/share/:id` | `ShareViewPage` | 社区分享查看页 |

### Navbar 功能
- **动态高亮**: 根据 `location.pathname` 判断当前 Tab
- **主题切换**: `toggleTheme()` 切换 `isDark` 状态
- **设置入口**: 点击齿轮图标打开 `DataManagementModal`
- **同步/认证入口**: 未登录显示"云同步"按钮，已登录显示 `SyncStatus` 组件

---

## 3. 数据同步层 (sync)

**路径**: `src/features/sync/`

这是 Flow Studio 的核心，实现 **Local-First** 架构。

### 3.1 SyncContext.jsx

```javascript
const { doc, status, update } = useSyncStore(docId);
useDataMigration(doc); // 首次启动时将 localStorage 数据迁移到 Yjs
```
- `doc`: `Y.Doc` 实例，是所有数据的根
- `status`: `'disconnected'` | `'syncing'` | `'synced'` | `'offline'`
- `update(field, value)`: 快捷方法，直接操作 `doc.getMap('data')`

### 3.2 SyncEngine.js

**核心类**，管理 Yjs 文档与 Firestore 的同步。

| 属性/方法 | 说明 |
| :--- | :--- |
| `docId`, `userId` | 文档标识和用户 ID |
| `doc` | `Y.Doc` 实例 |
| `localProvider` | `IndexeddbPersistence`，本地持久化 |
| `connectFirestore()` | 监听 Firestore 单文档 `users/{uid}/rooms/{docId}` |
| `schedulePush()` | 防抖 10s，最小间隔 30s 的推送调度 |
| `tryPush()` | 将 `Y.encodeStateAsUpdate(doc)` 编码为 Base64 并写入 Firestore |

**数据结构** (Firestore 文档):
```javascript
{
    state: "Base64_encoded_full_yjs_state",
    version: 12,     // 乐观锁版本号
    sessionId: "xxx" // 防止回环
}
```

### 3.3 useSyncedProjects.js

**Hook**: 将 `Y.Array` 封装为 React 友好的 CRUD API。

| 函数 | 说明 |
| :--- | :--- |
| `projects` | `useState` 存储的普通 JS 数组 (从 `yArray.toJSON()`) |
| `addProject(project)` | 创建 `Y.Map`，`yArray.insert(0, [yMap])` |
| `removeProject(id)` | 遍历找到 index，`yArray.delete(index, 1)` |
| `updateProject(id, updates)` | 找到 `Y.Map`，对每个 key 调用 `targetMap.set(key, value)` |
| `undo()` / `redo()` | 使用 `Y.UndoManager` 实现撤销/重做 |

### 3.4 useDataMigration.js

**一次性迁移**: 将旧版 `localStorage` 数据 (`pending_projects`, `primary_projects`) 迁移到 `Y.Doc` 的 `Y.Array` 中。迁移完成后设置 `flowstudio_migration_v1_completed` 标记。

**默认模板加载**: 若用户是新用户且无数据，则从 `DEFAULT_TEMPLATE` 加载示例项目、灵感和指令。

---

## 4. 认证层 (auth)

**路径**: `src/features/auth/AuthContext.jsx`

使用 **Firebase Auth**，提供:
- `login(email, password)`: 邮箱登录
- `register(email, password)`: 邮箱注册
- `loginWithGoogle()`: Google OAuth
- `logout()`: 登出

`AuthProvider` 包裹整个应用，子组件通过 `useAuth()` 获取 `{ user, loading, login, ... }`。

---

## 5. 国际化 (i18n)

**路径**: `src/features/i18n/`

- `LanguageContext.jsx`: 根据 `localStorage` 或 URL (`/en`, `/ja`, `/ko`) 确定语言
- `locales/`: 包含 `zh.js`, `en.js`, `ja.js`, `ko.js` 翻译文件
- `useTranslation()`: 返回 `{ t, currentLanguage, setLanguage }`

---

## 6. 生命周期模块 (lifecycle)

**路径**: `src/features/lifecycle/`

这是 Flow Studio 的核心业务逻辑，项目按阶段流转。

### 6.1 InspirationModule

**路径**: `InspirationModule.jsx`  
**路由**: `/inspiration`  
**数据源**: `useSyncedProjects(doc, 'inspiration')`

**功能**:
1.  **灵感捕捉**: 快速记录一闪而过的想法
2.  **项目标签 (Tag)**: 输入区底部显示所有项目名，点击可插入 `[项目名]`
3.  **颜色分组**: 每 3 条自动切换颜色 (或手动选择)
4.  **Undo Toast**: 删除后 5s 内可撤销

| 函数 | 说明 |
| :--- | :--- |
| `handleAdd()` | 创建灵感对象 `{ id, content, timestamp, colorIndex }` |
| `handleTagClick(projectTitle)` | 在输入框追加 `[projectTitle] ` |
| `handleKeyDown(e)` | `Cmd+Enter` 提交；`Backspace` 整体删除 Tag |

### 6.2 PendingModule

**路径**: `PendingModule.jsx`  
**路由**: `/pending`  
**数据源**: `useSyncedProjects(doc, 'pending_projects')`

**功能**:
1.  **灵魂四问 (Soul Questions)**: 强制思考项目价值
2.  **树苗可视化**: `score` 决定树苗形态
3.  **圣光特效 (Holy Glow)**: 当 `project.hasHolyGlow` 为 `true` 时，卡片边框有流光动画
4.  **毕业 (Graduate)**: 将项目移动到 `primary_projects`

| 函数 | 说明 |
| :--- | :--- |
| `handleAnswer(projectId, qId, val)` | 更新 `answers` 对象，计算 `score` |
| `getSaplingState(score)` | 返回 `{ scale, opacity, color }` 用于树苗动画 |
| `getTreeVisual(stage, projectId)` | Stage 6+ 返回特定树木 (Sakura, Maple...) |
| `handleGraduate(project, category)` | 从 Pending 删除，加入 Primary |

### 6.3 PrimaryDevModule

**路径**: `PrimaryDevModule.jsx`  
**路由**: `/primary`  
**数据源**: `useSyncedProjects(doc, 'primary_projects')`

**功能**:
1.  **项目列表**: 左侧展示所有主项目
2.  **五阶段管道 (Pipeline Stages 1-5)**: `StageNavigation` 组件显示进度
3.  **任务管理 (Task)**: 每个阶段可添加 Task，支持拖拽排序
4.  **指令导入**: 从 `CommandCenterModule` 导入指令到当前阶段

| 函数 | 说明 |
| :--- | :--- |
| `handleSelectProject(project)` | 选中项目，设置 `viewStage` 为当前进度 |
| `handleAddTask(projectId)` | 在选中阶段创建空白 Task |
| `handleToggleTask(projectId, taskId)` | 切换 Task 完成状态 |
| `handleToggleStageComplete(stageId, isComplete)` | 批量设置阶段完成状态，更新 `subStage` |
| `handleGraduateToAdvanced()` | 当 Stage 5 完成后，将 `subStage` 设为 6 |

### 6.4 FinalDevModule

**路径**: `FinalDevModule.jsx`  
**路由**: `/final`  
**数据源**: `useSyncedProjects(doc, 'final_projects')`

**功能**:
- 用于项目的 **迭代维护** (Optimization, New Module, Bug Fix)
- 与 `PrimaryDevModule` 结构类似，但使用 `FINAL_STAGES` 常量

### 6.5 AdvancedDevModule

**路径**: `AdvancedDevModule.jsx`  
**路由**: `/advanced`  
**数据源**: `useSyncedProjects(doc, 'primary_projects').filter(p => p.subStage >= 6)`

**功能**:
- 展示 **毕业后的高级项目**
- 支持 **模块 (Modules)** 管理，类似微服务的独立功能单元
- 点击项目打开 `AdvancedProjectWorkspace` Modal

### 6.6 CommercialModule

**路径**: `CommercialModule.jsx`  
**路由**: `/commercial`  
**数据源**: `useSyncedProjects(doc, 'primary_projects').filter(p => p.subStage >= 6)`

**功能**:
1.  **Revenue Model 选择**: Subscription, One-time, Freemium, Ads
2.  **Payment Provider 选择**: Stripe, LemonSqueezy, Paddle, RevenueCat
3.  **Launch Checklist**: 发布前检查清单
4.  **Growth Phase**: 选择营销渠道 (Twitter, ProductHunt, Reddit...)
5.  **AI Directive 生成**: 一键复制商业化配置 Markdown 到剪贴板

---

## 7. 指令中心 (commands)

**路径**: `src/features/commands/CommandCenterModule.jsx`  
**路由**: `/commands`  
**数据源**: `localStorage` (`flowstudio_commands`)

**功能**:
1.  **多身份 (Profiles)**: 支持切换不同的指令集 (Default, Work, Personal...)
2.  **阶段绑定 (stageIds)**: 指令可关联到多个开发阶段
3.  **分类筛选 (Category)**: General, Frontend, Backend, Database, DevOps, Testing, Final
4.  **社区浏览 (Community)**: 从共享库导入指令
5.  **发布分享 (Share)**: 将自己的指令发布到社区

| 函数 | 说明 |
| :--- | :--- |
| `handleAdd()` | 创建指令 `{ id, title, content, type, tags, category, stageIds, profileId }` |
| `handleImport(cmd)` | 导入指令到当前阶段；跨 Profile 则克隆，同 Profile 则添加 stageId |
| `handleReorder(reordered)` | 更新拖拽后的顺序 |
| `updateCategoryName(id, newName)` | 自定义分类名称 |

---

## 8. 设置与数据管理 (settings)

**路径**: `src/features/settings/DataManagementModal.jsx`

**功能**:
1.  **数据导出 (Export)**: 将所有 Yjs 数据导出为 JSON
2.  **数据导入 (Import)**: 上传 JSON 恢复数据
3.  **语言切换**: 在 Modal 内切换 UI 语言
4.  **清空数据**: 危险操作，清除所有本地数据

---

## 9. 视觉系统与色彩

**路径**: `src/index.css`, `src/utils/constants.js`

### CSS 变量
```css
:root {
    --bg-primary:   #ffffff;
    --bg-secondary: #f8f9fa;
    --text-primary: #1a1a1a;
    --text-secondary: #666666;
}
.dark { /* 暗色模式覆盖 */ }
```

### 阶段颜色 (Stage Colors)
定义于 `StageNavigation.jsx`:

| Stage ID | Color | Class |
| :--- | :--- | :--- |
| 1 | Blue | `bg-blue-400` |
| 2 | Emerald | `bg-emerald-400` |
| 3 | Violet | `bg-violet-400` |
| 4 | Amber | `bg-amber-400` |
| 5 | Rose | `bg-rose-400` |
| 6 | Yellow | `bg-yellow-400` |

### 指令分类颜色 (Command Category)
定义于 `constants.js` 的 `COMMAND_CATEGORIES`:

| ID | Label | Color |
| :--- | :--- | :--- |
| `general` | General | `bg-slate-400` |
| `frontend` | Frontend | `bg-blue-400` |
| `backend` | Backend | `bg-emerald-400` |
| `database` | Database | `bg-amber-400` |
| `devops` | DevOps | `bg-violet-400` |
| `testing` | Testing | `bg-rose-400` |
| `final` | Final | `bg-zinc-700` |

---

## 附录：目录结构

```
src/
├── App.jsx
├── main.jsx
├── index.css
├── components/
│   ├── Navbar.jsx
│   ├── ErrorBoundary.jsx
│   └── shared/
│       └── Spotlight.jsx
├── features/
│   ├── auth/
│   │   ├── AuthContext.jsx
│   │   └── AuthModal.jsx
│   ├── commands/
│   │   ├── CommandCenterModule.jsx
│   │   └── components/
│   ├── i18n/
│   │   ├── LanguageContext.jsx
│   │   └── locales/
│   ├── lifecycle/
│   │   ├── InspirationModule.jsx
│   │   ├── PendingModule.jsx
│   │   ├── PrimaryDevModule.jsx
│   │   ├── FinalDevModule.jsx
│   │   ├── AdvancedDevModule.jsx
│   │   ├── CommercialModule.jsx
│   │   └── components/
│   ├── settings/
│   │   └── DataManagementModal.jsx
│   ├── share/
│   │   └── components/
│   ├── shortcuts/
│   │   └── ...
│   └── sync/
│       ├── SyncContext.jsx
│       ├── SyncEngine.js
│       ├── SyncStatus.jsx
│       ├── useSyncStore.js
│       └── hooks/
│           ├── useSyncedProjects.js
│           ├── useYMap.js
│           └── useDataMigration.js
├── hooks/
│   └── ThemeContext.jsx
├── utils/
│   └── constants.js
└── data/
    └── defaultTemplate.js
```

---

> **编写原则**: 本文档每个章节均基于对应源码文件的逐行分析，确保准确反映代码实际行为。如需更新，请同步修改源码和本文档。
