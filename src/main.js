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
