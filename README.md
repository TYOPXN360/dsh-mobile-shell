# dsh-mobile-shell

[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-plugin-4D6BFE?style=flat-square)](https://github.com/deepseek-ai/deepseek-harness)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)

DeepSeek Assistant 的**一体化移动端外壳**插件：窄屏侧边栏抽屉 + 可安装 PWA，桌面布局零改动。

一个插件、两个功能，同一条生命周期。

---

## 功能

### 1. 窄屏侧边栏抽屉（手机浏览器）

默认情况下，手机竖屏页面**不再显示左侧边栏**，会话区占满整个宽度。

- **展开按钮**：会话名称**左侧**新增一个面板图标（`conversation.header.leading` 槽位，因此渲染在标题之前）。
- **覆盖式抽屉**：点开后是**完整的真实侧边栏**，覆盖在会话之上，不挤压会话区。
- **点击未覆盖处收起**：抽屉右侧的会话区域是遮罩，点一下即关闭。
- **全局右滑展开**：在会话页面**任意位置**向右滑动即可展开，不限于屏幕边缘。
- **左滑 / Esc 收起**：额外提供的关闭路径。

### 2. 可安装 PWA

设置 → 通用设置 → 最底部新增「**添加为 PWA 应用**」：

- 名称为 **DeepSeek Assistant**，图标**复用 DSH 自带图标**（`icon-192` / `icon-512` / `icon-maskable-512` / `apple-touch-icon`，与宿主 UI 逐字节相同）。
- 按钮直接调用浏览器原生安装弹窗；已安装时显示「已安装」。
- 不可安装时给出**真实原因**，而不是一个永远点不动的按钮：
  - iOS Safari → 提示「分享 → 添加到主屏幕」；
  - 无安装 API → 提示浏览器菜单路径；
  - **非安全上下文**（如 `http://192.168.2.36:3081`）→ 提示在 `chrome://flags` 的 `unsafely-treat-insecure-origin-as-secure` 中把该地址加为可信源。

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

---

## 与 `dsh-full-remote` 的协作（不改其代码）

任务控制台浮在会话页右上角，在手机上会盖住会话头部。本插件把它**收敛进侧边栏**，与「插件 / 自动化任务 / 更多」同级：

- 不移动、不修改、不重新实现该插件的 DOM 或状态；
- 侧边栏中新增一个**代理行**，点击时转发给该插件自己的启动按钮 —— 面板、徽标、焦点陷阱仍由它完全拥有；
- 点击后**自动收起侧边栏**，直接呈现它自己的面板；
- 该插件不存在时，这一行不渲染。

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
node --test tests/              # 58 项单元测试
```

## 结构

```text
dsh-mobile-shell/
├─ src/
│  ├─ index.ts                 宿主半区：manifest / 图标 / Service Worker 路由
│  ├─ routes.ts                两侧共享的路由常量
│  ├─ pwa/
│  │  ├─ manifest.ts           纯函数式 manifest 构建
│  │  └─ service-worker.js     经典脚本（需在站点根目录）
│  └─ client/
│     ├─ index.tsx             浏览器半区入口：装配全部部件
│     ├─ drawer.ts             抽屉状态机（唯一真相源）+ 断点常量
│     ├─ frame-bridge.ts       标记宿主 frame、回传右侧栏轨道
│     ├─ swipe.ts              全局右滑手势（pointer + touch 双通道）
│     ├─ drawer-button.tsx     会话标题前的展开按钮
│     ├─ drawer-backdrop.tsx   点击收起遮罩
│     ├─ cockpit-relay.ts      任务控制台中继行
│     ├─ pwa-installer.ts      安装状态机
│     ├─ pwa-bootstrap.ts      文档元数据 + SW 注册
│     ├─ pwa-row.tsx           通用设置最底部的新行
│     ├─ styles.ts             全部样式（单一 style 标签）
│     └─ i18n.ts               中英文案
├─ assets/                     与宿主逐字节相同的图标
├─ lib/                        构建产物
└─ tests/                      58 项单测
```

## 三个关键实现点

**① 抽屉是真的侧边栏，不是仿造品。**
打开抽屉时驱动的是宿主自己的折叠标志（`ctx.layout.toggleSidebar()`），因此挂载的是真实侧边栏子树。本插件只在 CSS 里改几何：把该列从网格里取出、固定定位覆盖在会话上。

**② 取出列必须重新钉住其余列。**
`position: fixed` 会让侧边栏列脱离网格自动排布，中心列会滑到**宽度为 0** 的第一列上，整页变空白。因此中心列与右栏都显式钉在自己的轨道上——这是本插件最容易踩的坑，已有回归测试锁死。

**③ 抽屉宽度由内容决定，不能写死像素。**
宿主侧边栏自身是 280px 的固定宽度。若抽屉容器写死 320px，右侧就会多出一条空白列。用 `min(86vw, max-content)` 让容器贴合内容，桌面与移动都成立。

**④ 手势必须监听 `touchmove`。**
只用 pointer 事件在真机上不生效：浏览器一旦把手势判为滚动就会 `pointercancel`，后续 `pointermove` 不再送达。因此在轴锁定后以 `passive: false` 的 `touchmove` 调 `preventDefault()`，把事件流留住；轴锁定**之前**绝不 prevent，否则会破坏正常滚动（WebKit 不会恢复）。

## 资源与许可

- 代码：[MIT](./LICENSE)。
- `assets/` 下的图标是 `@deepseek-ai/dsh-web-frontend` 随包发布的 **DSH 应用图标**，逐字节复制用于让安装后的 PWA 与宿主界面视觉一致；其版权归 DeepSeek Harness 项目原作者，遵循其原始许可。若你需要替换为自己的品牌，请替换 `assets/` 下的同名文件即可（`scripts/build-host.mjs` 会校验必需图标存在）。

## License

代码部分 MIT，见 [LICENSE](./LICENSE)。
