// 库存总览与产品详情复用基础卡片，数量和货值共用库存快照。
const upBalanceRules={
 get total(){return ['总库存＝'+upTotalStockFormula,'未产订单＝'+this.unproducedOrders,this.unrefurbishedUnits].join('\n')},
 sellable:'我司可售库存＋工厂可售库存＋在途库存',warehouse:'聚水潭实体仓＋京东现货库存',
 factoryAvailable:'工厂新机良品库存＋工厂已翻新良品库存',
 transit:'聚水潭采购调拨在途＋京东在途',
 unproducedOrders:'新机采购总量－新机采购交付量－工厂新机良品库存',unrefurbishedUnits:'未翻新＝翻新请购总量－翻新请购交付量－工厂翻新良品库存',
 value:'对应库存货值＝Σ（SKU库存数量×财务单价）',
 coverage:'我司可售库存÷近15日均净销量；近15日均净销量＝（销量－总退件数）÷15',
 dailyNet15:'近15日均净销量＝近15天（销量－总退件数）合计÷15，使用公司全平台口径',
 turn:'库存周转率＝所选期间销售成本÷同期平均我司可售库存成本货值',
 totalCoverage:'总库存÷近15日均净销量；近15日均净销量＝（销量－总退件数）÷15'
};
function upBalanceHelp(key,label){return `<span class="metric-help" role="button" tabindex="0" aria-label="查看${label}口径" data-stock-rule="${key}" data-metric-rule="${esc(upBalanceRules[key])}"></span>`}
function upStockBalanceCards(model){
 const count=key=>stockQuantityMarkup(model[key]),money=key=>formatStockValue(model[key]),days=key=>Number.isFinite(model[key])?fmt(model[key],1)+'天':'—';
 const pair=(key,title,rule,quantity,value,bottom,bottomValue)=>`<article class="up-stock-card stock-balance-card" data-stock-card="${key}"><div class="stock-card-head"><h4>${title}${upBalanceHelp(rule,title)}</h4><span data-up-basic>货值</span></div><div class="up-stock-card-value primary stock-card-pair"><strong data-stock-quantity="${quantity}" data-stock-raw="${model[quantity]}">${count(quantity)}</strong><strong data-stock-value="${value}" data-stock-raw="${model[value]}">${money(value)}</strong></div><div class="stock-card-foot"><span data-up-basic>${bottom}</span><strong>${days(bottomValue)}</strong></div></article>`;
 const total=pair('total','总库存','total','totalUnits','goodsValueCents','总可售天数','totalCoverage15');
 const sellable=pair('sellable','可售库存','sellable','sellableUnits','sellableValueCents','可售天数','sellableCoverage15');
 const simple=(key,label,value,raw)=>`<article class="up-stock-card stock-balance-card" data-stock-card="${key}"><div class="stock-card-head"><h4>${label}</h4></div><div class="up-stock-card-value primary"><strong data-stock-quantity="${key}" data-stock-raw="${raw??''}">${value}</strong></div></article>`;
 return `<div class="stock-product-scroll"><div class="stock-overview-cards stock-product-cards">${[total,sellable,
   simple('dailyNet15','近15日均净销量',Number.isFinite(model.dailyNet15)?formatSalesQuantity(Math.round(model.dailyNet15))+'<span class="unit stock-quantity-unit">件</span>':'—',model.dailyNet15),
   simple('turn','库存周转率',Number.isFinite(model.turn)?fmt(model.turn,2)+'次':'—',model.turn),
   simple('delivery','交付及时率',upPercent(model.delivery),model.delivery),
   simple('refurbRate','翻新闭环率',ipRefurbRateCell({name:model.name,refurb:model.refurb,refurbRate:model.refurbRate}),model.refurbRate)
  ].join('')}</div></div>`;
}
