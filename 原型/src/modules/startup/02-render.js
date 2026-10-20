// 数据与展示适配器全部登记后只渲染一次，避免中间版本重复生成台账及整页DOM。
renderAll();
window.dispatchEvent(new Event('dashboard:ready'));
