// 两榜复用品质卡片的身份、序号和两行指标，卡片辅助值与抽屉独立控制。
function rpStagnantMetricHelp(key){
 const metric=rpStagnantMetricLabels[key];
 return metric?`<span class="metric-help rp-stagnant-metric-help" role="button" tabindex="0" aria-label="查看${esc(metric[0])}说明" data-metric-rule="${esc(metric[1])}" data-preserve-terms></span>`:'';
}
function rpStockCardColumns(kind){
 const names=kind===3?['可售库存','可售天数','总库存','总可售天数','近15日均净销量']:[...Object.values(rpStagnantMetricLabels).map(([label])=>label),'可售库存','可售天数','近15日均净销量'];
 return '<div class="rp-quality-columns rp-stock-columns rp-stock-columns-'+kind+'"'+(kind===4?' data-preserve-terms':'')+'>'+names.map(name=>'<span>'+name+'</span>').join('')+'</div>';
}
function rpStockCardEntry(kind,record,index){
 const fields=rpFields(kind,record,rpStockCardKeys[kind]);
 return '<article class="rp-entry rp-quality-entry rp-stock-entry" data-rp-kind="'+kind+'" data-rp-row="'+kind+':'+record.id+'"><div class="rp-entry-main"><header><span class="rank">'+String(index+1).padStart(2,'0')+'</span>'+rpIdentityMarkup(kind,record,false,true)+'</header><div class="rp-quality-values rp-stock-values rp-stock-values-'+kind+'">'+fields.map(field=>{
  const f={...field,noNumericSignal:field.noNumericSignal||(kind===3&&['sellableCoverage15','totalCoverage15'].includes(field.key)),target:field.cardTarget??field.target,targetTone:field.cardTargetTone??field.targetTone};
  const name=kind===4?rpStagnantMetricLabels[f.key]?.[0]??f.name:f.name;
  const help=kind===4?rpStagnantMetricHelp(f.key):'';
  const value=numberSignalMain(f).replace(/([次天件])$/, '<span class="rp-stock-unit">$1</span>');
  return '<div class="rp-quality-metric" data-rp-field="'+f.key+'" aria-label="'+esc(name)+'"'+(f.key==='responsibleChannel'?' data-preserve-terms':'')+'><span class="rp-quality-mobile-label">'+netSalesLabel(name,f.key)+help+'</span><strong class="'+f.tone+'">'+value+'</strong><small class="'+f.targetTone+'">'+(f.target?rpTargetText(f):'&nbsp;')+'</small></div>';
 }).join('')+'</div></div></article>';
}
