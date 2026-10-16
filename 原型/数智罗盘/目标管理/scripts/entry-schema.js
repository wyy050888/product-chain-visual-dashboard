(() => {
  const app = GoalPrototype;
  const common = [['year', '年份'], ['monthNumber', '月份'], ['region', '大区'], ['brand', '品牌'], ['strategy', '店长策略'], ['promotion', '店长推广'], ['channel', '渠道'], ['shop', '店铺'], ['product', '产品名称（SPU）'], ['productCode', 'SPU码']];
  const metrics = { product: ['gsv', 'profit'], link: ['gsv', 'profit', 'rank', 'clickRate', 'conversionRate', 'feeRate'] };
  const metricLabels = { gsv: '目标GSV（w）', profit: '目标利润率（%）', rank: '链接排名目标', clickRate: '链接点击率目标（%）', conversionRate: '链接转化率目标（%）', feeRate: '费率目标（%）' };
  const fields = kind => [...common, ...(kind === 'link' ? [['linkId', '核心链接ID']] : []), ...metrics[kind].map(key => [key, ['gsv', 'profit'].includes(key) ? (kind === 'product' ? '产品' : '链接') + metricLabels[key] : metricLabels[key]])];
  const headers = kind => fields(kind).map(([, label]) => '*' + label);
  function catalog() {
    const products = [...new Map(app.fixtures.products.map(row => [row.productCode, row])).values()];
    const links = app.fixtures.links.map(row => { const parent = app.fixtures.products.find(product => product.id === row.productId); return { ...row, productCode: parent?.productCode, shopId: row.shopId || parent?.shopId, thumbnail: row.thumbnail || parent?.thumbnail }; });
    return { products, links, people: app.fixtures.people, shops: Object.entries(app.fixtures.shops).map(([shopId, row]) => ({ ...row, shopId })) };
  }
  // 产品标识随所选SPU带出，不随目标店铺切换。
  function productTags(product) {
    return Object.fromEntries(['newTag', 'sharedStock', 'selectedProduct'].map(key => [key, product?.[key] || '']));
  }
  function normalize(kind, input, options = {}) {
    const data = catalog(), errors = {}, record = { ...input };
    const text = key => String(input[key] ?? '').trim();
    fields(kind).forEach(([key, label]) => { if (!['brand', 'productCode'].includes(key) && !text(key)) errors[key] = `${label}不能为空`; });
    const region = app.regionConfig.find(text('region'));
    if (!region && text('region')) errors.region = app.regionConfig.error;
    record.regionId = region?.id || '';
    record.year = Number(text('year'));
    record.monthNumber = Number(text('monthNumber').replace(/月$/, ''));
    if (!/^\d{4}$/.test(text('year')) || record.year < 1900 || record.year > 9999) errors.year = '请输入四位年份（1900—9999）';
    if (!/^(0?[1-9]|1[0-2])月?$/.test(text('monthNumber'))) errors.monthNumber = '月份须为1—12';
    const match = (items, keys, value) => items.filter(item => keys.some(key => String(item[key]) === value));
    const validChannel = ['天猫', '京东', '拼多多'].includes(text('channel'));
    const authorized = data.shops.filter(row => row.authorized !== false);
    const shopScope = options.importMode ? authorized.filter(row => row.channel === text('channel')) : authorized;
    const shops = match(shopScope, ['shopId', 'shopCode', 'shop'], text('shopId') || text('shop'));
    const preserveUnmatched = options.preserveUnmatched && input.productMatch === 'unmatched';
    const products = preserveUnmatched ? [] : match(data.products, options.importMode ? text('productCode') ? ['productCode'] : ['product'] : ['productCode', 'product'], text('productCode') || text('product'));
    const shop = shops.length === 1 ? shops[0] : null, product = products.length === 1 ? products[0] : null;
    if (!shop) errors.shop = shops.length > 1 ? '当前渠道下店铺名称不唯一，请填写店铺ID' : options.importMode ? '店铺不在所填渠道的授权店铺清单中，请核对渠道及店铺名称或ID' : '店铺不存在';
    if (options.importMode && !validChannel) { errors.channel = '渠道仅支持天猫、京东、拼多多'; delete errors.shop; }
    const unmatched = preserveUnmatched || (options.importMode && !text('productCode') && text('product') && products.length === 0);
    if (!product && !unmatched) {
      if (options.importMode && text('productCode')) errors.productCode = 'SPU码不存在，请核对产品档案';
      else errors.product = products.length > 1 ? '产品名称不唯一，请填写SPU码' : '产品不存在';
    }
    if (options.importMode && product && text('productCode') && text('product') && text('product') !== product.product) errors.product = '产品名称与SPU码不一致，请核对产品档案';
    if (shop) {
      if (text('channel') !== shop.channel) errors.channel = '渠道与店铺不匹配';
      Object.assign(record, shop, { region: text('region') });
    }
    ['strategy', 'promotion'].forEach(field => {
      const matches = data.people.filter(person => person.active !== false && (person.name === text(field) || (!options.importMode && person.id === text(field))));
      if (matches.length !== 1) errors[field] = options.importMode ? '人员不在钉钉组织架构中，请填写完整姓名（含序号）' : '请选择有效人员';
      record[field] = matches.length === 1 ? matches[0].name : text(field);
      record[`${field}Id`] = matches.length === 1 ? matches[0].id : '';
    });
    if (product) {
      if (options.validateBrand && text('brand') !== product.brand) errors.brand = '品牌与产品档案不一致';
      record.brand = product.brand || '';
      const existing = app.fixtures.products.find(item => item.shopId === shop?.shopId && item.productCode === product.productCode);
      Object.assign(record, { id: existing?.id || `${shop?.shopId}/${product.productCode}`, product: product.product, productCode: product.productCode, ...productTags(product) });
      record.productMatch = 'matched';
    } else if (unmatched) {
      // 未匹配状态只在重新导入时重判；普通修改不查询新建档案或自动关联。
      Object.assign(record, { product: text('product'), productCode: '', brand: text('brand'), productMatch: 'unmatched', ...productTags(null) });
      record.id = JSON.stringify(['unmatched', shop?.shopId, record.brand, record.product]);
    }
    metrics[kind].forEach(key => {
      const raw = text(key), value = Number(raw);
      const valid = raw !== '' && Number.isFinite(value) && (key === 'gsv' ? value > 0 : key === 'profit' ? value !== 0 : key === 'rank' ? Number.isInteger(value) && value > 0 : value >= 0);
      if (!valid) errors[key] = key === 'rank' ? '请输入正整数' : key === 'gsv' ? '请输入大于0的数字' : key === 'profit' ? '请输入非零数字' : '请输入大于或等于0的数字';
      record[key] = value;
    });
    if (kind === 'link') {
      const link = data.links.find(item => item.linkId === text('linkId') && item.shopId === shop?.shopId);
      if (!link) errors.linkId = '核心链接不存在或不属于所选店铺';
      Object.assign(record, { productId: record.id, linkId: text('linkId'), linkName: link?.linkName });
    }
    if (options.importMode) {
      // 只报告可以独立确认的错误，避免上游字段未匹配引出误导性的关联错误。
      if (!product) delete errors.brand;
      if (!shop) delete errors.linkId;
      metrics[kind].forEach(key => {
        const raw = text(key), value = Number(raw);
        if (raw && !Number.isFinite(value)) errors[key] = '请输入有效数字，不要填写文字或单位';
        else if (raw && key === 'gsv' && value <= 0) errors[key] = '目标GSV必须大于0';
        else if (raw && key === 'profit' && value === 0) errors[key] = '目标利润率不能为0，允许负数';
        else if (raw && key === 'rank' && (!Number.isInteger(value) || value <= 0)) errors[key] = '链接排名目标必须为正整数';
        else if (raw && !['gsv', 'profit', 'rank'].includes(key) && value < 0) errors[key] = '必须大于或等于0';
      });
      if (kind === 'link' && text('linkId')) {
        const id = text('linkId'), numeric = input.linkId;
        if (/^[+-]?\d+(\.\d+)?e[+-]?\d+$/i.test(id) || (typeof numeric === 'number' && !Number.isSafeInteger(numeric))) errors.linkId = '链接ID格式或精度异常，请将单元格设为文本并重新粘贴完整ID';
        else if (shop) {
          const link = data.links.find(item => item.linkId === id);
          if (!link) errors.linkId = '链接ID不存在，请核对完整链接ID';
          else if (link.shopId !== shop.shopId) errors.linkId = '链接不属于所填渠道及店铺，请核对链接ID';
        }
      }
      fields(kind).forEach(([key, label]) => {
        if (key !== 'productCode' && !text(key)) errors[key] = `${label}不能为空`;
        if (text(key) === '不支持公式，请粘贴为数值') errors[key] = '不支持公式，请粘贴为数值后重新上传';
      });
    }
    record.month = `${record.year}/${String(record.monthNumber).padStart(2, '0')}`;
    return { record, errors };
  }
  app.entrySchema = { fields, headers, metrics, metricLabels, catalog, productTags, normalize };
})();
