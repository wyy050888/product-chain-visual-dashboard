// 目标消费的列配置；指标展示偏好与目标填报数据分别存储。
(() => {
  const groups = [
    { id: 'target', label: '目标指标', items: [
      ['targetGsv', '目标GSV'], ['targetProfit', '目标利润率'], ['scaleDeviation', '规模偏差'],
      ['gsvAchievement', 'GSV达成'], ['profitAchievement', '利润率达成'], ['scaleAchievement', '规模达成'],
    ] },
    { id: 'business', label: '经营数据', items: [
      ['gsv', 'GSV'], ['sales', '销量'], ['profit', '利润率'], ['fee', '费率'],
      ['platformFee', '平台费用率'], ['conversion', '转化率'], ['returns', '退货率'], ['unitPrice', '客单价'],
    ] },
    { id: 'traffic', label: '流量与CID数据', items: [
      ['cidSales', 'CID销售额'], ['cidShare', 'CID占比'], ['visitors', '访客数'], ['freeTraffic', '免费流量占比'],
    ] },
    { id: 'shop', label: '店铺信息', items: [
      ['shop', '店铺名称'], ['products', '产品数'], ['links', '产品链接'], ['shopScore', '店铺分'],
    ] },
  ].map(group => ({ ...group, items: group.items.map(([id, label]) => ({ id, label })) }));
  const defaults = ['shop', 'gsv', 'sales', 'profit', 'fee', 'platformFee', 'conversion', 'returns', 'cidSales', 'cidShare', 'unitPrice', 'visitors', 'freeTraffic', 'products', 'links', 'shopScore'];
  const items = groups.flatMap(group => group.items);
  GoalPrototype.goalConfigData = { groups, defaults, items, minimum: 3, storageKey: 'goal-prototype-consumption-columns-v1' };
})();
