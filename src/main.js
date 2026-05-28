// // Paper.js 入口
// // CDN 方式引入后，paper 会作为全局变量挂载在 window 上

// // 1. 将 Paper.js 绑定到指定 canvas
// paper.setup('myCanvas');

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
/* Hero 标题：打字机 + 字符扰动 + 打错字 + 光标                                  */
/* -------------------------------------------------------------------------- */
// 五态状态机：
//   pending → scrambling → ┬─ locked                  （顺利写出）
//                          └─ error → backspacing → locked   （打错回退后写出）
//
// 时间轴策略：
//   采用"顺序时间轴"——前一个字符的 lockAt 加上 PER_CHAR_DELAY 才是下一个字符
//   的 startAt。这样同一时间至多只有一个字符在 scrambling/error/backspacing
//   状态，光标位置才能"始终在当前正在打的字尾部"。
//
// 时间锚点（按状态机分支）：
//   非打错：startAt → scrambleEndAt(=lockAt) → 进入 locked
//   打错  ：startAt → scrambleEndAt → errorEndAt → backspaceEndAt(=lockAt) → locked
//
// 光标实现：
//   在最左侧非 pending / 非 locked 字符上挂 .char--active 类，CSS 用 ::after
//   绘制一个闪烁的 ▊。光标"自动跟随"——一旦活跃字符变更，前一帧的 active 移
//   除、当前帧的 active 添加。

const $heroTitle = $('.hero__title');

if ($heroTitle.length) {
    const titleEl = $heroTitle[0];
    const finalText = titleEl.textContent;

    // 扰动符号池
    const SCRAMBLE_POOL = '!<>-_\\/[]{}—=+*^?#$%&@'.split('');

    // ---- 时间参数（顺序打字，前后字符不重叠） ----
    const PER_CHAR_DELAY = 50;       // 字间停顿
    const SCRAMBLE_DURATION = 130;   // 每个字扰动时长
    const ERROR_DURATION = 120;      // 错字停留时长
    const BACKSPACE_DURATION = 70;   // 回退（空白）时长
    const SCRAMBLE_INTERVAL = 30;    // 扰动符号刷新频率

    // ---- 打错字参数 ----
    const TYPO_PROBABILITY = 0.2;    // 每个候选字符 20% 概率打错
    const TYPO_MIN_GAP = 3;          // 两次打错至少间隔 3 个字符，避免连续打错

    // 根据正确字符挑一个"看起来像打错"的字符（同大小写的随机字母）
    function pickWrongChar(correct) {
        const lower = 'abcdefghijklmnopqrstuvwxyz';
        const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let pool;
        if (/[a-z]/.test(correct)) pool = lower;
        else if (/[A-Z]/.test(correct)) pool = upper;
        // 非字母（如逗号、句号）兜底为随机小写字母
        else return lower[Math.floor(Math.random() * lower.length)];
        // 防止抽到原字符；safety 计数避免极端情况下死循环
        let pick = correct;
        let safety = 0;
        while (pick === correct && safety++ < 10) {
            pick = pool[Math.floor(Math.random() * pool.length)];
        }
        return pick;
    }

    titleEl.textContent = '';

    const chars = [];
    const frag = document.createDocumentFragment();

    // 顺序时间轴：累加每个字符的占用时长，确保前后不重叠
    let timeline = 0;
    let charsSinceTypo = TYPO_MIN_GAP; // 让首字符即可能打错

    [...finalText].forEach((ch) => {
        const span = document.createElement('span');
        const isSpace = ch === ' ';
        span.className = isSpace ? 'char char--space char--pending' : 'char char--pending';
        span.textContent = '';
        frag.appendChild(span);

        const startAt = timeline;
        const scrambleEndAt = startAt + SCRAMBLE_DURATION;

        // 仅对字母字符做打错判断（标点保持原样，避免出现"句号 → 字母"的违和感）
        const canTypo = !isSpace && /[a-zA-Z]/.test(ch) && charsSinceTypo >= TYPO_MIN_GAP;
        const willTypo = canTypo && Math.random() < TYPO_PROBABILITY;

        const data = {
            el: span,
            finalChar: ch,
            isSpace,
            state: 'pending',
            startAt,
            scrambleEndAt,
            willTypo,
        };

        if (willTypo) {
            data.wrongChar = pickWrongChar(ch);
            data.errorEndAt = scrambleEndAt + ERROR_DURATION;
            data.backspaceEndAt = data.errorEndAt + BACKSPACE_DURATION;
            data.lockAt = data.backspaceEndAt;
            charsSinceTypo = 0;
        } else {
            data.lockAt = scrambleEndAt;
            charsSinceTypo++;
        }

        chars.push(data);
        // 下一字符从当前字符 lockAt + 字间间距 开始
        timeline = data.lockAt + PER_CHAR_DELAY;
    });
    titleEl.appendChild(frag);

    const startTime = performance.now();
    let lastScrambleTime = 0;
    let prevActiveChar = null; // 缓存活跃字符，仅在变化时更新 .char--active

    function tick(now) {
        const elapsed = now - startTime;
        const shouldScramble = now - lastScrambleTime >= SCRAMBLE_INTERVAL;
        if (shouldScramble) lastScrambleTime = now;

        let allLocked = true;
        let activeChar = null;

        chars.forEach((c) => {
            if (c.state === 'locked') return;
            allLocked = false;

            // ---- 状态转移（按状态机顺序串联，单帧内可级联多次以兜住掉帧） ----
            // pending → scrambling
            if (c.state === 'pending' && elapsed >= c.startAt) {
                c.el.classList.remove('char--pending');
                c.state = 'scrambling';
            }
            // scrambling → error / locked
            if (c.state === 'scrambling' && elapsed >= c.scrambleEndAt) {
                if (c.willTypo) {
                    c.el.classList.add('char--error');
                    c.el.textContent = c.wrongChar;
                    c.state = 'error';
                } else {
                    c.el.classList.add('char--locked');
                    c.el.textContent = c.finalChar;
                    c.state = 'locked';
                    return;
                }
            }
            // error → backspacing：把 textContent 清空，宽度归零 = "删除字符"
            if (c.state === 'error' && elapsed >= c.errorEndAt) {
                c.el.classList.remove('char--error');
                c.el.classList.add('char--backspacing');
                c.el.textContent = '';
                c.state = 'backspacing';
            }
            // backspacing → locked
            if (c.state === 'backspacing' && elapsed >= c.backspaceEndAt) {
                c.el.classList.remove('char--backspacing');
                c.el.classList.add('char--locked');
                c.el.textContent = c.finalChar;
                c.state = 'locked';
                return;
            }

            // ---- 扰动期：节流刷新随机符号 ----
            if (c.state === 'scrambling' && shouldScramble) {
                c.el.textContent = c.isSpace
                    ? c.finalChar
                    : SCRAMBLE_POOL[Math.floor(Math.random() * SCRAMBLE_POOL.length)];
            }

            // ---- 标记最左侧"活跃"字符（即当前光标所在字符） ----
            // 顺序时间轴下，活跃字符任意时刻最多一个
            if (!activeChar && c.state !== 'pending') {
                activeChar = c;
            }
        });

        // ---- 光标跟随：仅在活跃字符变更时增删 .char--active，避免每帧抖动 ----
        if (activeChar !== prevActiveChar) {
            if (prevActiveChar) prevActiveChar.el.classList.remove('char--active');
            if (activeChar) activeChar.el.classList.add('char--active');
            prevActiveChar = activeChar;
        }

        if (!allLocked) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}
