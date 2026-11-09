(() => {
  const app = GoalPrototype;
  const identity = (key, row) => key === 'store' ? row.shopId : key === 'link' ? `${row.shopId}/${row.productId}/${row.linkId}` : row.id;
  // 先按所选期间取并集，再关联每期数据；缺失记录保留 null，不能补成零目标。
  function rows(key, context, buckets) {
    if (app.overviewDimensions.supports(key)) return app.overviewDimensions.rows(key, context, buckets);
    if (key === 'dabo') return app.daboData.overview(context, buckets);
    if (['whole', 'region', 'brand'].includes(key)) {
      return app.tree.children(context.path).map(node => node.level === 'dabo' ? {
        ...node, id: node.path,
        ...app.daboData.summary(context),
        cells: buckets.map(bucket => app.daboData.total(app.daboData.filled({ ...context, monthList: bucket.months }))),
      } : ({
        ...node, id: node.path,
        ...app.model.rows('whole', { ...context, path: node.path })[0],
        cells: buckets.map(bucket => {
          const options = { ...context, path: node.path, monthList: bucket.months };
          return app.model.rows('product', options).length ? app.model.rows('whole', options)[0] : null;
        }),
      }));
    }
    const maps = buckets.map(bucket => new Map(app.model.rows(key, { ...context, monthList: bucket.months }).map(row => [identity(key, row), row])));
    return app.model.rows(key, context).map(row => {
      const cells = maps.map(map => map.get(identity(key, row)) || null);
      return { ...row, cells, ...(key === 'product' ? { reasonable: app.model.periodsReasonable(cells) } : {}) };
    });
  }
  const linkGroup = row => JSON.stringify([row.shopId, row.productCode || row.productId]);
  // 默认按店铺、SPU聚拢，保持组内原始顺序；指标排序时按全部链接比较。
  function groupLinks(rows) {
    const shops = new Map();
    rows.forEach(row => {
      if (!shops.has(row.shopId)) shops.set(row.shopId, new Map());
      const products = shops.get(row.shopId), group = linkGroup(row);
      if (!products.has(group)) products.set(group, []);
      products.get(group).push(row);
    });
    return [...shops.values()].flatMap(products => [...products.values()].flat());
  }
  function sort(rows, sorting, key) {
    if (!sorting) return key === 'link' ? groupLinks(rows) : rows;
    return [...rows].sort((a, b) => {
      const left = a.cells[sorting.bucket]?.[sorting.field];
      const right = b.cells[sorting.bucket]?.[sorting.field];
      if (left == null) return right == null ? 0 : 1;
      if (right == null) return -1;
      return (left - right) * sorting.direction;
    });
  }
  // 使用筛选后的全部记录逐期汇总，不能在分页切片后计算。
  function totals(rows, buckets) {
    return buckets.map((bucket, index) => {
      const cells = rows.map(row => row.cells[index]).filter(Boolean);
      return cells.length ? app.model.summarize(cells) : null;
    });
  }
  app.overviewData = { rows, sort, totals, linkGroup };
})();
