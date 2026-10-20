function kpmGradeBadge(p){return p.level?`<span class="kpm-grade ${p.level}"><b>${p.level}</b></span>`:'<span class="kpm-grade unrated">—</span>'}
function kpmFilterField(key,label,choices){return `<label>${label}<select multiple data-pf-multiple data-pf-label="${label}" data-kpm-filter="${key}" aria-label="关键产品${label}">${pfOptions(choices,kpmFilters[key])}</select></label>`}
function kpmTools(){return `<div class="kpm-tools" role="group" aria-label="关键产品搜索筛选">
 <label class="kpm-search"><input type="search" data-kpm-search aria-label="关键产品搜索" placeholder="搜索产品名称 / SPU码 / 型号" value="${esc(kpmFilters.query)}"></label>
 ${kpmFilterField('brand','品牌',[...new Set(sampleSpus.map(p=>p.brand))])}${kpmFilterField('category','类目',pfCategories)}
 ${kpmPriceMarkup(kpmFilters,'main')}
 ${kpmFilterField('season','季品',filterCatalog.seasons)}
 <button type="button" class="link" data-kpm-reset>重置</button></div>`}
function kpmHeader(key,label){return `<button type="button" class="kpm-sort" data-kpm-sort="${key}" data-direction="${kpmSort.key===key?kpmSort.direction:''}">${label}<span aria-hidden="true">${kpmSort.key===key?(kpmSort.direction==='asc'?'↑':'↓'):'↕'}</span></button>`}
// 部门工作台仍使用独立的旧矩阵；克隆时移除总看板专用控件，防止筛选串用。
function kpmRestoreLegacy(section){
 if(!section.classList.contains('kpm-main'))return;
 kpmCloseChartZoom(false);
 section.querySelector('[data-kpm-scope-switch]')?.remove();
 section.classList.remove('kpm-main');section.querySelector('.matrixlayout').innerHTML='<div class="matrixplot"><div id="matrixchart"></div><div class="matrixlegend"><span>近30天销售额（万元）</span></div></div><div class="matrixlist"><div class="tabs" id="matrixtabs"></div><div class="tablewrap" id="matrixtable"></div><p class="note"></p></div>';
}
function kpmRender(){kpmCloseChartZoom(false);kpmHidePointTooltip();return withPeriod('matrix',()=>{
 const section=$('#matrix');section.classList.add('kpm-main');section.querySelector('.titlegroup>.tag').textContent='SABC产品分级';kpmRenderBusinessSwitch(section);
 if(!section.querySelector('.kpm-tools'))section.querySelector('.matrixlist').innerHTML=kpmTools()+'<div class="kpm-filter-strip" role="group" aria-label="产品分级与等级变动筛选"><div class="tabs" id="matrixtabs"></div><div id="kpm-change-tabs"></div></div><div class="tablewrap" id="matrixtable"></div><div id="matrix-product-pager"></div>';
 const key=periodKey();if(kpmPage.key!==key){kpmPage.key=key;kpmPage.value=1}
 const rows=kpmRows(),base=kpmFilterRows(rows,false),visible=kpmSortedRows(rows),managementRows=kpmFilterRows(rows);
 section.querySelector('.matrixplot').innerHTML=`<div class="kpm-chart-head"><h3>产品经营矩阵</h3><div class="kpm-chart-legend">${Object.entries(kpmGrades).map(([g,name])=>`<span class="${g}"><i></i>${g} ${name}</span>`).join('')}</div><div class="kpm-chart-actions"><button type="button" class="kpm-expand" data-kpm-expand aria-expanded="false">⛶ 放大</button></div></div><div id="matrixchart">${kpmChart(visible,base)}</div>`;
 kpmRenderSidebar(rows,managementRows);
 const counts=Object.fromEntries(Object.keys(kpmGrades).map(g=>[g,base.filter(p=>p.level===g).length]));
 const tabs=[['all','全部',base.length],...Object.entries(kpmGrades).map(([g,name])=>[g,g,counts[g]])];
 if(base.some(p=>!p.level)||kpmSelectedGrade==='unrated')tabs.push(['unrated','待分级',base.filter(p=>!p.level).length]);
 $('#matrixtabs').innerHTML=tabs.map(([key,label,count])=>`<button type="button" data-kpm-grade="${key}" class="${kpmSelectedGrade===key?'active':''}" aria-pressed="${kpmSelectedGrade===key}">${label}<span>${count}</span></button>`).join('');
 kpmRenderChangeTabs(rows);
 kpmPage.value=Math.max(1,Math.min(kpmPage.value,Math.ceil(visible.length/KPM_PAGE_SIZE)||1));
 const tableHost=$('#matrixtable');tableHost.innerHTML=kpmTable(visible.slice((kpmPage.value-1)*KPM_PAGE_SIZE,kpmPage.value*KPM_PAGE_SIZE));kpmObserveTableViewport(tableHost);
 for(const th of tableHost.querySelectorAll('th')){const active=[...th.querySelectorAll('[data-kpm-sort]')].some(b=>b.dataset.kpmSort===kpmSort.key);if(th.querySelector('[data-kpm-sort]'))th.setAttribute('aria-sort',!active?'none':kpmSort.direction==='asc'?'ascending':'descending')}
 const pager=$('#matrix-product-pager');pager.innerHTML=listPager(visible.length,kpmPage.value,KPM_PAGE_SIZE);bindListPager(pager,page=>{kpmPage.value=page;kpmRender()});
 const priceHost=section.querySelector('[data-kpm-price-host=main]');
 if(!priceHost.kpmPriceControl)priceHost.kpmPriceControl=kpmMountPriceFilter(priceHost,kpmFilters,()=>{kpmPage.value=1;kpmRender()});
 priceHost.kpmPriceControl.sync();
 pfMultiMount(section.querySelector('.kpm-tools'));decorateModule('matrix');
});}
