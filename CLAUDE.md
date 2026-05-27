# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目形态

一个**无构建、纯 CDN** 的静态作品集首屏页面。**没有 `package.json`、没有打包工具、没有测试框架**——不要去找 `npm install` / `npm run build` / `npm test`。`src/` 下的文件由任意静态服务器原样下发即可。

README 仍把项目描述为 "Paper.js sandbox"，但当前工作树里 **Paper.js 实际上处于停用状态**——`<canvas>` 标签和 `paper.setup(...)` 这一段都已被注释掉。**jQuery 才是当前的运行时**；把 Paper.js 当作"留作日后复活"的脚手架，而不是当前架构。

## 本地启动

从项目根目录启动任意静态服务器即可，没有偏好的命令：

```bash
npx serve .                  # 或: npx http-server .
python3 -m http.server 8080
```

然后浏览器访问 `http://localhost:8080`。VS Code 的 Live Server 直接打开 `index.html` 也能工作（仓库里有 `.vscode/settings.json`，但目前是空的）。

## 架构：页面到底是怎么跑起来的

整个页面是一个文档，结构如下：

```
.container
  └─ .info-header               (纵向 flex, gap: 48px)
       ├─ .top-bar              (Portfolio 文案 · OFFICIAL DESIGN AWARDS 徽章 · old-school 开关)
       ├─ .hero                 (HI — / I'm Sandra, frontend developer and designer.)
       └─ .media                (人像图 + 旋转的 SVG 圆形文字)
.mousePointer                   (与 .container 同级，自定义鼠标指针)
```

有两套系统是关键的，且**只看任何单独一个文件都看不出来**：

### 1. 自定义鼠标指针（`data-bigdot` 这个隐式契约）

`html, body { cursor: none }` 在全局隐藏了系统光标，可见的指针是 `.mousePointer` 这个 div。

**HTML 和 JS 之间的契约是 `data-bigdot="true"` 这个属性。** `src/main.js` 里的 `$('[data-bigdot=true]').hover(...)` 给所有带这个属性的元素绑定 hover 事件，进入时给 `.mousePointer` 加 `.big`、离开时移除。任何标签（`div`、`label`、`a` 都行）只要带上这个属性，就自动加入"鼠标悬停时指针放大"这套交互。**新增可交互元素？加 `data-bigdot="true"` 即可，不要去扩展 JS 选择器列表。**

**这套指针有两条看起来可改、实则不能动的规则：**

- 指针通过 `requestAnimationFrame` + 线性插值（`current += (target - current) * 0.15`）跟随鼠标，每一帧用 `transform: translate3d(...)` 写位置。CSS 里 `.mousePointer` 的 `transition` **故意不包含 `transform`**——只对 `width / height / background / backdrop-filter` 做过渡。如果有人"顺手"把 `transform` 也加进 transition 列表，会和 rAF 循环打架，产生拖影/抖动。这是刻意的省略，是 load-bearing 的。
- `.big` 状态不是简单的"圆变大"，而是三层叠加效果：`mix-blend-mode: difference` + `backdrop-filter: blur+saturate` + 半透明白底。三者组合产生"随底色反转的毛玻璃"观感，划过任何颜色背景都会自动出反色——动其中任意一个属性都会破掉效果。

### 2. 纯 CSS 的 old-school 开关

"Switch to old school" 这个控件用的是经典的 **隐藏 checkbox + label** 模式（见 `style.css` 里的 `.toggle__input` 和 `.toggle`）。checkbox 视觉上隐藏但保留可聚焦，靠 `clip: rect(0 0 0 0)` 等技巧——屏幕阅读器和键盘 Tab 都能到达；状态映射靠兄弟选择器 `.toggle__input:checked ~ .toggle .toggle__switch`。**目前这个开关还没接 JS**——它只切换自己的视觉状态。让它真正去改变页面（比如切样式表、给 body 加类）是后续工作。

### 其他动手前要知道的约定

- **类名走 BEM-ish 风格。** 块用 `__element`（`.hero__title`、`.toggle__thumb`、`.toggle__input`），修饰符独立成类（`.mousePointer.big`）。新增组件时保持一致。
- **圆形旋转文字** 在 `.circle-text` 里，是 SVG `<textPath>` 沿一段在 `<defs>` 里定义的隐形圆形路径排布（`d="M 60,60 m -50,0 a 50,50 0 1,1 100,0 a 50,50 0 1,1 -100,0"`）。旋转动画是外层 div 上的 CSS `@keyframes spin`，**不是 SVG 自己在转**。
- **源码注释密度高、是中文、偏教学性质。** 它们解释的是"为什么这么写"（比如为什么不给 transform 加 transition、为什么 checkbox 要 visually-hidden 但仍可聚焦）。扩展代码时保持这种风格——只删确实写错的，不删解释 why 的。
- **`index.html` 里的脚本加载顺序是 load-bearing 的。** jQuery → Paper.js → `src/main.js`（`type="module"`）。Paper.js 的 CDN 包会把 `paper` 挂到 `window`，所以日后如果复活 canvas 代码，模块脚本里直接用全局 `paper` 即可，不需要 `import`。**复活 canvas 时注意**：HTML 里的 canvas id 是 `myCanvas`，所以应当调用 `paper.setup('myCanvas')` 而不是 `paper.setup('canvas')`——后者会静默失败。

## 约定

- 新的 JS 模块放在 `src/` 下，从 `src/main.js` 引入。**不要**在 `index.html` 里加新的 `<script>` 标签。
- `src/style.css` 是全局样式表，没有 CSS 作用域、没有预处理器。
