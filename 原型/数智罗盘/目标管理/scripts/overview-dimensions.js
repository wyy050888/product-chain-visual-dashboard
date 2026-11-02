(() => {
  const app = GoalPrototype;
  const fields = { wholeBrand: 'brand', wholeCategory: 'category', wholeChannel: 'channel', regionCategory: 'category', regionChannel: 'channel', brandCategory: 'category' };
  const tabs = {
    whole: [['whole', '大区'], ['wholeBrand', '品牌'], ['wholeChannel', '渠道'], ['wholeCategory', '链群'], ['store', '店铺'], ['product', '产品']],
    region: [['region', '品牌'], ['regionChannel', '渠道'], ['regionCategory', '链群'], ['store', '店铺'], ['product', '产品']],
    brand: [['brand', '渠道'], ['brandCategory', '链群'], ['store', '店铺'], ['product', '产品']],
  };

  // 按月度记录分组，避免跨月归属变化被期末属性覆盖；不叠加链接或达播目标。
  function rows(key, context, buckets) {
    const field = fields[key];
    const records = context.monthList.flatMap(monthNumber => app.targetStore.read('product', {
      year: context.year, monthNumber, cid: context.cid,
    })).filter(row => {
      const path = ['一类电商', row.region, row.brand, row.channel, row.shop].join('/');
      return path === context.path || path.startsWith(context.path + '/');
    });
    const groups = new Map();
    records.forEach(row => {
      const name = field === 'category' && row.productMatch === 'unmatched'
        ? '未分类' : String(row[field] || '').trim() || ({ category: '未分类', brand: '未填写品牌', channel: '未填写渠道' }[field]);
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(row);
    });
    return [...groups].map(([name, group]) => ({
      id: JSON.stringify([key, name]), name, ...app.model.summarize(group),
      cells: buckets.map(bucket => {
        const selected = group.filter(row => bucket.months.includes(Number(row.monthNumber)));
        return selected.length ? app.model.summarize(selected) : null;
      }),
    })).sort((a, b) => a.name === '未分类' ? 1 : b.name === '未分类' ? -1 : a.name.localeCompare(b.name, 'zh-CN'));
  }

  app.overviewDimensions = { rows, tabs, supports: key => Object.hasOwn(fields, key) };
})();
