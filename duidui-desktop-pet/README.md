# 堆堆桌宠

`duidui-desktop-pet` 是一个使用 Electron + React + TypeScript + Vite 制作的跨平台桌宠应用。堆堆使用项目内图片资产作为主形象：戴圆眼镜、穿连帽衫、抱着迷你笔记本电脑的原创程序员小狗，整体更温暖、更精致，也更像一个真正能陪你把活干完的小伙伴。

## 环境要求

- Node.js 20 或更高版本
- npm 10 或更高版本
- Windows 或 macOS

## 启动开发

```bash
npm install
npm run dev
```

如果 Windows PowerShell 禁止运行 `npm.ps1`，可以使用：

```cmd
npm.cmd install --cache .npm-cache
npm.cmd run dev
```

## 类型检查与构建

```bash
npm run typecheck
npm run build
```

## 打包

```bash
npm run pack
npm run dist
```

打包输出目录为 `release/`。Windows 默认生成 NSIS 安装包，macOS 默认生成 DMG。

## 已实现功能

- 透明、无边框、始终置顶桌宠窗口，默认尺寸约 `220 x 260`
- 左键拖拽移动，并记住关闭前位置
- 关闭窗口后保留托盘
- 右键菜单：切换状态、投喂咖啡豆、进入专注、修 Bug、打开设置、开启/关闭置顶、显示/隐藏、退出
- 托盘菜单：显示桌宠、切换动画状态、投喂咖啡豆、设置、退出程序
- 双击切换专注模式，窗口缩小到约 `150 x 170`
- 鼠标悬浮显示随机中文气泡文案
- 点击气泡或笔记本区域，展开右侧对话面板，不遮挡角色主体
- 设置窗口支持缩放、透明度、置顶、默认动画状态、自动气泡、情绪自动变化、番茄钟提醒、本地对话记录、提醒频率

## 视觉设计

- 主体资产：`src/assets/duidui-puppy.png`
- 原始资产备份：`src/assets/duidui-puppy-source.png`
- 普通模式：约 `260 x 300`，只显示桌宠主体、气泡和轻量按钮
- 对话模式：约 `486 x 300`，桌宠在左、轻量便签式对话在右，避免遮挡形象
- 专注模式：约 `150 x 170`，收起气泡和面板，只保留低打扰小宠物
- 情绪表现不改动原图五官，而用克制叠加层表达：JVM 堆环、线程心跳、日志扫描线、咖啡豆、耳机、旗帜、Full GC 对象、需求卡片等
- 画面不直接展示工具按钮，投喂咖啡豆、进入专注、修 Bug、设置等操作统一放在右键菜单

## 情绪与交互状态

基础状态：

- `idle`：抱着笔记本轻微呼吸、眨眼
- `coding`：快速敲键盘，屏幕显示绿色代码
- `gc`：把漂浮的小对象收进背包
- `success`：举起绿色小旗，显示 `Deploy Success`
- `error`：头顶出现红色 `500`
- `sleep`：休息，冒出 `Zzz`

情绪状态：

- `happy`、`curious`、`shy`、`tired`、`worried`、`excited`、`lonely`
- `anti_work`、`meeting`、`overtime`、`requirement_change`、`bug_fix`

新增交互状态：

- `pet`：摸头反馈
- `eat`：右键菜单投喂咖啡豆
- `focus`：开工、番茄钟或专注指令
- `celebrate`：部署成功、下班或任务完成
- `full_gc`：连续点击 3 到 5 次触发彩蛋
- `dragging`：拖动时抱紧笔记本
- `thinking`：对话回复前的短暂思考

## 交互规则

- 单击身体或头部：摸头反馈，进入 `pet`、`happy` 或 `shy`
- 连续点击 3 到 5 次：触发 `full_gc`，吸走周围小对象
- 鼠标停留 1 秒以上：如果开启情绪自动变化，进入 `curious`
- 30 分钟无互动：如果开启情绪自动变化，随机进入 `coding`、`tired`、`lonely` 或 `sleep`
- 工作日 8:30 到 10:00：有概率进入 `anti_work`，周一优先
- 右键“投喂咖啡豆”：进入 `eat`
- 用户输入“开会”“需求变更”“加班”“线上故障”：切换到对应状态
- 用户输入“上班”“开工”“开始干活”或“番茄钟”：先吐槽，再进入 `focus`
- 用户输入“下班”、部署成功或完成任务：进入 `happy` 或 `celebrate`
- 所有自动提醒都可在设置里关闭，避免打扰

## 本地对话

点击气泡、对话按钮或笔记本区域可以打开小型对话框。第一版不接入真实大模型，使用 `src/config/dialogConfig.ts` 里的本地规则和随机模板回复。

特点：

- 回复简短、温暖，带一点程序员吐槽
- 不联网、不依赖后端
- 最近 20 条对话保存到本地
- 可在设置中查看和清空
- 可在设置中关闭“保留本地对话记录”

## 扩展接口

- `src/config/emotionConfig.ts`：情绪状态、切换规则、提醒频率
- `src/config/dialogConfig.ts`：本地对话规则，未来可替换为真实 LLM provider
- `src/state/petStateMachine.ts`：角色状态机，与 React UI 解耦
- Electron IPC：已预留状态切换、设置、对话记录等最小权限通道

未来可以在状态机外层接入：

- 真实 LLM 回复
- 本地 HTTP 指令
- Git、构建、测试、部署事件
- 番茄钟完整倒计时和完成事件

## 目录结构

```text
duidui-desktop-pet/
├─ electron/
│  ├─ main.ts
│  └─ preload.ts
├─ src/
│  ├─ components/
│  │  ├─ Pet.tsx
│  │  └─ SettingsPanel.tsx
│  ├─ config/
│  │  ├─ dialogConfig.ts
│  │  ├─ emotionConfig.ts
│  │  └─ petConfig.ts
│  ├─ state/
│  │  └─ petStateMachine.ts
│  ├─ styles/
│  │  └─ global.css
│  ├─ App.tsx
│  ├─ main.tsx
│  └─ types.ts
├─ index.html
├─ package.json
├─ tsconfig.json
├─ tsconfig.electron.json
└─ vite.config.ts
```

## 安全设计

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- 页面不直接访问 Node.js、文件系统或 Electron 主进程对象
- 所有页面能力通过 `electron/preload.ts` 暴露的窄接口完成
- IPC 仅覆盖窗口拖拽、右键菜单、状态切换、置顶、设置读写、对话记录读写等必要操作
