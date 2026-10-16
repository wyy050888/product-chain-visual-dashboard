// 普通脚本按 HTML 中的顺序加载，兼容 file:// 双击打开，无需服务或构建。
window.GoalPrototype = {
  $: selector => document.querySelector(selector),
  $$: selector => [...document.querySelectorAll(selector)],
  state: {
    cid: '一类不含 CID',
    level: 'whole',
    path: '一类电商',
    shopTab: 'store',
    overviewTab: 'whole',
    entryTab: 'product',
    period: 'month',
    quarter: 'Q3',
    months: new Set(['9']),
  },
  escape: value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]),
};
