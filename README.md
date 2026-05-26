# Sanmu Portfolio Case

一个基于 [Paper.js](http://paperjs.org/) 与 jQuery 的作品集案例项目，使用原生 HTML/CSS/JavaScript 构建，无需打包工具即可运行。

## ✨ 项目简介

本项目是一个用于学习与实践 Paper.js 矢量图形库的练习仓库，主要用于：

- 探索 Paper.js 在 Canvas 上的绘图能力
- 结合 jQuery 处理交互逻辑
- 作为后续作品集页面与可视化效果的基础脚手架

## 📂 目录结构

```
sanmu-portfolio-case/
├── index.html          # 入口 HTML，引入 jQuery 与 Paper.js（CDN）
├── src/
│   ├── main.js         # 业务脚本入口（ES Module）
│   └── style.css       # 全局样式
├── .gitignore
└── README.md
```

## 🚀 快速开始

项目无需构建步骤，使用任意静态服务器打开即可。

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
| [Paper.js](http://paperjs.org/) | 0.12.18 | 矢量图形与 Canvas 绘制 |
| [jQuery](https://jquery.com/) | 3.7.1 | DOM 操作与事件处理 |
| HTML5 / CSS3 | - | 页面结构与样式 |

依赖均通过 CDN 引入，无需 `npm install`。

## 📝 开发提示

- `src/main.js` 中已包含一个 Paper.js 入门示例（当前已注释），可取消注释作为起点
- `index.html` 中的 `<canvas id="myCanvas" resize>` 使用 Paper.js 的 `resize` 属性自动适配窗口尺寸
- 业务脚本以 `type="module"` 方式加载，便于后续按模块拆分

## 📄 License

仅用于个人学习与作品集展示。
