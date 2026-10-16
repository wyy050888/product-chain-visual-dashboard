(() => {
  const app = GoalPrototype;
  // 持久化记录按月合并后，沿用模型的汇总和覆盖率计算，不修改原始演示主数据。
  function rows(kind, options) {
    const { path = '一类电商', cid = '一类不含 CID', year = 2026, monthList = [9], months = 1 } = options;
    const matchesPeople = row => Object.entries(options.peopleFilters || {}).every(([field, term]) => !term || String(row[field] || '').toLocaleLowerCase().includes(term.toLocaleLowerCase()));
    const read = type => monthList.flatMap(monthNumber => app.targetStore.read(type, { year, monthNumber: Number(monthNumber), cid })).filter(row => {
      if (options.forConsumption && row.productMatch === 'unmatched') return false;
      const regionId = options.regionId || app.regionConfig.find(path.split('/')[1])?.id;
      if (regionId && row.regionId !== regionId) return false;
      const full = ['一类电商', row.region, row.brand, row.channel, row.shop].join('/');
      return full === path || full.startsWith(path + '/');
    });
    const productRecords = read('product').filter(matchesPeople), linkRecords = read('link').filter(matchesPeople);
    const relatedLinks = monthList.flatMap(monthNumber => app.targetStore.read('link', { year, monthNumber: Number(monthNumber), cid }));
    function aggregate(records, link) {
      const groups = new Map();
      records.forEach(row => {
        const id = JSON.stringify([row.shopId, app.targetGroup.productKey(row), link ? row.linkId : '']);
        if (!groups.has(id)) groups.set(id, []); groups.get(id).push(row);
      });
      const order = new Map((link ? app.fixtures.links : app.fixtures.products).map((row, index) => [link ? row.linkId : row.id, index]));
      return [...groups.values()].map(group => {
        const total = app.model.summarize(group), row = group[group.length - 1];
        return { ...row, ...total, gsv: total.gsv * (options.monthList ? 1 : months), profit: group.length === 1 ? row.profit : total.profit, selectedMonths: group.map(item => item.monthNumber), ...(link ? { monthly: group.map(item => ({ ...item, month: item.monthNumber })) } : {}) };
      }).sort((a, b) => (order.get(link ? a.linkId : a.id) ?? Infinity) - (order.get(link ? b.linkId : b.id) ?? Infinity));
    }
    const products = aggregate(productRecords, false), links = aggregate(linkRecords, true);
    if (kind === 'ep') return products;
    if (kind === 'el' || kind === 'link') return links;
    if (kind === 'product') return products.map(row => ({ ...row, ...app.model.productStatus(row.gsv, relatedLinks.filter(link => link.shopId === row.shopId && app.targetGroup.productKey(link) === app.targetGroup.productKey(row) && row.selectedMonths.includes(link.monthNumber)).reduce((total, link) => total + link.gsv, 0)) }));
    if (kind === 'store') return [...new Set(products.map(row => row.shopId))].map(shopId => {
      const group = products.filter(row => row.shopId === shopId), { region, brand, channel } = group[0];
      // 直接从月度记录汇总人员，避免先按产品拼接姓名后重复或漏掉跨月人员。
      const records = productRecords.filter(row => row.shopId === shopId);
      const people = field => [...new Set(records.map(row => row[field]).filter(Boolean))].join('、');
      return { shopId, ...app.fixtures.shops[shopId], region, brand, channel, ...app.model.summarize(group), strategy: people('strategy'), promotion: people('promotion') };
    });
    return [app.model.summarize(products)];
  }
  app.targetRecords = { rows };
})();
