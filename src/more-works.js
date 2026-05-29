/* -------------------------------------------------------------------------- */
/* More works — 横向滚动联动（GSAP ScrollTrigger）                              */
/* -------------------------------------------------------------------------- */
/*
   需求拆解：
   - 中间内容区（.h-scroll__track）横向滚动，与页面的"垂直滚动"联动；
   - 滚动经过这一屏时，把容器 pin（钉）在视口，用户继续往下滚，
     内容则向左平移，滚完最后一块再"放行"页面继续垂直滚；
   - Header / Footer 固定（由 CSS position: fixed 实现），不受横向滚动影响。

   核心机制：ScrollTrigger 的 pin + scrub
   ┌─────────────────────────────────────────────────────────────────────┐
   │ gsap.to(track, {                                                      │
   │   x: -(track.scrollWidth - innerWidth),  // 终点：把 track 整条拉到左侧 │
   │   ease: 'none',                          // 线性，跟手                  │
   │   scrollTrigger: {                                                     │
   │     trigger: section,                                                 │
   │     pin: true,         // 进入区间时把 section 钉在视口                  │
   │     scrub: 1,          // 把动画进度绑到滚动条（1 = 1s 平滑追赶）         │
   │     end: () => '+=' + (track.scrollWidth - innerWidth) // 滚动行程       │
   │   }                                                                   │
   │ })                                                                    │
   └─────────────────────────────────────────────────────────────────────┘

   为什么用 transform: x 而不是 scrollLeft：
   - transform 只触发合成（compositing），不引发重排，性能更好；
   - scrub 配合 transform 能得到丝滑的"惯性追赶"感。

   为什么 end 用函数返回 '+=距离'：
   - pin 期间需要的"垂直滚动行程" = track 超出视口的宽度；
   - 写成函数让 ScrollTrigger 在 refresh（含 resize）时重新计算，自适应。
*/

// GSAP / ScrollTrigger 由 HTML 里的普通 <script> 先行加载，挂在 window 上。
// 防御：万一 CDN 失败，直接退出，避免抛错影响 subpage.js 的指针/主题逻辑。
if (typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    const section = document.querySelector('#hScroll');
    const track = document.querySelector('#hTrack');
    const progressBar = document.querySelector('#hProgress');
    const countEl = document.querySelector('#hCount');

    if (section && track) {
        // 计算 track 需要平移的总距离：内容总宽 - 一屏视口宽。
        // 用函数包起来，便于在 ScrollTrigger refresh 时按最新尺寸重新求值。
        const getScrollDistance = () => track.scrollWidth - window.innerWidth;

        // 面板数量（用于 Footer 计数 01 / 05）
        const panelCount = track.querySelectorAll('.h-panel').length;

        /* ---- 惯性位移 + 拖尾：采集要做惯性变形的"整块"容器 ---- */
        // 思路：
        //   滚动越快，整块越"被甩"—— 用滚动速度（velocity）驱动每块的
        //   skewX（倾斜）+ x 位移 + scaleX 横向拉伸，营造"惯性 + 拖尾"。
        //   滚动一停，velocity 归零，GSAP 把这些值平滑插值回 0，形成回弹拖尾。
        //
        // 关键修正：变形目标必须是【整块容器】（相框/整张卡片），不能只动内层 <img>。
        //   若只 skew/位移 img，而它外层是 overflow:hidden 的定尺寸框，
        //   图片会在框内滑动 → 露出框底色、边缘被裁切，看起来"图在框里乱晃"。
        //   让整块（图 + 框）一起动，图片始终填满自己的框，惯性感才自然。
        //
        // 为什么用 gsap.quickTo 而不是每帧 gsap.to：
        //   quickTo 返回一个高度优化的 setter，专为"高频更新同一属性"设计，
        //   内部复用 tween，避免每帧创建新 tween 的开销，丝滑且省 CPU。
        const motionEls = gsap.utils.toArray(
            track.querySelectorAll('.mw-collage__item, .work-card')
        );

        // ---- 为每块生成一份"稳定的随机运动档案" ----
        // 目标：不同块对同一滚动速度的响应各不相同 —— 有的滞后、有的跟手，
        //       位移幅度 / 倾斜幅度 / 拖尾时长各有细微差异，于是滚动时形成
        //       "不规则但协调"的节奏感（协调来自共享同一速度源，不规则来自各自参数）。
        //
        // 用带种子的伪随机（mulberry32）而不是 Math.random：
        //   保证每次刷新页面，同一张图拿到的档案一致（可复现、不会每次抖动），
        //   同时不同图之间又是错开的。
        function makeRng(seed) {
            return function () {
                seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
                let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        }
        // rand(min,max)：从档案随机数取一个区间值
        const lerp = (a, b, t) => a + (b - a) * t;

        // 一组可选的"回弹缓动"，让停止后的归位节奏各不相同：
        //   有的直接平滑收（power 系列），有的略微过冲回弹（back / elastic）
        const SETTLE_EASES = [
            'power2.out', 'power3.out', 'power4.out',
            'back.out(1.4)', 'back.out(2)', 'elastic.out(1, 0.6)',
        ];

        // 给每块建一组 quickTo setter（参数全部来自该块的随机档案）
        const setters = motionEls.map((el, i) => {
            const isCollage = el.classList.contains('mw-collage__item');
            // 每块一个独立 RNG（种子用索引错开），保证档案稳定且彼此不同
            const rnd = makeRng(i * 9973 + (isCollage ? 17 : 4099));

            // 滚动跟随时长（duration 越大 = 响应越"滞后/粘"，越小 = 越跟手）
            //   拼贴图整体更轻快、差异更大；卡片更稳重、差异较小
            const followDur = isCollage
                ? lerp(0.35, 0.85, rnd())   // 0.35 ~ 0.85s
                : lerp(0.4, 0.6, rnd());    // 0.4 ~ 0.6s

            return {
                el,
                isCollage,
                // depth：对速度的响应强度（位移/倾斜的总体放大系数）
                depth: isCollage ? lerp(0.7, 1.25, rnd()) : lerp(0.4, 0.7, rnd()),
                // 各通道的"个性幅度"，让每块最大位移/倾斜不同
                xAmp: isCollage ? lerp(26, 52, rnd()) : lerp(14, 30, rnd()),
                skewAmp: isCollage ? lerp(5, 10, rnd()) : lerp(2, 5, rnd()),
                // 停止后的回弹时长与缓动（节奏各异的关键）
                settleDur: isCollage ? lerp(0.7, 1.4, rnd()) : lerp(0.6, 1.0, rnd()),
                settleEase: SETTLE_EASES[Math.floor(rnd() * SETTLE_EASES.length)],
                // 高频跟随用 quickTo（复用 tween、丝滑省 CPU）
                skewTo: gsap.quickTo(el, 'skewX', { duration: followDur, ease: 'power3.out' }),
                xTo: gsap.quickTo(el, 'x', { duration: followDur, ease: 'power3.out' }),
                scaleTo: gsap.quickTo(el, 'scaleX', { duration: followDur, ease: 'power3.out' }),
            };
        });

        // clamp 限幅，避免飞快滚动时倾斜/位移夸张失真。
        const clamp = gsap.utils.clamp;
        // 可访问性：用户开启"减少动态效果"时，跳过惯性拖尾（只保留基础横向滚动）
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // 记录每块是否有正在运行的"归位补间"，便于滚动恢复时打断它
        const settleTweens = new Map();

        // 滚动进行中：每块按【自己的档案】跟随当前速度（quickTo，高频更新）
        function applyVelocity(velocity) {
            if (reduceMotion) return;
            // 归一化到 -1 ~ 1：除以基准速度（数值越大越"迟钝"）
            const norm = clamp(-1, 1, velocity / 1800);
            setters.forEach((s) => {
                // 若该块此前在跑归位补间，滚动重新开始时杀掉它，交还给 quickTo 接管
                const t = settleTweens.get(s);
                if (t) { t.kill(); settleTweens.delete(s); }

                // 用各自的 depth + 个性幅度计算目标值：
                //   skew：倾斜，方向跟随速度符号
                s.skewTo(clamp(-s.skewAmp, s.skewAmp, norm * s.skewAmp * s.depth));
                //   x：位移，方向与滚动相反（被"落在后面"的拖尾感）
                s.xTo(clamp(-s.xAmp, s.xAmp, -norm * s.xAmp * s.depth));
                //   scaleX：仅拼贴相框做轻微横向拉伸（卡片含文字，拉伸会变形）
                s.scaleTo(s.isCollage ? 1 + clamp(0, 0.06, Math.abs(norm) * 0.06) : 1);
            });
        }

        // 滚动停止：每块用【自己的回弹缓动 + 时长】各自归位，节奏互不相同。
        //   关键点：不再用 quickTo 归零（那样所有块共享同一跟随缓动，节奏一致），
        //   而是为每块单独跑一条 gsap.to，ease/duration 来自其档案 →
        //   有的平滑收、有的轻微过冲回弹，形成"不同节奏回到原位"。
        function settleAll() {
            if (reduceMotion) return;
            setters.forEach((s) => {
                // 已经在归位就不重复创建
                if (settleTweens.get(s)) return;
                const t = gsap.to(s.el, {
                    skewX: 0,
                    x: 0,
                    scaleX: 1,
                    duration: s.settleDur,
                    ease: s.settleEase,
                    overwrite: 'auto', // 接管 quickTo 残留的内联补间，避免打架
                    onComplete: () => settleTweens.delete(s),
                });
                settleTweens.set(s, t);
            });
        }

        // 主补间：把 track 从 x:0 线性移动到 x:-(总距离)
        const tween = gsap.to(track, {
            x: () => -getScrollDistance(),
            ease: 'none', // 线性，让位移严格跟随滚动进度
            scrollTrigger: {
                trigger: section,
                // start：section 顶部对齐视口顶部时开始钉住
                start: 'top top',
                // end：再往下滚"总距离"那么多像素后结束（行程 = 横向位移量）
                end: () => '+=' + getScrollDistance(),
                pin: true, // 钉住 section，期间页面不再垂直滚动，只推进补间
                scrub: 1, // 把进度绑到滚动条，1 表示 1s 的平滑缓冲（更顺滑）
                anticipatePin: 1, // 减少 pin 瞬间的跳动
                invalidateOnRefresh: true, // resize 时让 x 的函数值重新计算
                // 滚动进度回调：更新 Footer 进度条与计数 + 驱动惯性拖尾
                onUpdate: (self) => {
                    const p = self.progress; // 0 → 1
                    if (progressBar) progressBar.style.transform = `scaleX(${p})`;
                    if (countEl) {
                        // 进度映射到第几块（1 ~ panelCount），两位补零
                        const idx = Math.min(panelCount, Math.floor(p * panelCount) + 1);
                        const pad = (n) => String(n).padStart(2, '0');
                        countEl.textContent = `${pad(idx)} / ${pad(panelCount)}`;
                    }
                    // getVelocity() 返回当前 scroller 的滚动速度（px/s，带正负号），
                    // 用它驱动图片的 skew/位移/拉伸。
                    applyVelocity(self.getVelocity());
                },
            },
        });

        /* ---- 静止检测：触发每块各自的差异化归位 ---- */
        // ScrollTrigger.onUpdate 只在滚动时触发；一旦停止滚动就不再回调，
        // 此时最后一次的 velocity 往往还是非 0，各块会"定格"在倾斜/位移状态。
        // 常驻 rAF 监测速度：趋近 0 时调用 settleAll()，让每块用自己的
        // 回弹缓动 + 时长各自归位，形成"不同节奏回到原位"。
        //
        // 注意：getVelocity() 是 ScrollTrigger 的【实例】方法（没有静态版本），
        // 要通过 tween.scrollTrigger 这个实例来调用。
        const st = tween.scrollTrigger;
        let settled = true;
        function settleTick() {
            const v = st ? st.getVelocity() : 0;
            if (Math.abs(v) < 30) {
                // 速度趋近 0：若上一轮还在动，则触发一次差异化归位
                if (!settled) {
                    settleAll();
                    settled = true;
                }
            } else {
                // 仍在快速滚动：标记未静止，等停下再回弹
                settled = false;
            }
            requestAnimationFrame(settleTick);
        }
        requestAnimationFrame(settleTick);

        // 图片是异步加载的，加载完后宽度才稳定 → 让 ScrollTrigger 重新测量，
        // 否则首次计算的 scrollWidth 可能偏小，导致末尾露白或滚不到底。
        window.addEventListener('load', () => ScrollTrigger.refresh());

        // 兜底：所有 <img> 各自 load 后也刷新一次（防止 window load 早于图片）
        track.querySelectorAll('img').forEach((img) => {
            if (!img.complete) {
                img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
            }
        });
    }
}
