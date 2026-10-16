(() => {
  // 列使用稳定字段名关联示例数据，调整顺序只改 columns。
  const labels = {
    month: '月份', region: '大区', brand: '品牌', channel: '平台渠道', shop: '店铺',
    strategy: '店长策略', promotion: '店长推广', product: '产品名称（SPU）',
    category: '产品类目', linkId: '核心链接ID', gsv: '目标GSV（w）', profit: '目标利润率（%）',
    newTag: '新品/清仓品', sharedStock: '是否一盘货', selectedProduct: '一类自选品',
    rank: '链接排名目标', clickRate: '链接点击率目标（%）', conversionRate: '链接转化率目标（%）',
    feeRate: '费率目标（%）', created: '创建人/创建时间', updated: '更新人/更新时间',
    coverage: '覆盖率', reasonable: '合理性', actions: '操作',
  };
  const summaryMetrics = ['gsv', 'profit'];
  const tags = ['newTag', 'sharedStock', 'selectedProduct'];
  const linkMetrics = ['gsv', 'profit', 'rank', 'clickRate', 'conversionRate', 'feeRate'];
  const columns = {
    whole: ['name', ...summaryMetrics], region: ['name', ...summaryMetrics], dabo: ['name', ...summaryMetrics],
    brand: ['name', ...summaryMetrics], channel: [...summaryMetrics],
    wholeBrand: ['name', ...summaryMetrics], wholeCategory: ['name', ...summaryMetrics],
    wholeChannel: ['name', ...summaryMetrics], regionCategory: ['name', ...summaryMetrics],
    regionChannel: ['name', ...summaryMetrics], brandCategory: ['name', ...summaryMetrics],
    store: ['shop', 'strategy', 'promotion', ...summaryMetrics],
    product: ['product', 'shop', 'strategy', 'promotion', ...tags, ...summaryMetrics],
    link: ['product', 'shop', 'linkId', ...linkMetrics],
    ep: ['month', 'region', 'brand', 'strategy', 'promotion', 'channel', 'shop', 'product', 'gsv', 'profit', ...tags, 'created', 'updated', 'actions'],
    el: ['month', 'region', 'brand', 'strategy', 'promotion', 'channel', 'shop', 'product', 'linkId', ...linkMetrics, 'created', 'updated', 'actions'],
  };
  const filters = {
    whole: [], region: [], brand: [], dabo: [], channel: [], store: ['店铺', '店长策略', '店长推广'],
    wholeBrand: [], wholeCategory: [],
    wholeChannel: [], regionCategory: [], regionChannel: [], brandCategory: [],
    product: ['店铺', '产品名称（SPU）', '合理性', '产品类型', '店长策略', '店长推广'],
    link: ['店铺', '产品名称（SPU）', '核心链接ID', '店长策略', '店长推广'],
    ep: ['产品名称（SPU）', '店铺', '店长策略', '店长推广', '大区', '品牌', '渠道', '新品/清仓品', '一盘货', '一类自选品'],
    el: ['产品名称（SPU）', '店铺', '核心链接ID', '店长策略', '店长推广', '大区', '品牌', '渠道'],
  };
  const options = {
    月份: ['2026/09'], get 大区() { return GoalPrototype.regionConfig.list().map(row => row.name); },
    平台渠道: ['天猫', '京东', '拼多多'], 品牌: ['苏泊尔', '创维', '康佳', '海尔', '其他', '美的'],
    产品类目: ['清洁类', '生活电器'], '新品/清仓品': ['新品', '清仓品'],
    一类自选品: ['自选品', '承流品'], 合理性: ['合理', '不合理'], 一盘货: ['是', '否'],
  };
  const productConfigTip = '取目标月份的最新配置；调整请前往「运营罗盘 → 产品档案库」。';
  const tips = {
    tree: [
      '绿点：有目标记录，且全部产品合理。\n红点：有不合理产品，或渠道未填报任何目标。',
      '产品目标GSV＞0且覆盖率≥70%为合理。\n覆盖率＝所属链接目标GSV合计÷产品目标GSV。',
      '按当前口径及所选月/季/年逐期判断，任一期不合理即计入，同一店铺同一产品只计一次；未填报期间不单独算异常，不受列表筛选影响。',
    ].join('\n\n'),
    coverage: '产品覆盖率 = 产品链接目标GSV合计 ÷ 产品目标GSV × 100%。覆盖率越高，表示该产品的目标拆解越充分。',
    reasonable: '已填报产品目标按覆盖率判断：≥70%为合理，低于70%为不合理。非应季月份可不填报，显示“—”，不参与合理性判断。',
    newTag: [
      [
        '新品',
        '① 自研/自选量产完成，或新SPU关联迭代项目后，标记为新品。',
        '② 检测到首笔有效订单后，自该订单支付时间起120天内为新品；无有效订单，持续保留新品状态。',
        '③ 品质整改不算新品；老SPU新增SKU，不重置SPU为新品。',
      ].join('\n'),
      [
        '清仓品',
        '① 以店铺所属渠道为准，该产品下任一SKU在该渠道的清仓申请审批通过后，即在此将该SPU标记为清仓品。',
      ].join('\n'),
    ].join('\n\n'),
    sharedStock: productConfigTip,
    selectedProduct: productConfigTip,
  };
  GoalPrototype.config = { labels, columns, filters, options, tips, tags, summaryMetrics, linkMetrics };
})();
