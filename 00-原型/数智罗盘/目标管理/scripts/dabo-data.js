// 达播独立演示数据。大区目标取负责人填报，不叠加员工拆解值。
(() => {
  const app = GoalPrototype, storageKey = 'goal-prototype-dabo-v1';
  const people = [
    { id: 'wang', name: '王晓涛', region: '品牌一区', parent: null },
    { id: 'zhao', name: '赵串串', region: '品牌一区', parent: 'wang' },
    { id: 'jia', name: '王嘉奇', region: '品牌一区', parent: 'wang' },
    { id: 'li', name: '李二龙', region: '品牌一区', parent: 'wang' },
    { id: 'hou', name: '侯林旭', region: '品牌一区', parent: 'wang' }
  ];
  const seed = [[286,16.5],[100,20.6],[283,17],[233.1,15],[570.4,18]].map(([gsv,profit],i) => ({personId:'wang',year:2026,month:i+1,productCode:'SPU00008',gsv,profit}));
  let state;
  try { state = JSON.parse(localStorage.getItem(storageKey)); } catch (_) { /* 无已保存数据时使用示例。 */ }
  if (!state || !Array.isArray(state.rows) || !Array.isArray(state.history)) state = { rows: seed, history: [] };
  function records(personId, year, months, productCode = '') {
    return state.rows.filter(row => row.personId === personId && row.year === year && months.includes(row.month) && (!productCode || row.productCode === productCode));
  }
  function total(rows) { return rows.length ? app.model.summarize(rows) : null; }
  function filled(context) {
    const managers = new Set(people.filter(person => !person.parent).map(person => person.id));
    return state.rows.filter(row => managers.has(row.personId) && row.year === context.year && context.monthList.includes(row.month));
  }
  function overview(context, buckets) {
    return app.config.options.大区.map(name => {
      const managers = people.filter(person => person.region === name && !person.parent);
      return { id: name, name, cells: buckets.map(bucket => total(managers.flatMap(person => records(person.id,context.year,bucket.months)))) };
    });
  }
  function save(personId, year, productCode, values) {
    if (!people.some(person => person.id === personId)) throw new Error('员工不存在');
    if (!app.entrySchema.catalog().products.some(product => product.productCode === productCode)) throw new Error('请选择目标产品');
    const rows = values.filter(row => row.gsv !== '' || row.profit !== '').map(row => {
      const gsv=Number(row.gsv), profit=Number(row.profit);
      if (row.gsv === '' || row.profit === '' || !Number.isFinite(gsv) || gsv <= 0 || !Number.isFinite(profit) || profit === 0) throw new Error(`${row.month}月：GSV须大于0，利润率须为非零数字`);
      return { personId, year, productCode, month:row.month, gsv, profit };
    });
    const same = row => row.personId === personId && row.year === year && row.productCode === productCode;
    const before = state.rows.filter(same);
    if (before.length === rows.length && before.every(row=>rows.some(next=>next.month===row.month&&next.gsv===row.gsv&&next.profit===row.profit))) return;
    const next = { rows:[...state.rows.filter(row => !same(row)),...rows], history:[{personId, year, productCode, before, after:rows, time:new Date().toLocaleString('sv-SE')},...state.history] };
    try { localStorage.setItem(storageKey,JSON.stringify(next)); } catch (_) { throw new Error('保存失败，请稍后重试'); }
    state=next;
  }
  app.daboData = { people, records, total, overview, filled, save,
    summary: context => total(filled(context)) || {gsv:0,profit:null},
    history: id => state.history.filter(item => item.personId === id),
    years: () => [...new Set([2026,...state.rows.map(row=>row.year)])].sort() };
})();
