

// Shared launch facts keep KPI numerators and drilled product lists identical.
function newLaunchFacts(rows){
 const b=bounds();
 return rows.map(p=>{const actualLaunch=shiftDate(b.cutoff,1-p.days),plannedLaunch=shiftDate(actualLaunch,[0,-5,2,0,-3,1][p.id%6]),inPlan=plannedLaunch>=b.start&&plannedLaunch<=b.end,onTime=inPlan&&actualLaunch<=plannedLaunch&&actualLaunch<=b.cutoff;return {...p,actualLaunch,plannedLaunch,inPlan,onTime,salesSuccess:onTime&&p.sales>0}});
}
function newMetricsForRows(rows){const facts=newLaunchFacts(rows);return {planned:facts.filter(p=>p.inPlan).length,ontime:facts.filter(p=>p.onTime).length,sold:facts.filter(p=>p.salesSuccess).length}}
newMetrics=function(){return newMetricsForRows(newList())};
dpNewMetrics=function(chain=dpState.chain){return newMetricsForRows(productRows(true).filter(r=>chain==='all'||r.chain===+chain))};
const newProductSelection={metric:'all',channel:'all',page:1,key:''};
function productPager(page,total,kind,size=5){return listPager(total,page,size,{attr:'data-page',extra:{'data-product-page':kind}})}
function newSelectionLabel(metric,channel){return metric==='sold'?'按期上线且产生有效销售的产品':metric==='ontime'?'按期上线的产品':channel!=='all'?channels[+channel]+'渠道产品':'全部新品'}
function newMetricButton(key,title,n,denominator,active,scope='director'){
 return `<button type="button" class="newmetric new-linked-metric ${active===key?'selected':''}" data-new-metric="${key}" data-scope="${scope}" aria-pressed="${active===key}"><span>${title}</span><strong class="num">${denominator?fmt(n/denominator*100,1):'—'}<span class="unit">${denominator?'%':''}</span></strong><small class="muted">${key==='sold'?'按期上线且有销售':'按期完成'} ${n} / ${key==='sold'?'本期计划':'应上线项目'} ${denominator}</small></button>`;
}
function newChannelChart(rows,selected='all',scope='director'){
 const totals=channels.map(ch=>rows.filter(p=>p.channel===ch).reduce((a,p)=>a+p.sales,0)),max=Math.max(1,...totals);
 return `<svg class="new-channel-chart" viewBox="0 0 360 150" role="group" aria-label="各渠道新品${word()}销售额，单位万元">${totals.map((n,i)=>`<g tabindex="0" role="button" data-new-channel="${i}" data-scope="${scope}" aria-pressed="${String(i)===selected}" aria-label="${channels[i]}，${pfMoneyYuan((n)*10000)}，点击查看产品"><rect x="${i*44+6}" y="0" width="42" height="150" rx="5" fill="${String(i)===selected?'#eeedff':'transparent'}"/><rect x="${i*44+16}" y="${112-n/max*80}" width="21" height="${Math.max(2,n/max*80)}" rx="3" fill="${String(i)===selected?'#6961f5':'#98a2fa'}"/><text x="${i*44+26}" y="${104-n/max*80}" text-anchor="middle">${fmt(n,1)}</text><text x="${i*44+26}" y="137" text-anchor="middle">${channels[i]}</text><title>${channels[i]} · ${pfMoneyYuan((n)*10000)} · ${rows.filter(p=>p.channel===channels[i]).length} 个</title></g>`).join('')}</svg>`;
}
function newLinkedRows(rows,metric,channel){return newLaunchFacts(rows).filter(p=>(metric==='all'||(metric==='sold'?p.salesSuccess:p.onTime))&&(channel==='all'||p.channel===channels[+channel]))}
// 新品主表由独立视图维护；旧全部新品弹窗仅保留给部门兼容入口。
renderNew=function(){withPeriod('new',nspRender)};
$('#newchain').onchange=()=>renderNew();
const allNewProductsState={chain:'all',channel:'all',page:1,key:''};
function openAllNewProducts(reset=true){withPeriod('new',()=>{
 const state=allNewProductsState,key=periodKey()+':'+bounds().cutoff;
 if(reset||state.key!==key)Object.assign(state,{chain:'all',channel:'all',page:1,key});
 const all=newLaunchFacts(productRows(true)),periodWord=word(),periodBounds=bounds(),headers=['产品名称','上线天数','所属品类 / 渠道','计划上线日期','实际上线日期',periodWord+'销售额','单品利润率','总退货率','销售状态','产品等级','操作'];
 openModal('新品专项管控 · 全部新品',`<div class="new-all-filters"><label>所属品类<select multiple data-pf-multiple id="new-all-chain" aria-label="全部新品所属品类"><option value="all">全部品类</option>${chains.map((name,i)=>`<option value="${i}" ${pfOptionSelected(state.chain,i)?'selected':''}>${name}</option>`).join('')}</select></label><label>渠道<select id="new-all-channel" aria-label="全部新品渠道"><option value="all">全部渠道</option>${channels.map((name,i)=>`<option value="${i}" ${state.channel===String(i)?'selected':''}>${name}</option>`).join('')}</select></label><button class="link" id="new-all-reset">重置筛选</button><span id="new-all-count" aria-live="polite"></span></div><div class="new-all-table" id="new-all-products-table"></div><div id="new-all-pager"></div>`,false,'当前新品模块统计周期内的全部新品');
 
 const productFilters=pfDefaults();pfMount($('.new-all-filters'),productFilters,()=>{state.page=1;fill()},['brand','attribute','productType']);const filtered=()=>all.filter(p=>pfMatches(p,productFilters)&&pfIncludes(state.chain,p.chain)&&(state.channel==='all'||p.channel===channels[+state.channel]));
 function fill(){const rows=filtered(),pages=Math.max(1,Math.ceil(rows.length/DRAWER_PAGE_SIZE));state.page=Math.max(1,Math.min(state.page,pages));$('#new-all-count').textContent=`筛选 ${rows.length} / 全部 ${all.length} 个新品`;
  $('#new-all-products-table').innerHTML=rows.length?table(headers,rows.slice((state.page-1)*DRAWER_PAGE_SIZE,state.page*DRAWER_PAGE_SIZE).map(p=>[titleProduct(p),p.days+' 天',chains[p.chain]+'<small>'+p.channel+'</small>',p.plannedLaunch,p.actualLaunch,fmt(p.sales,1)+' 万',fmt(p.profit,1)+'%',fmt(p.returnRate,1)+'%',`<span class="tag ${p.state==='整改'?'orange':'green'}">${p.state}</span>`,`<span class="tag">${dpLabel(p.grade)}</span>`,`<div class="new-all-actions"><button class="link" data-new-all-action="ai" data-id="${p.id}">✧ AI 新品评估</button><button class="link" data-new-all-action="trend" data-id="${p.id}">趋势图</button></div>`])):'<div class="dp-empty">当前品类和渠道下暂无新品，请调整筛选条件。<button class="link" id="new-all-empty-reset">重置筛选</button></div>';
  $('#new-all-pager').innerHTML=`${listPager(rows.length,state.page,DRAWER_PAGE_SIZE,{attr:"data-new-all-page"})}`;
  $('#new-all-empty-reset')?.addEventListener('click',resetFilters);
 }
 function resetFilters(){Object.assign(productFilters,pfDefaults());for(const s of $$('.new-all-filters [data-pf-filter]'))pfControlSet(s,'all');pfAttributeSync($('.new-all-filters'));state.chain='all';state.channel='all';state.page=1;pfControlSet($('#new-all-chain'),'all');$('#new-all-channel').value='all';fill()}
 for(const [id,field]of[['new-all-chain','chain'],['new-all-channel','channel']])$('#'+id).onchange=e=>{state[field]=pfControlValue(e.target);state.page=1;fill()};
 $('#new-all-reset').onclick=resetFilters;
 $('#new-all-pager').onclick=e=>{const button=e.target.closest('[data-new-all-page]');if(button&&!button.disabled){state.page=+button.dataset.newAllPage;fill()}};
 $('#new-all-products-table').onclick=e=>{const button=e.target.closest('[data-new-all-action]');if(!button)return;e.stopPropagation();if(button.dataset.newAllAction==='trend')openNewProductTrends(button.dataset.id,true);else{productDetail(true,button.dataset.id);$('#dialogactions').insertAdjacentHTML('afterbegin','<button class="btn small" id="new-all-back">返回新品列表</button>');$('#new-all-back').onclick=()=>openAllNewProducts(false)}};
 
 fill();
})}
$('#newall').onclick=()=>openAllNewProducts();
const MATRIX_PRODUCT_PAGE_SIZE=9;
const matrixProductPage={page:1,key:''};
const renderMatrixBeforePagination=renderMatrix;
renderMatrix=function(){renderMatrixBeforePagination();withPeriod('matrix',()=>{
 const state=matrixProductPage,key=periodKey()+':'+matrixTab;if(state.key!==key){state.key=key;state.page=1}
 const rows=productRows(false).filter(p=>category(p)===matrixTab).sort((a,b)=>b.sales-a.sales);state.page=Math.min(Math.max(1,state.page),Math.max(1,Math.ceil(rows.length/MATRIX_PRODUCT_PAGE_SIZE)));
 $('#matrixtable').innerHTML=rows.length?table(['产品 / 品牌','渠道','近30天销售额','单品利润率','总退货率','操作'],rows.slice((state.page-1)*MATRIX_PRODUCT_PAGE_SIZE,state.page*MATRIX_PRODUCT_PAGE_SIZE).map(p=>[titleProduct(p),esc(p.channel),fmt(p.sales,1)+' 万',`<span class="${p.profit<config.profit?'orange':'green'}">${fmt(p.profit,1)}%</span>`,fmt(p.returnRate,1)+'%',`<button class="link" data-product="old,${p.id}">AI 策略</button><button class="link" data-matrix-trend="${p.id}">趋势图</button><button class="link" data-matrix-diagnosis="${p.id}">✧ AI 诊断</button>`])):'<div class="dp-empty">该类别暂无产品</div>';
 let pager=$('#matrix-product-pager');if(!pager){pager=document.createElement('div');pager.id='matrix-product-pager';$('#matrixtable').after(pager)}pager.innerHTML=productPager(state.page,rows.length,'matrix',MATRIX_PRODUCT_PAGE_SIZE);
 $('#matrix .matrixlist>.note').textContent='按销售额排序展示当前类别全部产品；ABCD 四类覆盖全部关键产品。';
})};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-new-metric],[data-new-channel],[data-new-reset],[data-product-page]');if(!b)return;
 if(b.dataset.productPage){const state=b.dataset.productPage==='new'?newProductSelection:matrixProductPage;state.page=+b.dataset.page;(b.dataset.productPage==='new'?renderNew:renderMatrix)();return}
 const scope=b.dataset.scope||b.dataset.newReset;
 if(b.dataset.newMetric==='ontime'){if(scope==='department')dpWith('new',()=>nspOpenDeliveryProjects(nspDepartmentDeliverySummary()));else withPeriod('new',()=>nspOpenDeliveryProjects());return}
 if(scope==='department'){
  const f=dpState.filters.new??={};f.metric=b.dataset.newMetric||'all';f.channel=b.dataset.newChannel??'all';dpState.pages.new=1;renderDepartment();$('#dp-new .dp-table')?.scrollIntoView({block:'nearest',behavior:'smooth'});
 }else{newProductSelection.metric=b.dataset.newMetric||'all';newProductSelection.channel=b.dataset.newChannel??'all';newProductSelection.page=1;renderNew();$('#newtable').scrollIntoView({block:'nearest',behavior:'smooth'})}
});
document.addEventListener('keydown',e=>{const b=e.target.closest('[data-new-channel]');if(b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();b.dispatchEvent(new MouseEvent('click',{bubbles:true}))}});

function mountEvidencePages(records){let page=1;const host=$('#dp-person-evidence'),pages=Math.max(1,Math.ceil(records.length/DRAWER_PAGE_SIZE));const render=()=>{host.innerHTML=records.length?dpTable(['记录','日期','扣分原因','操作'],records.slice((page-1)*DRAWER_PAGE_SIZE,page*DRAWER_PAGE_SIZE).map(d=>[esc(d.title),d.date,esc(d.issue),`<button class="link" data-dp-doc="${d.id}">查看依据</button>`])):'<div class="dp-empty">当前周期无扣分记录</div>';host.insertAdjacentHTML('beforeend',`${listPager(records.length,page,DRAWER_PAGE_SIZE,{attr:"data-evidence-page"})}`)};host.addEventListener('click',e=>{const b=e.target.closest('[data-evidence-page]');if(b){page=Math.max(1,Math.min(pages,+b.dataset.evidencePage));render()}});render()}