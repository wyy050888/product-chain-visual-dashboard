// 复用品质榜的两行指标、图片尺寸、普通字重产品名与盾牌序号。
function rpLossCardColumns(){return '<div class="rp-quality-columns rp-loss-columns">'+['GSV','净利润率','亏损金额','总退','总库存'].map((name,i)=>'<span'+(i===1?' data-rp-loss-margin':'')+'>'+name+'</span>').join('')+'</div>'}
function rpLossCardEntry(record,index){return rpProductCardEntry(2,record,index,rpLossCardKeys,'rp-loss')}
function rpProductCardEntry(kind,record,index,keys,prefix){
 const fields=rpFields(kind,record,keys);
 return '<article class="rp-entry rp-quality-entry '+prefix+'-entry" data-rp-kind="'+kind+'" data-rp-row="'+kind+':'+record.id+'"><div class="rp-entry-main"><header><span class="rank">'+String(index+1).padStart(2,'0')+'</span>'+rpIdentityMarkup(kind,record,false,true)+'</header><div class="rp-quality-values '+prefix+'-values">'+fields.map(f=>'<div class="rp-quality-metric" data-rp-field="'+f.key+'" aria-label="'+esc(f.name)+'"><span class="rp-quality-mobile-label">'+esc(f.name)+'</span><strong class="'+f.tone+'" title="'+esc(f.hint)+'">'+esc(f.value)+'</strong><small class="'+f.targetTone+'">'+(f.target?rpTargetText(f):'&nbsp;')+'</small></div>').join('')+'</div></div></article>';
}
