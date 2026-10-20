// 库存总览与产品详情复用基础卡片；详情按七项同排展示，数量和货值共用库存快照
const upBalanceRules={
 total:'我司可售＋在途库存＋工厂可售库存＋工厂待检库存＋工厂不良品库存＋未交订单＋未翻新库存',
 sellable:'我司可售＋工厂可售库存＋在途库存',warehouse:'聚量实体仓仓库库存＋京东仓库存',
 factoryAvailable:'工厂新机良品库存＋已翻新良品库存',factory:'工厂新机良品库存＋已翻新良品库存＋工厂不良品库存＋工厂待检库存＋工厂未翻新库存',
 transit:'采购调拨在途库存＋京东自营仓采购在途库存',value:'对应库存货值＝Σ（SKU库存数量×财务单价）',
 coverage:'我司可售库存÷近15日均净销量；近15日均净销量＝（销量－总退件数）÷15',
 dailyNet15:'近15日均净销量＝近15天（销量－总退件数）合计÷15，使用公司全平台口径',
 turn:'库存周转率＝近30日出库成本÷同期平均库存成本',
 totalCoverage:'总库存÷近15日均净销量；近15日均净销量＝（销量－总退件数）÷15'
};
function upBalanceHelp(key,label){return `<span class="metric-help" role="button" tabindex="0" aria-label="查看${label}口径" data-stock-rule="${key}" data-metric-rule="${esc(upBalanceRules[key])}"></span>`}
function upStockSeasonBar(model){
 const total=model.sellableUnits;
 return `<div class="stock-season-bar" aria-label="可售库存季品分布">${model.seasons.map((row,index)=>{
  const share=total>0?row.units/total*100:0,tip=row.label+' · '+(total>0?fmt(share,1)+'%':'—')+'\n可售库存：'+fmt(row.units)+'\n可售货值：'+upMoney(row.valueCents);
  return `<span class="stock-season-segment season-${index}" style="flex-grow:${share||0}" tabindex="${row.units>0?0:-1}" role="img" aria-label="${esc(tip)}" data-stock-season="${row.label}" data-stock-units="${row.units}" data-stock-value="${row.valueCents}" data-stock-share="${share}" data-metric-rule="${esc(tip)}"></span>`;
 }).join('')}</div>`;
}
function upStockBalanceCards(model,productDetail=false){
 const count=key=>Number.isFinite(model[key])?fmt(model[key]):'—',money=key=>Number.isFinite(model[key])?upMoney(model[key]):'—',days=key=>Number.isFinite(model[key])?fmt(model[key],1)+'天':'—';
 const sellableMoney=Number.isFinite(model.sellableValueCents)?(model.sellableValueCents/1000000).toFixed(1)+'w':'—';
 const pair=(key,title,rule,quantity,value,bottom,bottomValue,bottomRule)=>`<article class="up-stock-card stock-balance-card" data-stock-card="${key}"><div class="stock-card-head"><h4>${title}${upBalanceHelp(rule,title)}</h4><span data-up-basic>货值</span></div><div class="up-stock-card-value primary stock-card-pair"><strong data-stock-quantity="${quantity}" data-stock-raw="${model[quantity]}">${count(quantity)}</strong><strong data-stock-value="${value}" data-stock-raw="${model[value]}">${money(value)}</strong></div><div class="stock-card-foot"><span data-up-basic>${bottom}</span><strong>${bottomRule==='factory'?count(bottomValue):days(bottomValue)}</strong></div></article>`;
 const total=pair('total','总库存','total','totalUnits','goodsValueCents','总可售天数','totalCoverage15','totalCoverage');
 const warehouse=pair('warehouse','我司可售库存','warehouse','warehouse','warehouseValueCents','可售天数','coverage15','coverage');
 const factory=pair('factory','工厂可售库存','factoryAvailable','factoryAvailable','factoryAvailableValueCents','工厂总库存','factory','factory');
 if(productDetail){
  const simple=(key,label,value,raw)=>`<article class="up-stock-card stock-balance-card" data-stock-card="${key}"><div class="stock-card-head"><h4>${label}</h4></div><div class="up-stock-card-value primary"><strong data-stock-quantity="${key}" data-stock-raw="${raw??''}">${value}</strong></div></article>`;
  const sellable=`<article class="up-stock-card stock-balance-card stock-product-sellable" data-stock-card="sellable"><div class="stock-card-head"><h4>可售库存${upBalanceHelp('sellable','可售库存')}</h4><span data-up-basic>货值</span></div><div class="up-stock-card-value primary stock-card-pair"><strong data-stock-quantity="sellableUnits" data-stock-raw="${model.sellableUnits}">${count('sellableUnits')}</strong><strong data-stock-value="sellableValueCents" data-stock-raw="${model.sellableValueCents}">${sellableMoney}</strong></div></article>`;
  const transit=`<article class="up-stock-card stock-balance-card" data-stock-card="transit"><div class="stock-card-head"><h4>在途库存${upBalanceHelp('transit','在途库存')}</h4></div><div class="up-stock-card-value primary"><strong data-stock-quantity="transit" data-stock-raw="${model.transit}">${count('transit')}</strong></div></article>`;
  return `<div class="stock-product-scroll"><div class="stock-overview-cards stock-product-cards">${[total,sellable,warehouse,factory,transit,
   simple('dailyNet15','近15日均净销量',Number.isFinite(model.dailyNet15)?fmt(Math.round(model.dailyNet15)):'—',model.dailyNet15),
   simple('turn','近30日库存周转率',Number.isFinite(model.turn)?fmt(model.turn,1)+'次':'—',model.turn)
  ].join('')}</div></div>`;
 }
 return `<div class="stock-overview-cards">${[
  total,
  `<article class="up-stock-card stock-balance-card stock-sellable-card" data-stock-card="sellable"><div class="stock-card-head"><h4>可售库存${upBalanceHelp('sellable','可售库存')}</h4></div><div class="up-stock-card-value primary"><strong data-stock-quantity="sellableUnits">${count('sellableUnits')}</strong></div><div class="stock-season-aside">${upStockSeasonBar(model)}<div class="stock-season-legend">${model.seasons.map((row,i)=>`<span><span><i class="season-${i}"></i>${row.label}</span><b>${model.sellableUnits>0?fmt(row.units/model.sellableUnits*100,1)+'%':'—'}</b></span>`).join('')}</div></div><div class="stock-card-foot stock-sellable-value"><span data-up-basic>货值</span><strong data-stock-value="sellableValueCents" data-stock-raw="${model.sellableValueCents}">${sellableMoney}</strong></div></article>`,
  warehouse,
  factory,
  `<article class="up-stock-card stock-balance-card" data-stock-card="transit"><div class="stock-card-head"><h4>在途库存${upBalanceHelp('transit','在途库存')}</h4><span data-up-basic>货值</span></div><div class="up-stock-card-value primary stock-card-pair"><strong data-stock-quantity="transit">${count('transit')}</strong><strong data-stock-value="transitValueCents" data-stock-raw="${model.transitValueCents}">${money('transitValueCents')}</strong></div></article>`
 ].join('')}</div>`;
}
