# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目形态

一个**无构建、纯 CDN** 的多页静态作品集站点。**没有 `package.json`、没有打包工具、没有测试框架**——不要去找 `npm install` / `npm run build` / `npm test`。`src/` 和各 HTML 文件由任意静态服务器原样下发即可。

站点由三类页面组成：

- `index.html` —— 首页，承载全部重交互（预加载帘幕、自定义指针、聚光灯 / 磁吸、GSAP 扰动标题、主题切换）。
- `more-works.html` —— 横向滚动归档页，用 GSAP **ScrollTrigger** 把垂直滚动映射成内容横向平移。
- `works/<slug>/index.html` —— 6 个作品详情页（recongroup / glassland / pefc / biosphere-lab-lungau / ziid / hotel-gambswirt），结构简单，只复用首页的指针与主题观感。

README 与 `index.html` 里仍保留 Paper.js 的 CDN 引入，但 **Paper.js 当前处于停用状态**——`<canvas>` 和 `paper.setup(...)` 都被注释掉了。**当前真正的运行时是 jQuery + GSAP**；把 Paper.js 当作"留作日后复活"的脚手架，而不是当前架构。

## 本地启动

从项目根目录启动任意静态服务器即可，没有偏好的命令：

```bash
npx serve .                  # 或: npx http-server .
python3 -m http.server 8080
```

然后浏览器访问 `http://localhost:8080`。VS Code 的 Live Server 直接打开 `index.html` 也能工作（仓库里有 `.vscode/settings.json`，但目前是空的）。

> 用静态服务器而非 `file://` 打开很重要：首页作品列表里有一条**绝对路径**链接 `/works/pefc/`，它从"站点根"解析，`file://` 下会失效。

## 脚本与库的加载契约

`index.html` 的 `<head>` 里脚本加载顺序是 **load-bearing** 的：jQuery → Paper.js → **GSAP → ScrollTrigger → ScrambleTextPlugin** → `src/main.js`（`type="module"`）。

- GSAP / ScrollTrigger / ScrambleTextPlugin 都会把对象挂到 `window`，所以 module 脚本里**直接用全局 `gsap` / `ScrollTrigger`，无需 `import`**；用插件前需 `gsap.registerPlugin(ScrollTrigger)` 注册一次。
- **ScrambleTextPlugin 用的是 `gsap-trial` 包**：该插件 2025 起免费授权，但 jsdelivr 上公开的 `gsap` 包里没有这个文件（404）。开发期用 trial 包试用，生产环境需从 [gsap.com](https://gsap.com) 注册后换成私有包。
- `more-works.html` 与各 `works/*` 子页面**不引入 jQuery / Paper.js**，只按需引入 GSAP（仅 more-works）和 `type="module"` 的子页面脚本，保持轻量。

`src/` 下有四个文件，职责不同：

| 文件 | 用在哪 | 职责 |
| --- | --- | --- |
| `main.js` | 仅 `index.html` | 首页全部重交互（预加载、指针、主题切换、扰动标题等） |
| `subpage.js` | `works/*` 与 `more-works.html` | 子页面共享：自定义指针 + 主题跟随（**纯原生 JS，不依赖 jQuery / GSAP**） |
| `more-works.js` | 仅 `more-works.html` | 横向滚动联动（GSAP ScrollTrigger pin + scrub + 惯性拖尾） |
| `style.css` | 全站 | 唯一全局样式表，无作用域、无预处理器 |

## 三套关键系统（只看单个文件看不出来）

### 1. 自定义鼠标指针（`data-bigdot` 这个隐式契约）

`html, body { cursor: none }` 在全局隐藏了系统光标，可见的指针是 `.mousePointer` 这个 div。

**HTML 和 JS 之间的契约是 `data-bigdot="true"` 这个属性。** 首页 `main.js`（jQuery）和子页面 `subpage.js`（原生 JS）都会给所有带此属性的元素绑 hover：进入时给 `.mousePointer` 加 `.big`、离开移除。任何标签只要带上这个属性就自动获得"悬停放大"。**新增可交互元素？加 `data-bigdot="true"` 即可，不要去扩展 JS 选择器列表。**

这套指针有两条看起来可改、实则不能动的规则：

- 指针通过 `requestAnimationFrame` + 线性插值（`current += (target - current) * 0.15`）跟随鼠标，每帧用 `transform: translate3d(...)` 写位置。CSS 里 `.mousePointer` 的 `transition` **故意不包含 `transform`**——只对 `width / height / background / backdrop-filter` 做过渡。把 `transform` 加进 transition 会和 rAF 循环打架，产生拖影 / 抖动。这是刻意的省略，load-bearing。
- `.big` 状态是三层叠加：`mix-blend-mode: difference` + `backdrop-filter: blur+saturate` + 半透明白底，组合出"随底色反转的毛玻璃"观感。动其中任意一个属性都会破掉效果。

### 2. modern ↔ old-school 主题（已接 JS + 跨页面联动）

> 注意：早期这个开关只有纯 CSS 视觉切换、**未接 JS**。现在已经接上了——更新代码时以此为准。

- 触发器是首页 `<body>` 里隐藏的 `#toggle-old-school` checkbox（经典的隐藏 checkbox + label 模式，`clip: rect(0 0 0 0)` 等技巧使其视觉隐藏但仍可聚焦 / Tab 到达）。
- `main.js` 的 `setupThemeToggle()` 监听其 `change`：给 `<body>` 切 `.theme-old`，切换时临时挂 `.theme-transitioning`（700ms 后摘掉，避免长期挂全局过渡拖累其它动画），并把选择写入 `localStorage`（键 **`sanmu-theme`**，值 `old` / `modern`）。读写都包了 `try/catch`，Safari 隐私模式等禁用 localStorage 时静默降级。
- **跨页面联动**：`subpage.js` 在子页面 / more-works 页启动时读取同一个 `sanmu-theme` 键并应用到 `<body>`，所以首页选的主题会带到所有子页面（子页面本身没有切换开关，只"读"不"写"）。
- 状态全部由 `<body>` 类名承载：无类 = modern，加 `.theme-old` = old-school。CSS 用 `body.theme-old` 前缀做差异化（衬线字体、报纸单色滤镜等）。

### 3. more-works 横向滚动联动（ScrollTrigger pin + scrub）

`more-works.js` 的核心：把 `.h-scroll` 区域 `pin` 在视口，垂直滚动行程映射成 `.h-scroll__track` 的 `transform: translateX`，`scrub: 1` 让位移跟手平滑。Footer 进度条 / 计数随 `onUpdate` 更新；各图块再叠一层"按滚动速度做 skew / 位移 / scaleX 的惯性拖尾"，停止滚动后用各自的随机缓动归位。

这一页有两个**易踩且互相牵连**的布局坑（`style.css` 注释里有详述）：

- **不能让 body 变成内部滚动容器。** 全局 `html, body { height:100%; overflow-y:auto }` 会让真正的滚动发生在 body 内部，`window.scrollY` 恒为 0，而 ScrollTrigger 默认以 window 为 scroller → pin / scrub 收不到滚动事件，横向联动直接失效。所以本页用 `html:has(body.mw-body)` 反选祖先 `<html>`，连同 `.mw-body` 一起解除 `height/overflow` 限制，回到正常文档流滚动。
- **隐藏 Chrome 原生横向滚动条要用 `overflow-x: clip`，不能用 `hidden`。** 文档层横向用 `clip` 裁掉溢出、隐藏原生横向滚动条；纵向保持 `overflow-y: visible` 交给 window 滚动。原因：`hidden` 属于"滚动值"，按 CSS 规范当一轴是 `visible`、另一轴是滚动值时，`visible` 会被算成 `auto`，于是 `overflow-y` 变 `auto`、body 重新成为滚动容器，上一条的修复被破坏。`clip` 不属于滚动值，与 `visible` 搭配不会触发换算，也不会为 fixed 元素创建新包含块（Header / Footer / 被 pin 的 `.h-scroll` 仍相对视口定位）。

## 其他动手前要知道的约定

- **类名走 BEM-ish 风格。** 块用 `__element`（`.hero__title`、`.h-scroll__track`、`.work-card__media`），修饰符独立成类（`.mousePointer.big`、`.h-panel--collage`）。新增组件保持一致。
- **圆形旋转文字** 在 `.circle-text` 里，是 SVG `<textPath>` 沿 `<defs>` 中定义的隐形圆形路径排布；旋转是外层 div 上的 CSS `@keyframes spin`，**不是 SVG 自己在转**。
- **源码注释密度高、是中文、偏教学性质。** 它们解释"为什么这么写"（为什么不给 transform 加 transition、为什么 checkbox 要 visually-hidden 但仍可聚焦、为什么横向用 clip 而非 hidden）。扩展代码时保持这种风格——只删确实写错的，不删解释 why 的。
- **多种链接写法是有意为之**（首页作品列表注释里点明）：① 相对路径目录 `./works/<slug>/`、② 绝对路径目录 `/works/pefc/`、③ 同级 HTML 文件 `./more-works.html`。改动链接时留意这层教学意图。
- **可访问性**：`prefers-reduced-motion: reduce` 下，CSS 关掉卡片 hover 缩放过渡，`more-works.js` 同时跳过惯性拖尾，二者需配合保持一致。
- 复活 Paper.js canvas 时注意：HTML 里 canvas id 是 `myCanvas`，应调用 `paper.setup('myCanvas')` 而非 `paper.setup('canvas')`，后者会静默失败。

## 约定

- 首页新 JS 模块放 `src/` 下，从 `src/main.js` 引入；子页面共享逻辑放 `subpage.js`。**不要**在 HTML 里随意加新的 `<script>` 标签（GSAP 之类的库 CDN 除外，且要尊重既有加载顺序）。
- `src/style.css` 是全局样式表，没有 CSS 作用域、没有预处理器。
