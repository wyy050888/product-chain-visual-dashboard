// 总览与两表共用最新库存余额和所选期间业务指标。
function ipOverviewSummary(records,balance){
 const metrics=ipStockSum(records);
 const seasons=filterCatalog.seasons.map(label=>{
  const rows=records.filter(row=>pfIdentity(row).attribute===label);
  return {label,units:targetSum(rows.map(row=>row.staleUnits||0)),valueCents:targetSum(rows.map(row=>row.staleValueCents||0))};
 });
 const range=bounds(ipMetricPeriod);
 return {...metrics,seasons,unrefurbished:ipUnrefurbishedSummary(records),stockout:ipStockoutModel(records,range),metricPeriod:{...ipMetricPeriod},range,totalUnits:balance.totalUnits,goodsValueCents:balance.goodsValueCents,
  staleRatio:balance.totalUnits?metrics.staleUnits/balance.totalUnits*100:null,
  staleValueRatio:balance.goodsValueCents?metrics.staleValueCents/balance.goodsValueCents*100:null};
}
const ipOverviewRules={
 delivery:{
  title:'新机交付及时率',
  text:'新机交付及时率 =（考核期内的已交付量+当前最新库存数（人工导入））/ 考核期内的采购总量',
  emphasis:'（人工导入）'
 },
 refurb:{
  title:'翻新闭环率',
  text:'翻新闭环率 = 到工厂之后30天完成翻新的采购单量 / 总采购单量'
 },
 stockout:{
  title:'爆款断货次数',
  text:'非C级品、非清仓品、非下市品，近15天日均净销＞0 且 我司可售库存为0的次数'
 }
};
function ipOverviewHelp(key){
 const {title,text,emphasis}=ipOverviewRules[key];
 return `<span class="metric-help" tabindex="0" role="button" aria-label="查看${title}口径" data-ip-overview-help="${key}" data-metric-rule="${esc(text)}"${emphasis?` data-metric-emphasis="${esc(emphasis)}"`:''}></span>`;
}
// 总览使用独立紧凑布局；库存快照、期间指标和产品详情仍共用原模型。
function ipOverviewCard({key,title,help='',quantity,value='',valueLabel='货值',foot='',className=''}){
 return `<article class="up-stock-card stock-balance-card stock-summary-card ${className}" data-stock-card="${key}"><div class="stock-card-head"><h4>${title}${help}</h4>${value?`<span class="stock-summary-label" data-up-basic>${valueLabel}</span>`:''}</div><div class="stock-summary-body"><div class="up-stock-card-value primary">${quantity}</div>${value?`<div class="stock-summary-worth"><div>${value}</div></div>`:''}</div>${foot?`<div class="stock-card-foot">${foot}</div>`:''}</article>`;
}
function ipOverviewCards(model,balance){
 const share=value=>`<small class="stock-card-share">（${Number.isFinite(value)?fmt(value,1)+'%':'—'}）</small>`;
 const quantity=(key,value,ratio)=>`<strong data-stock-quantity="${key}" data-stock-raw="${value??''}">${stockQuantityMarkup(value)}</strong>${ratio===undefined?'':share(ratio)}`;
 // 同行数量和金额共用主数字样式；件、元、万元均作为辅助单位展示。
 const money=(key,value)=>!Number.isFinite(value)?'—':(key==='sellableValueCents'?(value/1000000).toFixed(1)+'万元':upMoney(value).replace(/w$/,'万元')).replace(/(万元|元)$/,'<span class="unit stock-money-unit">$1</span>');
 const worth=(key,value,ratio)=>`<strong data-stock-value="${key}" data-stock-raw="${value??''}">${money(key,value)}</strong>${ratio===undefined?'':share(ratio)}`;
 const definitions=[
  ['total','总库存','total','totalUnits','goodsValueCents'],
  ['warehouse','我司可售库存','warehouse','warehouse','warehouseValueCents'],
  ['factory','工厂可售库存','factoryAvailable','factoryAvailable','factoryAvailableValueCents','工厂总库存',stockQuantityMarkup(balance.factory)],
  ['transit','在途库存','transit','transit','transitValueCents']
 ];
 const stock=definitions.map(([key,title,rule,countKey,valueKey,footLabel,footValue])=>ipOverviewCard({key,title,help:upBalanceHelp(rule,title),quantity:quantity(countKey,balance[countKey]),value:worth(valueKey,balance[valueKey]),foot:footLabel?`<span data-up-basic>${footLabel}</span><strong>${footValue}</strong>`:''})).join('');
 const turnTone=ipSignal('turn',model.turn,model.metricPeriod.mode);
 const turn=ipOverviewCard({key:'turn',title:'库存周转率',quantity:`<strong class="ip-signal ${turnTone==='none'?'muted':turnTone}" data-stock-turn="${model.turn??''}">${numberSignal(Number.isFinite(model.turn)?fmt(model.turn,2)+'次':'—',turnTone)}</strong>`,className:'stock-summary-single'});
 const deliveryTone=ipSignal('delivery',model.delivery,model.metricPeriod.mode);
 const delivery=ipOverviewCard({key:'delivery',title:'交付及时率',help:ipOverviewHelp('delivery'),quantity:`<strong class="ip-signal ${deliveryTone==='none'?'muted':deliveryTone}" data-stock-delivery="${model.delivery??''}">${numberSignal(Number.isFinite(model.delivery)?fmt(model.delivery,1)+'%':'—',deliveryTone)}</strong>`,className:'stock-summary-single'});
 return `<div class="stock-overview-cards">${stock}<div class="stock-period-cards">${turn}${delivery}${ipStockoutCard(model.stockout)}</div>${ipRefurbCard(model.refurb,model.unrefurbished)}</div>`;
}
