// // Paper.js 入口
// // CDN 方式引入后，paper 会作为全局变量挂载在 window 上

// // 1. 将 Paper.js 绑定到指定 canvas
// paper.setup('myCanvas');


/* -------------------------------------------------------------------------- */
/* 页面预加载动画（Preloader）                                                  */
/* -------------------------------------------------------------------------- */
/*
   流程拆解（与 CSS 配合）：
     1) 页面一进来 .preloader 默认覆盖全屏，前层黑、后层绿；
     2) DOMContentLoaded 后给 .preloader 加 .is-ready —— 中央百分比淡入；
     3) 用 setTimeout（这里更准确的做法是 setInterval / rAF）模拟"加载进度"，
        把 0 → 100 的数字写到 .preloader__count-number；
     4) 进度到 100% 时给 .preloader 加 .is-done —— 触发 CSS transition：
          - 前层立刻上滑（transition-delay: 0）；
          - 后层延迟 0.15s 上滑（CSS 里写好的 transition-delay）；
     5) 监听最后一层（后层）的 transitionend，加 .is-hidden（display: none），
        把 preloader 完全从渲染树移除，节省合成开销。

   关键点：
   - "进度模拟" 用 setTimeout 递归，便于让步长不均匀（前快后慢更真实）；
     若想要稳定节拍，可以换成 setInterval / requestAnimationFrame。
   - transition-delay 是错位动画的核心，不需要 JS 介入第二层的时机。
   - 离场时让计数文字先一步淡出（CSS 已处理），避免帘幕掀到一半还能看到数字。
   - GSAP 也能完成同样效果（gsap.timeline().to(layer1).to(layer2, '-=0.85')），
     这里用纯 CSS 是因为它更轻量、易复用，且不依赖 GSAP 的加载状态——
     如果 GSAP 加载慢，预加载动画自己就先报废了，这是要避免的。
*/
(function runPreloader() {
    const preloader = document.getElementById('preloader');
    if (!preloader) return;

    const numberEl = preloader.querySelector('.preloader__count-number');
    // 取后层作为"动画终点"的标志：因为它有 0.15s 的 transition-delay，
    // 它的 transitionend 一定晚于前层，最适合用来判断整套动画结束。
    const lastLayer = preloader.querySelector('.preloader__layer--second');

    // 加载完成后再淡入百分比，避免初帧闪烁
    requestAnimationFrame(() => preloader.classList.add('is-ready'));

    let progress = 0;

    // 用 setTimeout 递归，做"步长不均匀"的进度模拟（前快后慢更像真实加载）
    function step() {
        // 剩余越多步长越大；剩余越少步长越小，模拟"最后一公里"那种慢吞吞
        const remaining = 100 - progress;
        // Math.max(1, ...) 保证不会卡死在 99 不前进
        const delta = Math.max(1, Math.round(remaining * 0.08));
        progress = Math.min(100, progress + delta);
        if (numberEl) numberEl.textContent = progress;

        if (progress < 100) {
            // 80~180ms 的随机间隔，让节奏不机械
            setTimeout(step, 80 + Math.random() * 100);
        } else {
            // 进度到顶后稍停一拍再开始离场，让用户"看清楚"100%
            setTimeout(() => {
                preloader.classList.add('is-done');
            }, 250);
        }
    }

    // 包一层 setTimeout 让首帧的 .is-ready 渐入先跑起来
    setTimeout(step, 200);

    // 监听最后一层离场结束 → 把整个 preloader 收掉
    if (lastLayer) {
        lastLayer.addEventListener(
            'transitionend',
            (e) => {
                // 仅响应 transform（避免被其它属性的 transitionend 误触发）
                if (e.propertyName !== 'transform') return;
                preloader.classList.add('is-hidden');
            },
            { once: true }
        );
    }
})();


/* -------------------------------------------------------------------------- */
/* GSAP 初始化                                                                  */
/* -------------------------------------------------------------------------- */
// GSAP 与 ScrollTrigger 都是通过 CDN 在 index.html 里以全局脚本的方式加载，
// 所以这里直接使用 window 上的 `gsap` / `ScrollTrigger`，不需要 import。
//
// 关键概念：
//   - gsap.to(target, vars)       → 从当前状态补间到 vars 描述的状态
//   - gsap.from(target, vars)     → 从 vars 描述的状态补间到当前状态
//   - gsap.fromTo(target, a, b)   → 显式指定起止状态
//   - gsap.timeline()             → 时间轴，串联多个补间
//   - ScrollTrigger               → 滚动驱动动画的插件，需要先 registerPlugin
//
// registerPlugin 必须在使用任何 ScrollTrigger 功能之前调用一次；
// 多次调用是安全的（GSAP 内部去重），所以放在文件最顶部最稳。
//
// 防御：ScrambleTextPlugin 走的是 GSAP 自己的 CDN（gsap-trial / 私有 npm），
// 万一 CDN 抽风导致脚本未加载，window.ScrambleTextPlugin 会是 undefined。
// 直接传给 registerPlugin 不会报错，但传给 registerPlugin 之后再写
// `scrambleText:` 会静默失效；这里用短路读法防止 ReferenceError 把
// 整个 main.js 拉胯（鼠标指针、聚光灯等后续代码都依赖这个文件能跑完）。
gsap.registerPlugin(
    ScrollTrigger,
    typeof ScrambleTextPlugin !== 'undefined' ? ScrambleTextPlugin : null
);

// 冒烟测试：让 .hero__greeting 在加载时从下方淡入。
// 仅用于验证 GSAP 是否成功引入，确认无误后可以删除这段。
gsap.from('.hero__greeting', {
    y: 20,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out',
});


// // 2. 简单示例：在画布中央绘制一个圆，验证 Paper.js 是否正常工作
// const center = paper.view.center;
// const circle = new paper.Path.Circle({
//     center: center,
//     radius: 80,
//     fillColor: '#ff6b6b',
// });

// // 3. 添加一个动画帧回调，让圆做轻微的呼吸动画
// paper.view.onFrame = (event) => {
//     // event.time 为动画累计时间，使用正弦函数实现缩放循环
//     const scale = 1 + Math.sin(event.time * 2) * 0.05;
//     circle.scaling = scale;
// };

// // 4. 鼠标点击时在点击位置绘制一个随机颜色的圆
// paper.view.onMouseDown = (event) => {
//     new paper.Path.Circle({
//         center: event.point,
//         radius: 20 + Math.random() * 40,
//         fillColor: new paper.Color(Math.random(), Math.random(), Math.random()),
//     });
// };


/* -------------------------------------------------------------------------- */
/* 自定义鼠标指针 —— 跟随鼠标，带缓动效果                                       */
/* -------------------------------------------------------------------------- */
// 思路：
// 1. 监听 mousemove，记录鼠标的真实坐标 (targetX, targetY)
// 2. 用 requestAnimationFrame 持续把指针的当前坐标 (currentX, currentY)
//    向目标坐标"按一定比例靠近"，公式：current += (target - current) * easing
// 3. easing 越小越"粘"，越大越跟手；常用区间 0.1 ~ 0.25
// 4. 使用 transform: translate3d 触发 GPU 合成，性能更好

const $pointer = $('.mousePointer');

// 初始坐标定在屏幕中央，避免页面加载时指针出现在 (0,0) 闪一下
let targetX = window.innerWidth / 2;
let targetY = window.innerHeight / 2;
let currentX = targetX;
let currentY = targetY;

// 缓动系数：值越小越柔，值越大越跟手
const EASING = 0.15;

// 鼠标移动时只更新目标坐标，真正的位移交给动画循环处理
$(document).on('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
});

// 鼠标离开窗口时隐藏指针，回到窗口时再显示
$(document).on('mouseleave', () => $pointer.css('opacity', 0));
$(document).on('mouseenter', () => $pointer.css('opacity', 1));

// 动画循环：使用 rAF 保持与浏览器刷新率同步
function tick() {
    // 线性插值（lerp），让 current 平滑追赶 target
    currentX += (targetX - currentX) * EASING;
    currentY += (targetY - currentY) * EASING;

    // 用 translate3d 让浏览器走 GPU 合成路径
    $pointer.css(
        'transform',
        `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`
    );

    requestAnimationFrame(tick);
}

requestAnimationFrame(tick);


/* -------------------------------------------------------------------------- */
/* 小圆点变大圆点 —— 鼠标悬停在带 data-bigdot 标签的元素上时，指针放大           */
/* -------------------------------------------------------------------------- */
// 思路：
// 1. 用属性选择器选中所有带 data-bigdot="true" 的元素（不限定标签，
//    这样 div、label、a 等任何标签只要带这个属性都会生效）
// 2. 通过 jQuery 的 .hover(enter, leave) 同时绑定进入/离开事件
// 3. 进入时给 .mousePointer 添加 .big 类，离开时移除；放大效果交给 CSS 处理
const allElements = $('[data-bigdot=true]');
console.log(allElements);

allElements.hover(() => {
    // 鼠标进入：指针放大
    $pointer.addClass('big');
}, () => {
    // 鼠标离开：恢复默认大小
    $pointer.removeClass('big');
});


/* -------------------------------------------------------------------------- */
/* 人像聚光灯 —— 鼠标悬停在前景图上时，挖出一个柔和的圆，露出后方的第二张图        */
/* -------------------------------------------------------------------------- */
// 思路：
// 1. CSS 已经在 .portrait--front 上用 radial-gradient 做了 mask，
//    通过 --mx / --my / --r 三个 CSS 变量控制圆心与半径。
// 2. JS 这里只负责更新这三个变量：
//    - mousemove 时记录目标坐标 targetMX / targetMY
//    - mouseenter 把目标半径设为 SPOT_RADIUS，mouseleave 设回 0
// 3. 用 requestAnimationFrame + 线性插值（lerp）让 current 平滑追赶 target，
//    所以鼠标快速移动或进出时，圆斑都不会"硬切"，整体丝滑。
const $front = $('.portrait--front');

if ($front.length) {
    const frontEl = $front[0];

    // 圆斑目标半径（鼠标在图上时）。可按需调整大小
    const SPOT_RADIUS = 160;
    // 拆成两个 lerp 系数：
    // - 位置缓动很小 → 拖尾明显，鼠标快速移动时光斑像被"拽"着跟上来
    // - 半径缓动稍大 → 聚光出现/消失更利落，不会让人感觉迟钝
    const POS_EASING = 0.08;
    const RADIUS_EASING = 0.18;

    // 目标值（鼠标实际位置 + 期望半径）
    let targetMX = 0;
    let targetMY = 0;
    let targetR = 0;

    // 当前值（动画里平滑追赶 target 的那一份）
    let curMX = 0;
    let curMY = 0;
    let curR = 0;

    // 鼠标进入：把目标半径设为 SPOT_RADIUS；
    // 注意：不再把 cur* 对齐到鼠标位置，保留"从远处滑入"的拖尾感
    $front.on('mouseenter', (e) => {
        const rect = frontEl.getBoundingClientRect();
        targetMX = e.clientX - rect.left;
        targetMY = e.clientY - rect.top;
        targetR = SPOT_RADIUS;
    });

    // 鼠标移动：只更新目标坐标，真正的位移交给 rAF
    $front.on('mousemove', (e) => {
        const rect = frontEl.getBoundingClientRect();
        targetMX = e.clientX - rect.left;
        targetMY = e.clientY - rect.top;
    });

    // 鼠标离开：目标半径回到 0，圆斑会平滑收缩消失
    $front.on('mouseleave', () => {
        targetR = 0;
    });

    // 动画循环：lerp 平滑插值，写入 CSS 变量
    function spotTick() {
        curMX += (targetMX - curMX) * POS_EASING;
        curMY += (targetMY - curMY) * POS_EASING;
        curR += (targetR - curR) * RADIUS_EASING;

        frontEl.style.setProperty('--mx', `${curMX}px`);
        frontEl.style.setProperty('--my', `${curMY}px`);
        frontEl.style.setProperty('--r', `${curR}px`);

        requestAnimationFrame(spotTick);
    }

    requestAnimationFrame(spotTick);
}


/* -------------------------------------------------------------------------- */
/* Works 列表：跟随鼠标的浮动缩略图                                             */
/* -------------------------------------------------------------------------- */
// 思路（与自定义指针完全同构，复用一套 rAF + lerp 模式）：
// 1. mousemove 时记录鼠标真实坐标到 targetTX / targetTY
// 2. mouseenter 切换图片 src 并加 .is-visible 类（淡入）
// 3. mouseleave 移除 .is-visible 类（淡出）
// 4. rAF 循环里把 currentTX/Y 平滑插值到 target，写入 CSS 变量 --tx / --ty
// 5. transform 在 CSS 里用 translate3d(var(--tx), var(--ty), 0) translate(-50%, -50%)
//    做到"图片中心跟随鼠标"，且走 GPU 合成路径

const $thumb = $('.works__thumb');
const $thumbImg = $('.works__thumb-img');
const $worksItems = $('.works__item');

if ($thumb.length && $worksItems.length) {
    const thumbEl = $thumb[0];

    // 缩略图缓动系数：略小一点更有"拖尾"感
    const THUMB_EASING = 0.12;

    // 目标坐标 / 当前坐标
    let targetTX = window.innerWidth / 2;
    let targetTY = window.innerHeight / 2;
    let currentTX = targetTX;
    let currentTY = targetTY;

    // 在列表区域内统一监听 mousemove，比给每个 li 都绑定更省事
    $worksItems.on('mousemove', (e) => {
        targetTX = e.clientX;
        targetTY = e.clientY;
    });

    // 鼠标进入某行：切换图片源 + 显示
    $worksItems.on('mouseenter', function (e) {
        const src = this.getAttribute('data-thumb');
        if (src) {
            // 仅当 src 改变时才更新，避免在同一行内移动反复重置图片
            if ($thumbImg.attr('src') !== src) {
                $thumbImg.attr('src', src);
            }
        }
        // 立即把当前坐标对齐鼠标，避免从屏幕中心"飞"过来
        targetTX = e.clientX;
        targetTY = e.clientY;
        $thumb.addClass('is-visible');
    });

    // 鼠标离开某行：淡出
    $worksItems.on('mouseleave', () => {
        $thumb.removeClass('is-visible');
    });

    // 动画循环：lerp 平滑插值，写入 CSS 变量
    function thumbTick() {
        currentTX += (targetTX - currentTX) * THUMB_EASING;
        currentTY += (targetTY - currentTY) * THUMB_EASING;

        // 直接写 CSS 变量，让 CSS 里的 transform 公式去合成最终位移
        thumbEl.style.setProperty('--tx', `${currentTX}px`);
        thumbEl.style.setProperty('--ty', `${currentTY}px`);

        requestAnimationFrame(thumbTick);
    }

    requestAnimationFrame(thumbTick);
}


/* -------------------------------------------------------------------------- */
/* Works 列表：磁吸 hover 效果                                                  */
/* -------------------------------------------------------------------------- */
// 思路：
// 1. 监听 .works 容器的 mousemove，遍历每行 li 计算"鼠标到行中心"的距离
// 2. 距离越近，行被"吸引"得越厉害；超过影响半径就归零
// 3. 偏移方向 = 鼠标 - 行中心，再按距离衰减系数缩放
// 4. 每行用一对 target / current 做 lerp 平滑（与项目其他动画同构）
// 5. 写入 CSS 变量 --magnet-x / --magnet-y，由 CSS 里的 transform 公式合成位移

const $worksContainer = $('.works');
const $magnetItems = $('.works__item');

if ($worksContainer.length && $magnetItems.length) {
    // 影响半径：鼠标在行的"垂直距离"超过这个值就不再吸附（单位 px）
    const INFLUENCE_RADIUS = 200;
    // 最大偏移量（px）
    const MAX_OFFSET = 10;
    // 磁吸缓动系数：稍小一点更"粘"
    const MAGNET_EASING = 0.18;

    // 给每个 item 维护一份独立的 target / current 状态
    const items = $magnetItems.toArray().map((el) => ({
        el,
        targetX: 0,
        targetY: 0,
        currentX: 0,
        currentY: 0,
    }));

    // 容器范围内监听 mousemove
    $worksContainer.on('mousemove', (e) => {
        items.forEach((item) => {
            const rect = item.el.getBoundingClientRect();
            // 行中心点
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            // 鼠标到行中心的向量
            const dx = e.clientX - cx;
            const dy = e.clientY - cy;
            // 用垂直距离做衰减判断（行很宽，水平方向几乎总在范围内，靠 dy 决定影响）
            const dist = Math.abs(dy);

            if (dist < INFLUENCE_RADIUS) {
                // 距离越近，strength 越接近 1；超出范围 strength = 0
                const strength = 1 - dist / INFLUENCE_RADIUS;
                // 限幅，避免大字号下 dx 过大导致偏移夸张
                item.targetX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, dx * 0.05)) * strength;
                item.targetY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, dy * 0.05)) * strength;
            } else {
                item.targetX = 0;
                item.targetY = 0;
            }
        });
    });

    // 鼠标离开整个列表区域时，所有行回正
    $worksContainer.on('mouseleave', () => {
        items.forEach((item) => {
            item.targetX = 0;
            item.targetY = 0;
        });
    });

    // 动画循环：每帧 lerp 所有行，再写入 CSS 变量
    function magnetTick() {
        items.forEach((item) => {
            item.currentX += (item.targetX - item.currentX) * MAGNET_EASING;
            item.currentY += (item.targetY - item.currentY) * MAGNET_EASING;
            item.el.style.setProperty('--magnet-x', `${item.currentX}px`);
            item.el.style.setProperty('--magnet-y', `${item.currentY}px`);
        });
        requestAnimationFrame(magnetTick);
    }
    requestAnimationFrame(magnetTick);
}


/* -------------------------------------------------------------------------- */
/* Hero 标题：字符扰动 → 单向揭示（纯 GSAP / ScrambleTextPlugin）                */
/* -------------------------------------------------------------------------- */
// 设计：
//   1) 把 .hero__title 的文本拆成 N 个 <span class="char">，每个 span 起始
//      内容是空字符串。
//   2) 对每个 span 跑一个 gsap.to(scrambleText: ...) 动画 —— 这是 GSAP
//      ScrambleTextPlugin 的核心 API：把元素文本以"随机符号刷新 → 真实字符
//      落定"的方式补间过去。
//   3) 用 gsap.timeline() 把这 N 个 tween 按 "<+=offset" 的方式串起来，
//      实现"前一个字开始 offset 秒后下一个字也开始" —— 等价于过去手写的
//      顺序时间轴，但完全声明式。
//   4) 光标跟随：每个 tween 在 onStart 时把 .char--active 挂到当前 span，
//      onComplete 时移除；不再需要每帧扫描"最左侧活跃字符"。
//
// 为什么用单字符 tween 而不是整段一条 scrambleText：
//   ScrambleTextPlugin 默认会把整段文本一次性接管，扰动时整行都在抖；
//   要的是"已落定的字保持稳定、只有当前字在跳"，所以必须按字符切。

const $heroTitle = $('.hero__title');

if ($heroTitle.length) {
    const titleEl = $heroTitle[0];
    const finalText = titleEl.textContent;

    // 自定义扰动符号池。ScrambleTextPlugin 的 chars 参数支持：
    //   - 'upperCase' / 'lowerCase' / 'upperAndLowerCase'：内置池
    //   - 任意字符串：用作随机字符池（这里就是这种用法）
    const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#$%&@';

    // 每个字符的扰动 → 揭示总时长（秒）
    const CHAR_DURATION = 0.18;
    // 相邻字符的开始间隔（秒）；小于 CHAR_DURATION 时会出现"上一个字还没落定，
    // 下一个字已经在扰动"的重叠感。要严格顺序，把它设成 >= CHAR_DURATION。
    const CHAR_OFFSET = 0.05;

    // ---- 1. 拆字 ----
    // 关键：先清空再 append，否则原文本会和新生成的 span 同时存在。
    titleEl.textContent = '';
    const frag = document.createDocumentFragment();
    const spans = [];
    [...finalText].forEach((ch) => {
        const span = document.createElement('span');
        const isSpace = ch === ' ';
        // 复用 CSS 已有类名（.char / .char--space / .char--locked）
        span.className = isSpace ? 'char char--space' : 'char';
        // 起始为空 —— ScrambleTextPlugin 会从这个空状态补间到 finalChar
        span.textContent = '';
        // 把最终字符存到 dataset，下面 tween 时回读
        span.dataset.final = ch;
        frag.appendChild(span);
        spans.push(span);
    });
    titleEl.appendChild(frag);

    // ---- 2. 用 timeline 串联每个字符的扰动 tween ----
    // 用 onComplete 默认结束的 timeline；不显式指定 paused，所以创建即播放。
    const tl = gsap.timeline();

    spans.forEach((span, i) => {
        const finalChar = span.dataset.final;
        const isSpace = finalChar === ' ';

        // 空格直接 set 一下就好，没必要走扰动 —— 省一次 tween，节奏也更干脆
        if (isSpace) {
            tl.set(span, {
                textContent: finalChar,
                onStart: () => addCaret(span),
                onComplete: () => removeCaret(span),
            }, i === 0 ? 0 : `<+=${CHAR_OFFSET}`);
            return;
        }

        tl.to(
            span,
            {
                duration: CHAR_DURATION,
                // ScrambleTextPlugin 的 vars：
                //   text         → 揭示完成后的最终文本
                //   chars        → 扰动字符池
                //   revealDelay  → 多久后开始按位揭示（0 = 全程都在扰动直到结尾）
                //   speed        → 扰动符刷新速率（0~1，越大越快）
                //   tweenLength  → 是否在过渡中改变文本长度（false 保持目标长度）
                scrambleText: {
                    text: finalChar,
                    chars: SCRAMBLE_CHARS,
                    revealDelay: 0,
                    speed: 0.8,
                    tweenLength: false,
                },
                ease: 'none',
                onStart: () => {
                    addCaret(span);
                    // 揭示中可视化为"扰动中"，CSS 里 .char 默认就是品牌绿
                    span.classList.remove('char--locked');
                },
                onComplete: () => {
                    removeCaret(span);
                    span.classList.add('char--locked');
                },
            },
            // 第一个字符放在 0；后续字符相对前一个补间的开始时间偏移 CHAR_OFFSET。
            // GSAP 位置语法：
            //   "<"        → 上一个动画的开始时刻
            //   "<+=0.05"  → 上一个动画开始后 0.05s
            //   ">"        → 上一个动画的结束时刻
            //   "+=0.05"   → 当前 timeline 末尾再延后 0.05s
            i === 0 ? 0 : `<+=${CHAR_OFFSET}`
        );
    });

    // ---- 3. 光标工具函数 ----
    // 与原实现一致：CSS 里 .char--active::after 画一个闪烁的 ▊。
    // 这里维护一个全局变量，避免遗漏 remove 导致同时多个光标。
    let activeSpan = null;
    function addCaret(span) {
        if (activeSpan && activeSpan !== span) activeSpan.classList.remove('char--active');
        activeSpan = span;
        span.classList.add('char--active');
    }
    function removeCaret(span) {
        span.classList.remove('char--active');
        if (activeSpan === span) activeSpan = null;
    }
}



/* -------------------------------------------------------------------------- */
/* 主题切换：Modern ↔ Old-school                                                */
/* -------------------------------------------------------------------------- */
/*
   核心契约（与 CSS 配合）：
   - 状态由 <body> 的类名承载：默认无类 = modern；加 .theme-old = old-school；
   - 切换时先加 .theme-transitioning 挂全局过渡，700ms 后摘掉，
     避免长期挂着通配符 transition 拖累其它交互动画；
   - localStorage 持久化用户选择，下次刷新恢复；
   - 触发器复用 HTML 里已有的 #toggle-old-school checkbox：
     不需要新增 DOM、也不破坏纯 CSS 视觉切换的机制。

   注意：
   - JS 只做"挂类名 + 持久化"，所有视觉细节（颜色/字体/装饰图层）都在 CSS。
   - 这套设计是面向"可扩展"的：加第三套主题只需加一个变量覆盖块和一个类名映射，
     JS 不需要变。
*/
(function setupThemeToggle() {
    const toggle = document.getElementById('toggle-old-school');
    if (!toggle) return;

    const STORAGE_KEY = 'sanmu-theme';
    const TRANSITION_MS = 700;

    /**
     * 应用主题。
     * @param {boolean} isOld - true = old-school, false = modern
     * @param {boolean} animate - 是否挂临时过渡类名（首次初始化时 false，避免页面首屏闪过渡）
     */
    function applyTheme(isOld, animate = true) {
        if (animate) {
            document.body.classList.add('theme-transitioning');
            // 等过渡跑完再摘掉，避免长期挂通配符 transition
            setTimeout(
                () => document.body.classList.remove('theme-transitioning'),
                TRANSITION_MS
            );
        }
        document.body.classList.toggle('theme-old', isOld);
    }

    // ---- 初始化：从 localStorage 读上次的选择 ----
    // 包 try/catch 是为了在 Safari 隐私模式 / 某些 webview 里 localStorage
    // 被禁用时不会让整个 IIFE 抛错中断后续代码。
    let initialIsOld = false;
    try {
        initialIsOld = localStorage.getItem(STORAGE_KEY) === 'old';
    } catch (_) {
        // localStorage 不可用就用默认主题，静默降级
    }

    // 同步 checkbox 视觉状态（CSS 的 :checked 兄弟选择器依赖这个属性）
    toggle.checked = initialIsOld;
    // 首次应用不挂过渡，避免页面加载时白→米色的"硬切动画"
    applyTheme(initialIsOld, false);

    // ---- 监听 change：用户切换时更新主题 + 持久化 ----
    toggle.addEventListener('change', () => {
        const isOld = toggle.checked;
        applyTheme(isOld, true);
        try {
            localStorage.setItem(STORAGE_KEY, isOld ? 'old' : 'modern');
        } catch (_) {
            // 静默降级：写不进就算了，不影响主题切换效果本身
        }
    });
})();
