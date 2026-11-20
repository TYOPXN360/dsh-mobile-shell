# dsh-mobile-shell

[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-plugin-4D6BFE?style=flat-square)](https://github.com/deepseek-ai/deepseek-harness)
[![License: GPL v3](https://img.shields.io/badge/license-GPLv3-blue?style=flat-square)](./LICENSE)

DeepSeek Harness 的**一体化移动端外壳**插件：窄屏侧边栏抽屉 + 可安装 PWA + 平滑滚动与淡入，桌面布局零改动。

一个插件、四个功能，同一条生命周期。

---

## 功能

### 1. 窄屏侧边栏抽屉（手机浏览器）

默认情况下，手机竖屏页面**不再显示左侧边栏**，会话区占满整个宽度。

- **展开按钮**：会话名称**左侧**新增一个面板图标（`conversation.header.leading` 槽位，因此渲染在标题之前）。
- **覆盖式抽屉**：点开后是**完整的真实侧边栏**，覆盖在会话之上，不挤压会话区。
- **点击未覆盖处收起**：抽屉右侧的会话区域是遮罩，点一下即关闭。
- **全局右滑展开**：在会话页面**任意位置**向右滑动即可展开，不限于屏幕边缘。
- **左滑 / Esc 收起**：额外提供的关闭路径。
- **独立开关**：设置 → 通用设置 → 最底部分组中的「**移动端适配**」，可整体关闭抽屉、右滑与任务控制台中继；关闭后恢复宿主的原生窄屏布局。

### 2. 可安装 PWA

设置 → 通用设置 → 最底部插件分组中的「**添加为 PWA 应用**」：

- 名称为 **DeepSeek Harness**，图标**复用 DSH 自带图标**（`icon-192` / `icon-512` / `icon-maskable-512` / `apple-touch-icon`，与宿主 UI 逐字节相同）。
- 按钮直接调用浏览器原生安装弹窗；已安装时显示「已安装」。
- 不可安装时给出**真实原因**，而不是一个永远点不动的按钮：
  - iOS Safari → 提示「分享 → 添加到主屏幕」；
  - 无安装 API → 提示浏览器菜单路径；
  - **非安全上下文**（如 `http://192.168.2.36:3081`）→ 提示在 `chrome://flags` 的 `unsafely-treat-insecure-origin-as-secure` 中把该地址加为可信源。

### 3. 沉浸式状态栏（安装为 PWA 后）

状态栏**不隐藏**：时钟、电量、信号图标仍然可见，只是状态栏背景变透明，页面背景和内容延伸到它下面。

- **Android 10+**：manifest 的 `theme_color` 为 `transparent`；宿主半区在渲染 `index.html` 时（`tapIndex`）把 `viewport-fit=cover` 写进 viewport 声明，客户端再在安装模式补上透明的 `theme-color`。Android 把状态栏背景画成透明，内容可以进入这一条区域。
- **iOS**：系统不提供完全透明，使用 `apple-mobile-web-app-status-bar-style=black-translucent`，得到深色半透明状态栏 + 白色图标；该 meta 由宿主在返回 HTML 前写入，确保 WebKit 在解析阶段就能读到。页面同样延伸到状态栏下。
- **安全区**：安装模式下 `<html>` 会带上 `data-dsh-ms-standalone`，样式表据此给 frame 加 `env(safe-area-inset-*)` 内边距。状态栏后面是 frame 自己的背景，标题、按钮、抽屉和宿主的左上角展开按钮都落在安全区内，不会被时钟或刘海挡住。
- **只在安装模式生效**：普通浏览器标签页不会加安全区内边距，状态栏和地址栏仍由浏览器控制；安装后才切换到透明状态栏 + 安全区布局。

> 已安装的旧版本如果状态栏仍是深色，通常是 Android 缓存的 WebAPK manifest 尚未刷新。先杀掉应用再启动；仍不生效时删除主屏幕图标重新安装一次。

### 4. 平滑滚动与淡入

设置 → 通用设置 → 插件分组中「添加为 PWA 应用」下方的「平滑滚动与淡入」开关（默认开启，可随时关闭）：

- 新块到达时，旧内容不再瞬移一整行，而是用约 0.3 秒**向上滑入**；
- 每个新出现的段落、步骤行、工具行和思考块用约 0.18 秒**淡入**，不会整屏突然闪现；
- **只对真正的新块做平滑上移**：段落内部的自动换行按原生方式稳定推进，不会让整列先下后上地“回弹”；
- **纯缓出、不弹回、不超调**：位移只朝一个方向收敛；已经绘制过的滚动不会再被延迟反向修正；同时关闭聊天滚动区的下拉回弹；
- 对助手正文和**思考过程**同时生效；
- 手机与桌面共用同一套逻辑，只改变聊天列的视觉位移和新节点的透明度，不修改宿主的滚动位置、跟随意图或测量；
- 只在视图已经跟随到底部时平滑上移；用户向上翻阅历史、切换会话、加载更早历史时不播放滚动动画，也不会让整段历史一起淡入；
- 尊重系统「减少动态效果」设置；关闭开关后立即恢复原生行为。

实现上不重写宿主聊天，也不拦截 `scrollTop`：观察内容增长与滚动位移，给聊天列叠加一个快速衰减的 `translate`；淡入则用 Web Animations API 只改新节点的 `opacity`。两者都不改变布局，因此不会影响锚点、虚拟列表或输入框。

插件自己的设置行集中在通用设置最底部：一条与官方行完全相同的 `.5px solid var(--dsw-alias-border-l2)` 分割线把它们与宿主偏好分开，行内边距、标题/描述字号和行间细线也沿用官方样式。移动端适配、添加为 PWA 应用、平滑滚动与淡入各有独立的一行；两个行为开关互不影响，PWA 行仍是安装动作。

---

## 桌面端保证

所有移动端规则都由**唯一一条媒体查询**包围：

```css
@media (max-width: 1023px) and (pointer: coarse)
```

JavaScript 的武装判断用的是**同一个字符串常量**。因此：

- 鼠标驱动的窗口（`pointer: fine`）**任意宽度**都是桌面布局；
- 1024px 以上的触屏平板保持原生布局；
- 桌面端不会出现抽屉按钮、遮罩、中继行，侧边栏宽度与网格列完全不变。

安装模式的安全区规则由 `(display-mode: standalone)` 和 `<html data-dsh-ms-standalone>` 两条路径触发；普通窗口的安全区变量保持 0，桌面浏览器与桌面 PWA 的布局不变。

---

## 与 `dsh-full-remote` 的协作（不改其代码）

任务控制台浮在会话页右上角，在手机上会盖住会话头部。本插件把它**收敛进侧边栏**，与「插件 / 自动化任务 / 更多」同级：

- 不移动、不修改、不重新实现该插件的 DOM 或状态；
- 侧边栏中新增一个**代理行**，点击时转发给该插件自己的启动按钮 —— 面板、徽标、焦点陷阱仍由它完全拥有；
- 点击后**自动收起侧边栏**，直接呈现它自己的面板；
- 该插件不存在时，这一行不渲染。

---

## 与宿主 / 远程插件的左上角展开按钮退避

DSH 0.2.2 起，**窄于 768px 的窗口由宿主自己使用模态抽屉**：展开按钮来自宿主的 `shell.leading` 座位（`[data-sidebar-opener]`），遮罩和侧边栏列几何也由宿主拥有。本插件检测到这个状态后只让出**按钮与覆盖几何**：

- 不显示自己的展开按钮，左上角只保留宿主的那一个；
- 不注入覆盖式列几何（否则宿主的遮罩会盖住本插件固定定位的侧边栏）；
- **右滑仍然可用**：这是本插件独有的交互，宿主没有。右滑/左滑继续驱动宿主自己的侧边栏开关，宿主负责抽屉本体、遮罩和点击遮罩收起；
- 宿主退出抽屉模式（例如旋转/缩放到 768–1023px）后，按钮和覆盖层自动恢复。

768–1023px 的触屏区间不受影响：宿主此时仍是 56px 窄栏，没有原生展开按钮，本插件继续提供覆盖式抽屉与按钮。

同样的按钮退避也适用于第三方移动端开关：`dsh-web-mobile` 的 `[data-mobile-nav="toggle"]`，以及任何占据宿主 `shell.leading` 座位的可见控件。检测到它们时，本插件的按钮不会出现，避免两个面板图标叠在同一角；右滑仍然保留。

---

## 安装

直接从本仓库安装（`lib/` 已随仓库提交，无需构建）：

```sh
dsh plugin --profile web add github:TYOPXN360/dsh-mobile-shell
dsh --profile web
```

本地开发用符号链接：

```sh
ln -s /path/to/dsh-mobile-shell ~/.dsh/profiles/web/node_modules/dsh-mobile-shell
# 并在该 profile 的 package.json 里把 "dsh-mobile-shell" 加入 dsh.profile.bundles
```

## 开发

```sh
node scripts/build-client.mjs   # 类型检查 + 打包浏览器半区到 lib/client.js
node scripts/build-host.mjs     # 编译宿主半区 + 拷贝 SW 与图标
node --test tests/              # 全部单元测试
```

## 结构

```text
dsh-mobile-shell/
├─ src/
│  ├─ index.ts                 宿主半区：manifest / 图标 / Service Worker 路由
│  ├─ routes.ts                两侧共享的路由常量
│  ├─ pwa/
│  │  ├─ manifest.ts           纯函数式 manifest 构建
│  │  ├─ viewport.ts           viewport-fit 共享助手（宿主 + 客户端）
│  │  ├─ index-html.ts         renderIndex 阶段的沉浸 meta 注入
│  │  └─ service-worker.js     经典脚本（需在站点根目录）
│  └─ client/
│     ├─ index.tsx             浏览器半区入口：装配全部部件
│     ├─ drawer.ts             抽屉状态机（唯一真相源）+ 断点常量
│     ├─ backoff.ts            左上角归属检测：宿主/第三方已有时整体退避
│     ├─ frame-bridge.ts       标记宿主 frame、回传右侧栏轨道
│     ├─ swipe.ts              全局右滑手势（pointer + touch 双通道）
│     ├─ drawer-button.tsx     会话标题前的展开按钮
│     ├─ drawer-backdrop.tsx   点击收起遮罩
│     ├─ cockpit-relay.ts      任务控制台中继行
│     ├─ pwa-installer.ts      安装状态机
│     ├─ pwa-bootstrap.ts      文档元数据 + SW 注册
│     ├─ immersive.ts          运行时兜底：透明 theme-color / 安装模式标记
│     ├─ pwa-row.tsx           通用设置中的 PWA 行
│     ├─ smooth-scroll.ts      平滑滚动：偏好存储 + 聊天列视觉补偿引擎
│     ├─ fade-in.ts            新内容淡入：聊天列新增节点观察 + 透明度动画
│     ├─ smooth-scroll-row.tsx 通用设置中的平滑滚动与淡入开关
│     ├─ styles.ts             全部样式（单一 style 标签）
│     └─ i18n.ts               中英文案
├─ assets/                     与宿主逐字节相同的图标
├─ lib/                        构建产物
└─ tests/                      全部单测
```

## 关键实现点

**① 抽屉是真的侧边栏，不是仿造品。**
打开抽屉时驱动的是宿主自己的折叠标志（`ctx.layout.toggleSidebar()`），因此挂载的是真实侧边栏子树。本插件只在 CSS 里改几何：把该列从网格里取出、固定定位覆盖在会话上。

**② 取出列必须重新钉住其余列。**
`position: fixed` 会让侧边栏列脱离网格自动排布，中心列会滑到**宽度为 0** 的第一列上，整页变空白。因此中心列与右栏都显式钉在自己的轨道上——这是本插件最容易踩的坑，已有回归测试锁死。

**③ 抽屉宽度由内容决定，不能写死像素。**
宿主侧边栏自身是 280px 的固定宽度。若抽屉容器写死 320px，右侧就会多出一条空白列。用 `min(86vw, max-content)` 让容器贴合内容，桌面与移动都成立。

**④ 手势必须监听 `touchmove`。**
只用 pointer 事件在真机上不生效：浏览器一旦把手势判为滚动就会 `pointercancel`，后续 `pointermove` 不再送达。因此在轴锁定后以 `passive: false` 的 `touchmove` 调 `preventDefault()`，把事件流留住；轴锁定**之前**绝不 prevent，否则会破坏正常滚动（WebKit 不会恢复）。

**⑤ 平滑滚动与淡入都是视觉增强，不是重写聊天。**
宿主已经把「跟随到底部」做对了；本插件不碰 `scrollTop`，只在新内容块插入后的短窗口内给聊天列叠加一个 `translate`，再让它快速衰减。每个块只平滑一次：块内后续自动换行按原生方式稳定推进；滚动已经绘制后也不会再做延迟反向修正，避免“先上去再弹回来”。淡入只对新插入的内容块播放 `opacity` 动画，不改变高度或布局。因此滚动锚点、历史分页、输入框定位都保持宿主原逻辑，插件升级也不会与宿主抢滚动所有权。

## License

本项目的代码以 **GNU General Public License v3.0** 发布，许可证全文见 [LICENSE](./LICENSE)。

```
dsh-mobile-shell — DeepSeek Harness 移动端外壳插件
Copyright (C) 2026 TYOPXN360

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
```

**对应源代码。** GPLv3 要求分发二进制/构建产物时一并提供对应源代码。本仓库同时提交了 `src/`、`scripts/` 与已构建的 `lib/`，`npm run build` 可完整复现 `lib/`（已在全新克隆中验证产物字节级一致），因此从本仓库获取即满足该要求。

**关于图标。** `assets/` 下的图标是从 `@deepseek-ai/dsh-web-frontend` 随包发布的 **DSH 应用图标**逐字节复制而来，用于让安装后的 PWA 与宿主界面视觉一致。这部分资源的版权归 DeepSeek Harness 项目原作者，**不在本项目的 GPLv3 授权范围内**，按其原始许可使用。若你需要以不同条款再分发，请替换 `assets/` 下的同名文件（`scripts/build-host.mjs` 会校验必需图标存在）。
