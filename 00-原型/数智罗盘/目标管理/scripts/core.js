// 普通脚本按 HTML 中的顺序加载，兼容 file:// 双击打开，无需服务或构建。
// 独立后台统一按北京时间取当天和当前年月。
const goalDateClock=(()=>{
  const formatter=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'});
  const format=date=>formatter.format(date),today=()=>format(new Date());
  const parts=()=>{const [year,month,day]=today().split('-').map(Number);return {year,month,day}};
  return Object.freeze({today,parts,format});
})();
window.GoalPrototype = {
  clock: goalDateClock,
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
    quarter: 'Q'+Math.ceil(goalDateClock.parts().month/3),
    months: new Set([String(goalDateClock.parts().month)]),
  },
  escape: value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]),
};
