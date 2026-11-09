// 同一套单月样例供填报、目标树和总览使用。金额单位万元，比例单位 %。
// 演示约定：2026 年样例，未覆盖月份沿用基础计划；含 CID 全部目标乘 1.15。
// 覆盖率、利润率汇总和合理性均由 target-model.js 计算，不单独编造。
GoalPrototype.fixtures = {
  // 大区、品牌的顺序用于演示；“其他”归集康豆豆、科佳、爱视健等自有品牌。
  // 独立的有效人员样例；策略、推广共用，不按店铺、大区或渠道限制。
  people: [
    { id: 'USER001', name: '陈云飞' }, { id: 'USER002', name: '郭灵锴' },
    { id: 'USER003', name: '孙豫帆' }, { id: 'USER004', name: '刘远锴' },
    { id: 'USER005', name: '余志鹏' }, { id: 'USER006', name: '何慧涛' },
    { id: 'USER007', name: '郑成波' }, { id: 'USER008', name: '程萌超' },
    { id: 'USER009', name: '徐常奇' },
  ],
  shops: {
    suporTm: { region: '品牌一区', brand: '苏泊尔', channel: '天猫', shop: '苏泊尔旗舰店', strategy: '陈云飞', promotion: '郭灵锴' },
    suporTmHome: { region: '品牌一区', brand: '苏泊尔', channel: '天猫', shop: '苏泊尔生活电器旗舰店', strategy: '陈云飞', promotion: '郭灵锴' },
    suporTmEmpty: { region: '品牌一区', brand: '苏泊尔', channel: '天猫', shop: '苏泊尔厨具专卖店', strategy: '陈云飞', promotion: '郭灵锴' },
    suporJd: { region: '品牌一区', brand: '苏泊尔', channel: '京东', shop: '苏泊尔京东自营店', strategy: '孙豫帆', promotion: '刘远锴' },
    suporPdd: { region: '品牌一区', brand: '苏泊尔', channel: '拼多多', shop: '苏泊尔拼多多旗舰店', strategy: '陈云飞', promotion: '郭灵锴' },
    skyworthOne: { region: '品牌一区', brand: '创维', channel: '天猫', shop: '创维清洁电器旗舰店', strategy: '陈云飞', promotion: '郭灵锴' },
    skyworthTwo: { region: '品牌二区', brand: '创维', channel: '京东', shop: '创维生活电器专卖店', strategy: '孙豫帆', promotion: '刘远锴' },
    konka: { region: '品牌三区', brand: '康佳', channel: '天猫', shop: '康佳清洁电器旗舰店', strategy: '余志鹏', promotion: '刘远锴' },
    haier: { region: '品牌三区', brand: '海尔', channel: '京东', shop: '海尔京东自营店', strategy: '何慧涛', promotion: '郑成波' },
    kangdoudou: { region: '品牌三区', brand: '其他', channel: '天猫', shop: '康豆豆旗舰店', strategy: '余志鹏', promotion: '刘远锴' },
    kejia: { region: '品牌三区', brand: '其他', channel: '天猫', shop: '科佳旗舰店', strategy: '余志鹏', promotion: '刘远锴' },
    aishijian: { region: '品牌三区', brand: '其他', channel: '天猫', shop: '爱视健旗舰店', strategy: '余志鹏', promotion: '刘远锴' },
    midea: { region: '品牌四区', brand: '美的', channel: '天猫', shop: '美的生活电器旗舰店', strategy: '程萌超', promotion: '徐常奇' },
    mideaPdd: { region: '品牌四区', brand: '美的', channel: '拼多多', shop: '美的拼多多旗舰店', strategy: '程萌超', promotion: '徐常奇' },
    skyworthFour: { region: '品牌四区', brand: '创维', channel: '拼多多', shop: '创维家用电器旗舰店', strategy: '程萌超', promotion: '徐常奇' },
  },
  // 仅用于目标展示的未建档规划记录，不进入产品档案或生成链接候选。
  planningProducts: [
    { id: 'planning-air-fryer-a', shopId: 'suporTm', product: '新品空气炸锅A', productCode: '', productMatch: 'unmatched', brand: '苏泊尔', gsv: 100, profit: 18, activeMonths: [9], cid: '一类不含 CID', newTag: '', sharedStock: '', selectedProduct: '' },
    { id: 'planning-air-fryer-b', shopId: 'suporTm', product: '新品空气炸锅B', productCode: '', productMatch: 'unmatched', brand: '苏泊尔', gsv: 100, profit: 18, activeMonths: [10], cid: '一类不含 CID', newTag: '', sharedStock: '', selectedProduct: '' },
  ],
  products: [
    { id: 'skyworth-one-cleaner', shopId: 'skyworthOne', product: '创维无线吸尘器S1', brand: '创维', category: '清洁', gsv: 90, profit: 18.5, newTag: '新品', sharedStock: '是', selectedProduct: '自选品' },
    { id: 'skyworth-two-cooker', shopId: 'skyworthTwo', product: '创维家用电饭煲S2', brand: '创维', category: '厨电', gsv: 70, profit: 17.5, newTag: '新品', sharedStock: '否', selectedProduct: '自选品' },
    { id: 'skyworth-four-kettle', shopId: 'skyworthFour', product: '创维电热水壶S4', brand: '创维', category: '厨电', gsv: 50, profit: 16.5, newTag: '清仓品', sharedStock: '是', selectedProduct: '承流品' },
    { id: 'kangdoudou-cooker', shopId: 'kangdoudou', product: '康豆豆迷你电饭煲', brand: '其他', category: '厨电', gsv: 40, profit: 20, newTag: '新品', sharedStock: '否', selectedProduct: '自选品' },
    { id: 'kejia-cleaner', shopId: 'kejia', product: '科佳手持吸尘器', brand: '其他', category: '清洁', gsv: 35, profit: 19, newTag: '新品', sharedStock: '是', selectedProduct: '自选品' },
    { id: 'aishijian-lamp', shopId: 'aishijian', product: '爱视健护眼台灯', brand: '其他', category: '个护&健康', gsv: 25, profit: 21, newTag: '新品', sharedStock: '否', selectedProduct: '自选品' },
    { id: 'supor-home', shopId: 'suporTmHome', product: '苏泊尔电饭煲家用款', brand: '苏泊尔', category: '厨电', gsv: 120, profit: 18, newTag: '新品', sharedStock: '是', selectedProduct: '自选品' },
    { id: 'supor-pdd', shopId: 'suporPdd', product: '苏泊尔电饭煲家用款', brand: '苏泊尔', category: '厨电', gsv: 60, profit: 17, newTag: '新品', sharedStock: '否', selectedProduct: '自选品' },
    { id: 'supor-steam', shopId: 'suporTm', product: '苏泊尔蒸汽清洁机基础款EMCS100', brand: '苏泊尔', category: '清洁', gsv: 666.69, profit: 19.03, newTag: '新品', sharedStock: '是', selectedProduct: '自选品' },
    { id: 'supor-clean-tm', shopId: 'suporTm', product: '苏泊尔布艺清洗机EMC30AS', brand: '苏泊尔', category: '清洁', gsv: 80, profit: 16.78, newTag: '清仓品', sharedStock: '否', selectedProduct: '承流品' },
    { id: 'supor-clean-jd', shopId: 'suporJd', product: '苏泊尔布艺清洗机EMC30AS', brand: '苏泊尔', category: '清洁', gsv: 200, profit: 20.39, newTag: '新品', sharedStock: '是', selectedProduct: '自选品' },
    { id: 'konka-2623', shopId: 'konka', product: '康佳无线吸尘器2623', brand: '康佳', category: '清洁', gsv: 160, profit: 16.78, newTag: '新品', sharedStock: '是', selectedProduct: '自选品' },
    { id: 'konka-2630', shopId: 'konka', product: '康佳高端款吸尘器KXCQ2630JL', brand: '康佳', category: '清洁', gsv: 80, profit: 16.78, newTag: '清仓品', sharedStock: '否', selectedProduct: '承流品' },
    { id: 'midea-heater', shopId: 'midea', product: '美的中塔取暖器NFR20EM', brand: '美的', category: '环境', gsv: 100, profit: 18.23, newTag: '新品', sharedStock: '否', selectedProduct: '自选品' },
    { id: 'haier-steamer', shopId: 'haier', product: '海尔挂烫机1', brand: '海尔', category: '个护&健康', gsv: 48, profit: 16.78, newTag: '清仓品', sharedStock: '是', selectedProduct: '承流品' },
  ],
  links: [
    { productId: 'skyworth-one-cleaner', linkId: '881000000001', gsv: 72, profit: 18.5, rank: 6, clickRate: 9, conversionRate: 3, feeRate: 5 },
    { productId: 'skyworth-two-cooker', linkId: '881000000002', gsv: 56, profit: 17.5, rank: 7, clickRate: 8, conversionRate: 2.8, feeRate: 5 },
    { productId: 'skyworth-four-kettle', linkId: '881000000003', gsv: 30, profit: 16.5, rank: 10, clickRate: 7, conversionRate: 2.6, feeRate: 5 },
    { productId: 'kangdoudou-cooker', linkId: '881000000004', gsv: 32, profit: 20, rank: 5, clickRate: 9.5, conversionRate: 3.2, feeRate: 5 },
    { productId: 'kejia-cleaner', linkId: '881000000005', gsv: 21, profit: 19, rank: 8, clickRate: 8.5, conversionRate: 2.7, feeRate: 5 },
    { productId: 'aishijian-lamp', linkId: '881000000006', gsv: 20, profit: 21, rank: 6, clickRate: 9, conversionRate: 3.1, feeRate: 5 },
    { productId: 'supor-home', linkId: '772196655960', gsv: 96, profit: 18, rank: 5, clickRate: 9, conversionRate: 3, feeRate: 5 },
    { productId: 'supor-pdd', linkId: '883196655961', gsv: 48, profit: 17, rank: 7, clickRate: 8, conversionRate: 2.9, feeRate: 5 },
    { productId: 'supor-steam', linkId: '772196655951', gsv: 400, profit: 19.03, rank: 1, clickRate: 11, conversionRate: 3.6, feeRate: 5 },
    { productId: 'supor-steam', linkId: '772196655952', gsv: 266.69, profit: 19.03, rank: 3, clickRate: 9, conversionRate: 3.2, feeRate: 5 },
    { productId: 'supor-clean-tm', linkId: '772196655959', gsv: 50, profit: 16.78, rank: 8, clickRate: 8.2, conversionRate: 2.8, feeRate: 5 },
    { productId: 'supor-clean-jd', linkId: '10164838135612', gsv: 140, profit: 20.39, rank: 6, clickRate: 13.11, conversionRate: 3.36, feeRate: 5 },
    { productId: 'konka-2623', linkId: '939118045032', gsv: 192, profit: 16.78, rank: 9, clickRate: 6.4, conversionRate: 2, feeRate: 5.4 },
    { productId: 'midea-heater', linkId: '995018278429', gsv: 85, profit: 18.23, rank: 12, clickRate: 8.11, conversionRate: 2.36, feeRate: 5 },
    { productId: 'haier-steamer', linkId: '100252466463', gsv: 24, profit: 16.78, rank: 15, clickRate: 7.2, conversionRate: 2.5, feeRate: 5 },
  ],
};

// 补齐身份字段及跨月差异，覆盖“未设置”和链接中途上架的展示场景。
Object.entries(GoalPrototype.fixtures.shops).forEach(([id, shop], index) => { shop.shopCode = `SHOP${String(index + 1).padStart(4, '0')}`; });
(() => {
  const codes = new Map();
  GoalPrototype.fixtures.products.forEach(product => {
    if (!codes.has(product.product)) codes.set(product.product, `SPU${String(codes.size + 1).padStart(5, '0')}`);
    product.productCode = codes.get(product.product);
  });
})();
GoalPrototype.fixtures.links.forEach(link => {
  const product = GoalPrototype.fixtures.products.find(item => item.id === link.productId);
  link.linkName = `${product.product} 官方款`;
});
GoalPrototype.fixtures.products.find(item => item.id === 'supor-home').activeMonths = [4, 5, 6, 7, 8, 9, 10, 11, 12];
GoalPrototype.fixtures.links.find(item => item.linkId === '772196655952').activeMonths = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
// 非应季的10月不填报产品及链接目标，不生成零目标记录。
GoalPrototype.fixtures.products.find(item => item.id === 'supor-clean-tm').activeMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12];
GoalPrototype.fixtures.products.find(item => item.id === 'supor-clean-tm').monthValues = { 2: { gsv: 100 } };
GoalPrototype.fixtures.links.find(item => item.linkId === '772196655959').activeMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12];
GoalPrototype.fixtures.links.find(item => item.linkId === '772196655959').monthValues = { 2: { gsv: 80, rank: 6, clickRate: 9 } };

// 链接选择演示：每个店铺产品补充4条未填报链接，仅扩充主数据，不生成目标金额。
// activeMonths为空表示无初始月度目标；保存后由targetStore记录参与汇总。
GoalPrototype.fixtures.products.forEach((product, index) => {
  ['日常销售', '活动专享', '直播专享', '组合套装'].forEach((name, variant) => {
    GoalPrototype.fixtures.links.push({
      productId: product.id,
      linkId: String(990000000000 + (index + 1) * 100 + variant + 1),
      linkName: `${product.product} ${name}`,
      activeMonths: [],
    });
  });
});

// 本地生成的通用品类演示图，不代表品牌实拍。tile对应3×3图集的位置。
GoalPrototype.fixtures.products.forEach(product => {
  const tiles = [[/电饭煲/, 1], [/电热水壶/, 2], [/蒸汽清洁机/, 3], [/布艺清洗机/, 4], [/取暖器/, 5], [/挂烫机/, 6], [/护眼台灯/, 7], [/手持吸尘器/, 8]];
  product.thumbnail = { src: 'assets/products/appliance-atlas.png', tile: tiles.find(([pattern]) => pattern.test(product.product))?.[1] ?? 0 };
});
