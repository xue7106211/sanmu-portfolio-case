/* -------------------------------------------------------------------------- */
/* 子页面共享脚本（subpage.js）                                                 */
/* -------------------------------------------------------------------------- */
/*
   定位：
   - 首页 main.js 承载了一整套重交互（GSAP 扰动标题、预加载帘幕、聚光灯、
     磁吸、缩略图跟随……）。子页面（作品详情 / more-works）不需要这些，
     只需要"和首页观感一致"的两件事：
       1) 自定义鼠标指针（含 data-bigdot 悬停放大）
       2) 主题（modern ↔ old-school）跟随首页的 localStorage 选择
   - 所以这里只用原生 JS（不依赖 jQuery / GSAP），保持子页面轻量、加载快。

   与首页的契约保持一致：
   - 指针元素：.mousePointer（CSS 已全局定义，cursor: none 隐藏系统光标）
   - 放大触发：带 data-bigdot="true" 的元素，hover 时给 .mousePointer 加 .big
   - 主题持久化键：'sanmu-theme'，值 'old' / 'modern'
*/

/* ---- 1) 主题：从 localStorage 恢复首页的选择 ---- */
(function restoreTheme() {
    let isOld = false;
    try {
        isOld = localStorage.getItem('sanmu-theme') === 'old';
    } catch (_) {
        // localStorage 不可用（隐私模式等）就用默认主题，静默降级
    }
    // 子页面没有切换开关，纯粹"读"首页的选择并应用到 <body>
    document.body.classList.toggle('theme-old', isOld);
})();

/* ---- 2) 自定义鼠标指针：rAF + 线性插值，与首页同构 ---- */
(function customPointer() {
    const pointer = document.querySelector('.mousePointer');
    if (!pointer) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;

    // 缓动系数：与首页保持一致的手感
    const EASING = 0.15;

    document.addEventListener('mousemove', (e) => {
        targetX = e.clientX;
        targetY = e.clientY;
    });

    document.addEventListener('mouseleave', () => { pointer.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { pointer.style.opacity = '1'; });

    function tick() {
        // current 平滑追赶 target；故意只用 transform 写位置（不进 CSS transition），
        // 避免和每帧 rAF 更新打架产生拖影 —— 这点与首页注释里的约定一致
        currentX += (targetX - currentX) * EASING;
        currentY += (targetY - currentY) * EASING;
        pointer.style.transform =
            `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    // data-bigdot 契约：任意带该属性的元素 hover 时指针放大
    document.querySelectorAll('[data-bigdot=true]').forEach((el) => {
        el.addEventListener('mouseenter', () => pointer.classList.add('big'));
        el.addEventListener('mouseleave', () => pointer.classList.remove('big'));
    });
})();
