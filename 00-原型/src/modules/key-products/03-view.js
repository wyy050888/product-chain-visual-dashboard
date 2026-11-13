function kpmGradeBadge(p){return p.level?`<span class="kpm-grade ${p.level}"><b>${p.level}</b></span>`:'<span class="kpm-grade unrated">—</span>'}
function kpmFilterField(key,label,choices){return `<label>${label}<select multiple data-pf-multiple data-pf-label="${label}" data-kpm-filter="${key}" aria-label="关键产品${label}">${pfOptions(choices,kpmFilters[key])}</select></label>`}
function kpmTools(){return `<div class="kpm-tools" role="group" aria-label="关键产品搜索筛选">
 <label class="kpm-search"><input type="search" data-kpm-search aria-label="关键产品搜索" placeholder="搜索产品名称 / SPU码 / 型号" value="${esc(kpmFilters.query)}"></label>
 ${kpmFilterField('brand','品牌',[...new Set(sampleSpus.map(p=>p.brand))])}
 ${kpmPriceMarkup(kpmFilters,'main')}</div>`}
function kpmHeader(key,label){
 const active=kpmSort.key===key,action=!active?'降序':kpmSort.direction==='desc'?'升序':key===kpmDefaultSort.key?'降序':'恢复GSV降序';
 return `<button type="button" class="kpm-sort rp-sort-header" data-kpm-sort="${key}" data-direction="${active?kpmSort.direction:''}" aria-label="${label}：${action}" title="点击${action}">${label}<span class="rp-sort-arrows" aria-hidden="true"></span></button>${key==='guidePrice'?nspKpiHelp('指导价','此处为抖音渠道指导价'):netSalesHelp(key==='units'?'netSales':key)}`;
}
// 部门工作台仍使用独立的旧矩阵；克隆时移除总看板专用控件，防止筛选串用。
function kpmRestoreLegacy(section){
 if(!section.classList.contains('kpm-main'))return;
 kpmCloseChartZoom(false);
 section.querySelector('[data-kpm-scope-switch]')?.remove();
 section.querySelector('.kpm-scope-tabs')?.remove();
 section.classList.remove('kpm-main');section.querySelector('.matrixlayout').innerHTML='<div class="matrixplot"><div id="matrixchart"></div><div class="matrixlegend"><span>近30天销售额（万元）</span></div></div><div class="matrixlist"><div class="tabs" id="matrixtabs"></div><div class="tablewrap" id="matrixtable"></div><p class="note"></p></div>';
}
function kpmRender(){kpmCloseChartZoom(false);kpmHidePointTooltip();return withPeriod('matrix',()=>{
 const section=$('#matrix');section.classList.add('kpm-main');section.querySelector('.titlegroup>.tag').textContent='SABC产品分级';kpmRenderBusinessSwitch(section);
 if(!section.querySelector('.kpm-tools'))section.querySelector('.matrixlist').innerHTML=kpmTools()+'<div id="kpm-active-change" role="status" aria-live="polite"></div><div class="tablewrap" id="matrixtable"></div><div id="matrix-product-pager"></div>';
 const key=periodKey();if(kpmPage.key!==key){kpmPage.key=key;kpmPage.value=1}
 const rows=kpmRows(),base=kpmFilterRows(rows,false,false),visible=kpmSortedRows(rows),managementRows=kpmFilterRows(rows,true,false);
 // 等级与异动条件作用于明细；矩阵保留当前业务范围的完整分布。
 kpmRenderScopeTabs(section,rows);
 const plot=section.querySelector('.matrixplot');
 if(!plot.querySelector('.kpm-grade-summary'))plot.innerHTML=`<div class="kpm-chart-head"><h3 id="kpm-structure-heading">产品经营矩阵</h3><div class="kpm-chart-legend">${kpmChartLegend()}</div><div class="kpm-chart-actions"><button type="button" class="kpm-expand" data-kpm-expand aria-expanded="false">查看分布图</button></div></div><div class="kpm-grade-summary" role="region" aria-labelledby="kpm-structure-heading" tabindex="0"></div><div id="matrixchart"></div>`;
 dashboardRenderMarkup(plot.querySelector('.kpm-grade-summary'),kpmGradeSummaryTable(base));
 dashboardRenderMarkup(plot.querySelector('#matrixchart'),kpmChart(base,base));
 kpmRenderSidebar(rows,managementRows);
 kpmRenderChangeCondition();
 kpmPage.value=Math.max(1,Math.min(kpmPage.value,Math.ceil(visible.length/kpmPageSize())||1));
 const tableHost=$('#matrixtable');tableHost.innerHTML=kpmTable(visible.slice((kpmPage.value-1)*kpmPageSize(),kpmPage.value*kpmPageSize()));kpmObserveTableViewport(tableHost);
 // 这三项只保留排序，使用公共无提示标记防止重绘后自动补回问号。
 for(const key of ['sales','units','profit'])tableHost.querySelector('[data-kpm-sort="'+key+'"]')?.closest('th').setAttribute('data-up-basic','true');
 for(const th of tableHost.querySelectorAll('th')){const active=[...th.querySelectorAll('[data-kpm-sort]')].some(b=>b.dataset.kpmSort===kpmSort.key);if(th.querySelector('[data-kpm-sort]'))th.setAttribute('aria-sort',!active?'none':kpmSort.direction==='asc'?'ascending':'descending')}
 const pager=$('#matrix-product-pager');pager.innerHTML=listPager(visible.length,kpmPage.value,kpmPageSize());bindListPager(pager,page=>{kpmPage.value=page;kpmRender()});
 const priceHost=section.querySelector('[data-kpm-price-host=main]');
 if(!priceHost.kpmPriceControl)priceHost.kpmPriceControl=kpmMountPriceFilter(priceHost,kpmFilters,()=>{kpmPage.value=1;kpmRender()});
 priceHost.kpmPriceControl.sync();
 pfMultiMount(section.querySelector('.kpm-tools'));decorateModule('matrix');
});}
