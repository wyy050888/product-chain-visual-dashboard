// 两榜复用品质卡片的身份、序号和两行指标，卡片辅助值与抽屉独立控制。
function rpStockCardColumns(kind){
 const names=kind===3?['可售库存','可售天数','总库存','总可售天数','近15日均净销量']:['呆滞库存','呆滞货值','呆滞最高库龄','我司可售库存','我司可售天数','近15日均净销量'];
 return '<div class="rp-quality-columns rp-stock-columns rp-stock-columns-'+kind+'">'+names.map(name=>'<span>'+name+'</span>').join('')+'</div>';
}
function rpStockCardEntry(kind,record,index){
 const fields=rpFields(kind,record,rpStockCardKeys[kind]);
 return '<article class="rp-entry rp-quality-entry rp-stock-entry" data-rp-kind="'+kind+'" data-rp-row="'+kind+':'+record.id+'"><div class="rp-entry-main"><header><span class="rank">'+String(index+1).padStart(2,'0')+'</span>'+rpIdentityMarkup(kind,record,false,true)+'</header><div class="rp-quality-values rp-stock-values rp-stock-values-'+kind+'">'+fields.map(field=>{
  const f={...field,noNumericSignal:field.noNumericSignal||(kind===3&&['sellableCoverage15','totalCoverage15'].includes(field.key)),target:field.cardTarget??field.target,targetTone:field.cardTargetTone??field.targetTone};
  const value=numberSignalMain(f).replace(/([次天件])$/, '<span class="rp-stock-unit">$1</span>');
  return '<div class="rp-quality-metric" data-rp-field="'+f.key+'" aria-label="'+esc(f.name)+'"><span class="rp-quality-mobile-label">'+netSalesLabel(f.name,f.key)+'</span><strong class="'+f.tone+'">'+value+'</strong><small class="'+f.targetTone+'">'+(f.target?rpTargetText(f):'&nbsp;')+'</small></div>';
 }).join('')+'</div></div></article>';
}
