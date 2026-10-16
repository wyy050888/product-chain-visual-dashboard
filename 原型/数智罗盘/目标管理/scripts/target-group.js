// 同月、同店铺、同产品跨口径共用公共字段；目标指标及唯一键仍区分口径。
(() => {
  const app = GoalPrototype;
  const fields = ['region', 'strategy', 'promotion'];
  const labels = { region: '大区', strategy: '店长策略', promotion: '店长推广' };
  // 不伪造SPU：未建档产品以品牌及原填名称区分，和正式产品使用不同身份。
  const productKey = row => row.productMatch === 'unmatched' ? JSON.stringify(['unmatched', row.brand, row.product]) : row.productCode;
  const productCaption = row => row.productMatch === 'unmatched' ? '未匹配产品档案' : row.productCode || row.id || '';
  const key = row => JSON.stringify([Number(row.year), Number(row.monthNumber), row.shopId, productKey(row)]);
  const value = (row, field) => field === 'region'
    ? row.regionId || app.regionConfig.find(row.region)?.id || row.region || ''
    : row[`${field}Id`] || app.fixtures.people.find(person => person.name === row[field])?.id || row[field] || '';
  const error = (field, lines) => `${lines ? '导入文件内' : ''}同月、同店铺、同产品的${labels[field]}必须一致${lines ? `（第${lines.join('、')}行），请统一后重新导入` : ''}`;
  function members(context, read = app.targetStore.read) {
    return ['一类不含 CID', '一类含 CID'].flatMap(cid => ['product', 'link'].flatMap(kind =>
      read(kind, { ...context, cid }).filter(row => key(row) === key(context)).map(row => ({ kind, row }))));
  }
  function describe(context) {
    const rows = members(context), values = {}, names = {}, conflicts = [];
    fields.forEach(field => {
      const distinct = new Set(rows.map(({ row }) => value(row, field)));
      if (distinct.size > 1 || (rows.length && distinct.has(''))) conflicts.push(field);
      else if (rows.length) {
        values[field] = field === 'region' ? rows[0].row.region : value(rows[0].row, field);
        const row = rows.find(({row}) => row[field] && row[field] !== row[`${field}Id`])?.row;
        names[field] = row?.[field] || '';
      }
    });
    return { count: rows.length, values, names, conflicts };
  }
  // 在提交草稿内同步，仅写实际变化；目标与历史仍由 store 一次提交。
  function synchronize(next, records, read, now) {
    const groups = new Map(), synced = new Set();
    records.forEach(row => {
      const prior = groups.get(key(row));
      fields.forEach(field => { if (prior && value(prior, field) !== value(row, field)) throw new Error(error(field)); });
      groups.set(key(row), row);
    });
    groups.forEach(row => members(row, (kind, context) => read(kind, context, next)).forEach(({ kind, row: target }) => {
      const changed = fields.filter(field => value(target, field) !== value(row, field));
      if (!changed.length) return;
      const updated = { ...target, updated: now };
      changed.forEach(field => { updated[field] = row[field]; updated[field === 'region' ? 'regionId' : `${field}Id`] = value(row, field); });
      const id = app.targetStore.key(target);
      next[kind][id] = updated;
      synced.add(`${kind}:${id}`);
    }));
    return [...synced];
  }
  app.targetGroup = { fields, labels, productKey, productCaption, key, value, error, members, describe, synchronize };
})();
