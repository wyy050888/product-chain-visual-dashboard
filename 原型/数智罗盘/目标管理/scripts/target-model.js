(() => {
  const { fixtures } = GoalPrototype;
  const sum = rows => rows.reduce((value, row) => value + row.gsv, 0);
  const profit = rows => sum(rows) > 0 ? rows.reduce((value, row) => value + row.gsv * row.profit, 0) / sum(rows) : null;
  const shopPath = shop => ['一类电商', shop.region, shop.brand, shop.channel, shop.shop].join('/');
  const inPath = (shop, path) => shopPath(shop) === path || shopPath(shop).startsWith(path + '/');
  const format = value => value.toFixed(2);

  function productStatus(productGsv, linkGsv) {
    const coverage = productGsv > 0 ? linkGsv / productGsv * 100 : null;
    const reasonable = productGsv > 0 && linkGsv >= productGsv * 0.7;
    const reason = coverage === null ? '目标数据不满足填报要求，无法计算覆盖率。'
      : `产品链接目标GSV合计为${format(linkGsv)}万元，产品目标GSV合计为${format(productGsv)}万元，覆盖率为${format(coverage)}%，${reasonable ? '达到' : '低于'}70%。`;
    return { coverage, reasonable, reason, linkedGsv: linkGsv };
  }

  function baseRows(key, { path = '一类电商', cid = '一类不含 CID', months = 1, monthList, year = GoalPrototype.clock.parts().year } = {}) {
    const factor = (monthList ? 1 : months) * (cid === '一类含 CID' ? 1.15 : 1);
    const activeMonths = item => !monthList ? [GoalPrototype.clock.parts().month] : Number(year) !== 2026 ? [] : monthList.filter(month => !item.activeMonths || item.activeMonths.includes(Number(month)));
    const amount = (item, selected) => selected.reduce((total, month) => total + (item.monthValues?.[month]?.gsv ?? item.gsv), 0) * factor;
    const weightedProfit = (item, selected) => {
      if (selected.length === 1 && (!monthList || monthList.length === 1)) return item.monthValues?.[selected[0]]?.profit ?? item.profit;
      const total = selected.reduce((value, month) => value + (item.monthValues?.[month]?.gsv ?? item.gsv), 0);
      return total ? selected.reduce((value, month) => value + (item.monthValues?.[month]?.gsv ?? item.gsv) * (item.monthValues?.[month]?.profit ?? item.profit), 0) / total : null;
    };
    const products = [...(fixtures.planningProducts || []), ...fixtures.products].filter(product => (!product.cid || product.cid === cid) && inPath(fixtures.shops[product.shopId], path)).map(product => {
      const shop = fixtures.shops[product.shopId];
      const selected = activeMonths(product);
      return {
        ...product, ...shop, gsv: amount(product, selected), profit: weightedProfit(product, selected), selectedMonths: selected, month: '2026/09',
        created: { name: '张晨', time: '2026/09/01 03:35:00' },
        updated: { name: shop.strategy, time: '2026/09/08 03:35:00' },
      };
    }).filter(product => product.selectedMonths.length);
    const links = fixtures.links.filter(link => products.some(product => product.id === link.productId)).map(link => {
      const product = products.find(product => product.id === link.productId);
      const selected = activeMonths(link).filter(month => product.selectedMonths.includes(month));
      const monthly = selected.map(month => ({ ...link, ...link.monthValues?.[month], month, gsv: (link.monthValues?.[month]?.gsv ?? link.gsv) * factor }));
      return { ...product, ...link, ...(selected.length === 1 ? link.monthValues?.[selected[0]] : {}), gsv: amount(link, selected), profit: weightedProfit(link, selected), selectedMonths: selected, monthly };
    }).filter(link => link.selectedMonths.length);
    if (key === 'ep') return products;
    if (key === 'el' || key === 'link') return links;
    if (key === 'product') return products.map(product => ({
      ...product,
      ...productStatus(product.gsv, sum(links.filter(link => link.productId === product.id))),
    }));
    // 已填报以存在产品记录为准；未填报店铺不生成占位行。
    if (key === 'store') {
      return [...new Set(products.map(product => product.shopId))].map(shopId => ({
        shopId, ...fixtures.shops[shopId], ...summarize(products.filter(product => product.shopId === shopId)),
      }));
    }
    return [summarize(products)];
  }
  function rows(key, options = {}) {
    return GoalPrototype.targetStore?.changed() || options.peopleFilters || options.regionId ? GoalPrototype.targetRecords.rows(key, options) : baseRows(key, options);
  }
  function summarize(products) {
    const gsv = sum(products);
    const people = field => [...new Set(products.map(product => product[field]))].join('、');
    return {
      gsv, profit: profit(products), strategy: people('strategy'), promotion: people('promotion'),
      coverage: gsv > 0 ? 100 : null, reasonable: gsv > 0,
      reason: gsv > 0 ? '' : '当前统计范围内无产品目标，无法计算覆盖率。',
    };
  }
  // 空期间不算异常；有记录的任一展示期间不合理，则该产品不合理。
  function periodsReasonable(cells) {
    const records = cells.filter(Boolean);
    return records.length > 0 && records.every(row => row.reasonable);
  }
  // 与表格使用同一期间划分：月逐月、季逐季、年全年累计，按店铺+SPU去重。
  function treeStatus(options = {}) {
    const products = new Map();
    const groups = options.periodGroups?.length ? options.periodGroups : [options.monthList];
    groups.forEach(monthList => rows('product', { ...options, monthList }).forEach(product => {
      const id = JSON.stringify([product.shopId, product.productCode || product.id]);
      if (!products.has(id)) products.set(id, []);
      products.get(id).push(product);
    }));
    const abnormalCount = [...products.values()].filter(cells => !periodsReasonable(cells)).length;
    const reasonable = products.size > 0 && abnormalCount === 0;
    const reason = !products.size ? '当前渠道在所选时间范围内未填报任何产品目标，显示红点提醒，无法计算产品覆盖率。'
      : reasonable ? '当前范围内全部产品均合理。'
      : `当前渠道存在 ${abnormalCount} 个不合理产品，请在右侧产品 Tab 查看。`;
    return { reasonable, abnormalCount, reason };
  }
  GoalPrototype.model = { rows, baseRows, productStatus, treeStatus, summarize, periodsReasonable };
})();
