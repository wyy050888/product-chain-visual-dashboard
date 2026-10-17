function kpmGradeBadge(p){return p.level?`<span class="kpm-grade ${p.level}"><b>${p.level}</b>${kpmGrades[p.level]}</span>`:'<span class="kpm-grade unrated">待分级</span>'}
function kpmFilterField(key,label,choices){return `<label>${label}<select multiple data-pf-multiple data-pf-label="${label}" data-kpm-filter="${key}" aria-label="关键产品${label}">${pfOptions(choices,kpmFilters[key])}</select></label>`}
function kpmTools(){return `<div class="kpm-list-head"><h3>产品经营明细</h3></div><div class="kpm-tools" role="group" aria-label="关键产品搜索筛选">
 <label class="kpm-search"><input type="search" data-kpm-search aria-label="关键产品搜索" placeholder="搜索产品名称 / SPU码 / 型号" value="${esc(kpmFilters.query)}"></label>
 ${kpmFilterField('brand','品牌',[...new Set(sampleSpus.map(p=>p.brand))])}${kpmFilterField('category','类目',pfCategories)}
 ${kpmFilterField('season','季品',['夏季品','冬季品','四季品'])}${kpmFilterField('channel','销售渠道',qrPlatforms)}
 ${kpmFilterField('risk','库存风险',Object.entries(kpmRiskNames).map(([value,label])=>({value,label})).concat({value:'normal',label:'无库存风险'}))}
 <button type="button" class="link" data-kpm-reset>重置筛选</button></div>`}
function kpmHeader(key,label){return `<button type="button" class="kpm-sort" data-kpm-sort="${key}" data-direction="${kpmSort.key===key?kpmSort.direction:''}">${label}<span aria-hidden="true">${kpmSort.key===key?(kpmSort.direction==='asc'?'↑':'↓'):'↕'}</span></button>`}
function kpmStockCell(stock,total=false){
 if(!stock)return '--';const value=total?stock.totalUnits:stock.warehouse,days=total?stock.totalCoverage15:stock.coverage15;
 return `<b>${fmt(value)}</b><small>可售天数 ${Number.isFinite(days)?fmt(days,1)+'天':'--'}</small>`;
}
function kpmTable(rows){
 const headers=['SPU信息','产品分级','等级变动',kpmHeader('sales','GSV'),kpmHeader('profit','单品利润率'),kpmHeader('amount','利润额'),kpmHeader('units','销量'),
  kpmHeader('returns','总退'),kpmHeader('received','已收退'),`<div class="kpm-stock-heading">${kpmHeader('warehouse','我司可售库存')}${kpmHeader('coverage','可售天数')}</div>`,`<div class="kpm-stock-heading">${kpmHeader('total','总库存')}${kpmHeader('totalCoverage','总可售天数')}</div>`,'库存风险','操作'];
 return rows.length?table(headers,rows.map(p=>[
  `<div class="kpm-product">${riskThumbnail(p.name)}<div><b>${esc(p.name)}</b><small>SPU码：${esc(p.spuCode)}</small><small>${esc(p.brand)} · ${esc(p.category)} · ${esc(p.season)}</small></div></div>`,kpmGradeBadge(p),kpmChangeButton(p),
  `<span class="kpm-value-gsv">${upMoney(p.facts.gsvCents)}</span>`,`<span class="kpm-value-profit ${p.profit<0?'red':''}">${upPercent(p.profit)}</span>`,`<span class="${p.facts.profitCents<0?'red':''}">${upMoney(p.facts.profitCents)}</span>`,fmt(p.facts.sales),
  upPercent(p.facts.returnRate),upPercent(p.facts.receivedRate),kpmStockCell(p.stock),kpmStockCell(p.stock,true),
  p.stockRisks.length?p.stockRisks.map(key=>`<span class="kpm-stock-risk ${key}">${kpmRiskNames[key]}</span>`).join(''):Number.isFinite(p.stock?.coverage15)?'<span class="kpm-normal">正常</span>':'<span class="muted">待数据</span>',
  `<div class="kpm-actions"><button type="button" class="link" data-kpm-history="${p.spuId}">变动记录</button><button type="button" class="link" data-kpm-detail="${p.spuId}">查看</button></div>`
 ])):'<div class="kpm-empty">暂无符合条件的产品，请调整搜索或筛选</div>';
}
// 部门工作台仍使用独立的旧矩阵；克隆时移除总看板专用控件，防止筛选串用。
function kpmRestoreLegacy(section){
 if(!section.classList.contains('kpm-main'))return;
 kpmCloseChartZoom(false);
 section.classList.remove('kpm-main');section.querySelector('.matrixlayout').innerHTML='<div class="matrixplot"><div id="matrixchart"></div><div class="matrixlegend"><span>近30天销售额（万元）</span></div></div><div class="matrixlist"><div class="tabs" id="matrixtabs"></div><div class="tablewrap" id="matrixtable"></div><p class="note"></p></div>';
}
function kpmRender(){kpmCloseChartZoom(false);kpmHidePointTooltip();return withPeriod('matrix',()=>{
 const section=$('#matrix');section.classList.add('kpm-main');section.querySelector('.titlegroup>.tag').textContent='SABC产品分级';
 if(!section.querySelector('.kpm-tools'))section.querySelector('.matrixlist').innerHTML=kpmTools()+'<div class="tabs" id="matrixtabs"></div><div id="kpm-change-tabs"></div><div class="tablewrap" id="matrixtable"></div><div id="matrix-product-pager"></div>';
 const key=periodKey();if(kpmPage.key!==key){kpmPage.key=key;kpmPage.value=1}
 const rows=kpmRows(),base=kpmFilterRows(rows,false),visible=kpmSortedRows(rows),graded=visible.filter(p=>p.facts.sales>0);
 section.querySelector('.matrixplot').innerHTML=`<div class="kpm-chart-head"><h3>产品经营矩阵</h3><div class="kpm-chart-legend">${Object.entries(kpmGrades).map(([g,name])=>`<span class="${g}"><i></i>${g} ${name}</span>`).join('')}${visible.some(p=>!p.level)?'<span class="unrated"><i></i>待分级</span>':''}</div><div class="kpm-chart-actions"><button type="button" class="kpm-expand" data-kpm-expand aria-expanded="false">⛶ 放大查看</button></div></div><div id="matrixchart">${kpmChart(visible,base)}</div><div id="matrix-ai-summary" class="matrix-ai-summary">${graded.length?matrixAnalysisHTML(graded).replaceAll('近30天',periodShortText()).replaceAll('销售额','GSV').replace(/<div class="mk-heading"><h3>关键产品预警<\/h3><span>.*?<\/span><\/div>/,'<div class="mk-heading"><h3>关键产品预警</h3></div>'):'<p class="muted">暂无有效经营数据，不推断等级或经营预警。</p>'}</div>`;
 const counts=Object.fromEntries(Object.keys(kpmGrades).map(g=>[g,base.filter(p=>p.level===g).length]));
 const tabs=[['all','全部',base.length],...Object.entries(kpmGrades).map(([g,name])=>[g,g+' '+name,counts[g]])];
 if(base.some(p=>!p.level)||kpmSelectedGrade==='unrated')tabs.push(['unrated','待分级',base.filter(p=>!p.level).length]);
 $('#matrixtabs').innerHTML=tabs.map(([key,label,count])=>`<button type="button" data-kpm-grade="${key}" class="${kpmSelectedGrade===key?'active':''}" aria-pressed="${kpmSelectedGrade===key}">${label}<span>${count}</span></button>`).join('');
 kpmRenderChangeTabs(rows);
 kpmPage.value=Math.max(1,Math.min(kpmPage.value,Math.ceil(visible.length/KPM_PAGE_SIZE)||1));
 const tableHost=$('#matrixtable');tableHost.innerHTML=kpmTable(visible.slice((kpmPage.value-1)*KPM_PAGE_SIZE,kpmPage.value*KPM_PAGE_SIZE));
 for(const th of tableHost.querySelectorAll('th')){const active=[...th.querySelectorAll('[data-kpm-sort]')].some(b=>b.dataset.kpmSort===kpmSort.key);if(th.querySelector('[data-kpm-sort]'))th.setAttribute('aria-sort',!active?'none':kpmSort.direction==='asc'?'ascending':'descending')}
 const pager=$('#matrix-product-pager');pager.innerHTML=listPager(visible.length,kpmPage.value,KPM_PAGE_SIZE);bindListPager(pager,page=>{kpmPage.value=page;kpmRender()});
 pfMultiMount(section.querySelector('.kpm-tools'));decorateModule('matrix');
});}
