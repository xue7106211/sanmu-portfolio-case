// // Paper.js 入口
// // CDN 方式引入后，paper 会作为全局变量挂载在 window 上

// // 1. 将 Paper.js 绑定到指定 canvas
// paper.setup('canvas');

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
