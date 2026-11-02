// 复用品质榜的两行指标、图片尺寸、普通字重产品名与盾牌序号。
function rpLossCardColumns(){return '<div class="rp-quality-columns rp-loss-columns"><span class="rp-loss-product-label">产品信息</span>'+['亏损金额','净利润率','GSV','总退','已收退','总库存'].map((name,i)=>'<span'+(i===1?' data-rp-loss-margin':'')+'>'+name+'</span>').join('')+'</div>'}
function rpLossCardEntry(record,index){return rpProductCardEntry(2,record,index,rpLossCardKeys,'rp-loss')}
function rpProductCardEntry(kind,record,index,keys,prefix){
 const fields=rpFields(kind,record,keys).map(field=>({...field,target:field.cardTarget??field.target,targetTone:field.cardTargetTone??field.targetTone}));
 return '<article class="rp-entry rp-quality-entry '+prefix+'-entry" data-rp-kind="'+kind+'" data-rp-row="'+kind+':'+record.id+'"><div class="rp-entry-main"><header><span class="rank">'+String(index+1).padStart(2,'0')+'</span>'+rpIdentityMarkup(kind,record,false,true)+'</header><div class="rp-quality-values '+prefix+'-values">'+fields.map(f=>'<div class="rp-quality-metric" data-rp-field="'+f.key+'" aria-label="'+esc(f.name)+'"><span class="rp-quality-mobile-label">'+netSalesLabel(f.name,f.key)+'</span><strong class="'+f.tone+'">'+numberSignalMain(f)+'</strong><small class="'+f.targetTone+'">'+(f.target?rpTargetText(f):'&nbsp;')+'</small></div>').join('')+'</div></div></article>';
}

// 亏损独占一行：筛选移到平台工具栏，保留共用记录与详情事件。
function rpMountLossTable(card){
 const head=card.querySelector('.rhead'),platform=card.querySelector('.rp-platform-menu');
 const actions=head.querySelector('.rp-quality-actions')||document.createElement('div');actions.classList.add('rp-quality-actions');
 const more=head.querySelector('[data-risk="2"]');if(more&&!actions.contains(more))actions.append(more);
 const toolbar=document.createElement('div');toolbar.className='rp-loss-toolbar';head.after(toolbar);
 const filters=document.createElement('div');filters.className='rp-loss-filter-groups';toolbar.append(filters);
 if(platform)filters.append(platform);
 filters.insertAdjacentHTML('beforeend','<span class="rp-loss-filter-separator" aria-hidden="true"></span>'+rpCardSeasonTags(2));
 if(actions)toolbar.append(actions);
 const table=card.querySelector('.rp-items');table.setAttribute('role','table');table.setAttribute('aria-label','亏损产品榜');table.tabIndex=0;
 const columns=table.querySelector('.rp-loss-columns');columns.setAttribute('role','row');
 for(const cell of columns.children)cell.setAttribute('role','columnheader');
 for(const row of table.querySelectorAll('.rp-loss-entry')){
  row.setAttribute('role','row');row.querySelector('.rp-entry-main').setAttribute('role','presentation');
  row.querySelector('header').setAttribute('role','cell');row.querySelector('.rp-loss-values').setAttribute('role','presentation');
  for(const cell of row.querySelectorAll('.rp-quality-metric'))cell.setAttribute('role','cell');
 }
}
