# Sanmu Portfolio Case

一个**无构建、纯 CDN** 的多页作品集站点，使用原生 HTML / CSS / JavaScript 构建，无需打包工具即可运行。

## ✨ 项目简介

本项目是一个作品集前端练习仓库，由一个首页 + 一个横向滚动归档页 + 若干作品详情页组成，重点实践：

- 自定义鼠标指针、预加载帘幕、聚光灯 / 磁吸等微交互（jQuery + GSAP）
- 基于 GSAP **ScrollTrigger** 的"垂直滚动 ↔ 横向移动"联动（`more-works.html`）
- 纯 CSS + 少量 JS 的 **modern ↔ old-school** 主题切换，并通过 `localStorage` 跨页面联动
- 多种页面跳转写法（相对路径目录 / 绝对路径目录 / 同级 HTML 文件）

> 备注：`index.html` 中仍保留了 Paper.js 的 CDN 引入与一段被注释的入门代码，作为"留作日后复活"的脚手架，**当前并未启用**。实际运行时的库是 jQuery 与 GSAP。

## 📂 目录结构

```
sanmu-portfolio-case/
├── index.html              # 首页：预加载、Hero、作品列表、联系区（重交互）
├── more-works.html         # 横向滚动归档页（GSAP ScrollTrigger pin + scrub）
├── works/                  # 作品详情页，每个作品一个目录，内含 index.html
│   ├── recongroup/
│   ├── glassland/
│   ├── pefc/
│   ├── biosphere-lab-lungau/
│   ├── ziid/
│   └── hotel-gambswirt/
├── src/
│   ├── main.js             # 首页脚本入口（预加载 / 指针 / 主题切换 等）
│   ├── subpage.js          # 子页面共享脚本（指针 + 主题跟随，原生 JS）
│   ├── more-works.js       # more-works 横向滚动联动（GSAP ScrollTrigger）
│   └── style.css           # 全局样式（含首页 + 子页面 + 横向滚动页）
├── CLAUDE.md               # 面向 AI 助手的仓库说明
├── .gitignore
└── README.md
```

## 🚀 快速开始

项目无需构建步骤，使用任意静态服务器打开即可。

> 建议用静态服务器而非直接 `file://` 打开：首页作品列表里有一条**绝对路径**链接（`/works/pefc/`），它需要"站点根"才能正确解析。

### 方式一：VS Code Live Server

1. 在 VS Code 中安装 `Live Server` 扩展
2. 右键 `index.html` 选择 **Open with Live Server**

### 方式二：使用 Node.js 启动本地服务

```bash
# 使用 npx 启动一个临时静态服务器
npx serve .

# 或使用 http-server
npx http-server .
```

### 方式三：Python 内置服务器

```bash
python3 -m http.server 8080
```

然后在浏览器访问 [http://localhost:8080](http://localhost:8080)。

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
| --- | --- | --- |
| [jQuery](https://jquery.com/) | 3.7.1 | DOM 操作与事件处理（首页交互主力） |
| [GSAP](https://gsap.com/) | 3.12.5 | 动画引擎 |
| GSAP **ScrollTrigger** | 3.12.5 | 滚动驱动动画（首页 + 横向滚动联动） |
| GSAP **ScrambleTextPlugin** | 3.12.5（trial） | 文字扰动效果（见下方提示） |
| [Paper.js](http://paperjs.org/) | 0.12.18 | 矢量图形（已引入但**当前停用**） |
| HTML5 / CSS3 | - | 页面结构与样式 |

依赖均通过 CDN 引入，无需 `npm install`。

> **关于 ScrambleTextPlugin**：该插件自 2025 起免费授权，但发行渠道仍是 GreenSock 自家。jsdelivr 上公开的 `gsap` npm 包里不含此文件，所以开发期通过 `gsap-trial` 包试用；生产环境需到 [gsap.com](https://gsap.com) 注册后用私有包替换。

## 📝 开发提示

- **自定义指针的隐式契约**：任何带 `data-bigdot="true"` 的元素，hover 时都会让 `.mousePointer` 放大。新增可交互元素只需加这个属性，**不要**去扩展 JS 选择器。
- **主题跨页面联动**：首页的 old-school 开关把选择写入 `localStorage`（键 `sanmu-theme`，值 `old` / `modern`）；子页面与 more-works 页用 `subpage.js` 读取并应用同一主题。
- **横向滚动页（`more-works.html`）**：垂直滚动经过中间区域时，容器被 ScrollTrigger `pin` 住，内容横向平移（`scrub` 跟手），Header / Footer 用 `position: fixed` 保持稳定。
  - 文档层（`html` / `body`）横向用 `overflow-x: clip` 裁掉溢出以隐藏 Chrome 的原生横向滚动条；纵向保持 `overflow-y: visible` 交给 window 滚动，**不可改成 `hidden`**——否则按 CSS 规范另一轴会被算成 `auto`，body 变成滚动容器，ScrollTrigger 读不到 `window.scrollY`，pin / scrub 全部失效。
- 业务脚本均以 `type="module"` 方式加载，便于按模块拆分。

## 📄 License

仅用于个人学习与作品集展示。
