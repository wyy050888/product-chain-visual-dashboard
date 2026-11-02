
// Mount a real department tab; preserve all director nodes and their event handlers.
const dpMain=$('main.page'),dpView=document.createElement('div');dpView.id='department-view';dpView.className='dp-view';dpView.hidden=true;dpMain.append(dpView);
const dpDirectorNodes=[...dpMain.children].filter(n=>n!==dpView),dpNavButtons=$$('.head .nav button');
dpNavButtons[1].disabled=false;dpNavButtons[1].removeAttribute('title');dpNavButtons[1].dataset.view='department';dpNavButtons[0].dataset.view='director';
function dpSwitchView(view,hash=true){
 dpState.view=view;dpDirectorNodes.forEach(n=>n.hidden=view==='department');dpView.hidden=view!=='department';
 dpNavButtons.slice(0,2).forEach((n,i)=>{const on=(i===1)===(view==='department');n.classList.toggle('active',on);if(on)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current')});
 if($('.headright .optional'))$('.headright .optional').textContent=view==='department'?'部门经营与执行中心':'公司级经营决策中心';
 if(hash)history.replaceState(null,'',view==='department'?'#department':'#dashboard');
 if(view==='department')renderDepartment();
 // 首次进入时与其他布局统一测量，避免在装饰器处理前强制整页布局；后续切换仍即时回顶。
 if(document.documentElement.dataset.dashboardBoot==='ready')window.scrollTo({top:0,behavior:'instant'});
 else dashboardQueueLayout(document.documentElement,dashboardMeasureResetScroll);
}
dpNavButtons[0].onclick=()=>dpSwitchView('director');dpNavButtons[1].onclick=()=>dpSwitchView('department');
const dpRenderers={risk:dpRenderRisk,ai:dpRenderAI,management:dpRenderManagement,sales:dpRenderSales,projects:dpRenderProjects,lifecycle:dpRenderLifecycle,new:()=>dpRenderProducts(true),matrix:()=>dpRenderProducts(false),inventory:dpRenderInventory};
function renderDepartment(){if(!dpView)return;dpView.innerHTML=`<div class="dp-top-filters"><div class="dp-scope"><label>管理视角<select id="dp-role"><option value="manager" ${dpState.role==='manager'?'selected':''}>部门负责人</option><option value="owner" ${dpState.role==='owner'?'selected':''}>链群负责人</option></select></label><label>链群<select id="dp-scope-chain">${dpState.role==='manager'?'<option value="all">全部链群</option>':''}${chains.map((c,i)=>`<option value="${i}" ${dpState.chain===String(i)?'selected':''}>${c} · ${aiOwners[i]}</option>`).join('')}</select></label><span class="tag orange">演示数据</span></div><div class="dp-controls dp-global-period">${dpPeriodHTML('global')}<button class="link" id="dp-sync-periods">全部同步</button></div></div><nav class="dp-nav"><div class="dp-nav-links">${dpModules.map(([id,_,n])=>`<a href="#dp-${id}">${n}</a>`).join('')}</div><div class="dp-nav-actions"><button class="btn small" id="dp-rules">⚙ 指标口径</button></div></nav>${dpModules.map(([id,title],i)=>`<section id="dp-${id}" class="section dp-section ${id==='ai'?'ai-section':''}"><div class="sectionhead"><div class="titlegroup">${id==='ai'?'<span class="ai-logo" aria-hidden="true"><b>AI</b></span>':''}<h2>${id==='sales'?word(dpP(id))+title:title}</h2></div><div class="dp-controls">${dpPeriodHTML(id)}</div></div>${id==='ai'?'':`<div class="dp-range">${bounds(dpP(id)).start} — ${bounds(dpP(id)).cutoff}${bounds(dpP(id)).partial?' · 周期未结束':''} · ${dpState.chain==='all'?'全部链群':chains[+dpState.chain]}${dpState.periods[id]?' · 独立筛选':''}</div>`}${dpWith(id,()=>dpRenderers[id]())}</section>`).join('')}`;}
document.addEventListener('click',e=>{
 const b=e.target.closest('button,[data-dp-scatter]');if(!b)return;
 const period=b.closest('[data-dp-period]');if(b.hasAttribute('data-dp-mode')){dpChangePeriod(period.dataset.dpPeriod,'mode',b.dataset.dpMode);return}if(b.hasAttribute('data-dp-follow')){delete dpState.periods[b.dataset.dpFollow];renderDepartment();return}
 if(b.dataset.dpTab){dpState.tab[b.dataset.dpTab]=b.dataset.value;dpState.pages={};renderDepartment();return}
 if(b.dataset.dpPage){dpState.pages[b.dataset.dpPage]=(dpState.pages[b.dataset.dpPage]||1)+Number(b.dataset.delta);renderDepartment();return}
 
 if(b.dataset.dpRisk||b.dataset.dpAssign){const key=b.dataset.dpRisk||b.dataset.dpAssign,source=dpRiskCache.get(key);if(source)dpWith(b.dataset.module||'risk',()=>b.dataset.dpAssign?dpDispatch(source):dpOpenRisk(source));return}
 if(b.hasAttribute('data-dp-risk-all')){dpWith('risk',()=>dpRiskAll(+b.dataset.dpRiskAll));return}
 if(b.dataset.dpPerson){dpWith('management',()=>dpPersonDetail(b.dataset.dpPerson));return}
 if(b.dataset.dpDoc){dpDocDetail(b.dataset.dpDoc);return}
 if(b.hasAttribute('data-dp-sales-detail')){dpWith('sales',()=>dpSalesDetail(+b.dataset.dpSalesDetail,b.dataset.dim));return}
 if(b.hasAttribute('data-dp-project')){dpWith('projects',()=>dpOpenProject(+b.dataset.dpProject));return}
 if(b.hasAttribute('data-dp-life-records')){dpWith('lifecycle',()=>dpLifecycleDetail(+b.dataset.dpLifeRecords,b.dataset.scope,b.dataset.channel||'all',b.dataset.chain||'all'));return}
 if(b.hasAttribute('data-dp-chain')){dpState.chain=b.dataset.dpChain;dpState.role='owner';dpState.tab.sales='channel';dpState.tab.inventory='brand';dpState.pages={};renderDepartment();$('#dp-projects').scrollIntoView();return}
 if(b.hasAttribute('data-dp-channel-sales')){dpState.periods.sales={...dpP('lifecycle')};dpState.tab.sales='channel';renderDepartment();dpWith('sales',()=>dpSalesDetail(+b.dataset.dpChannelSales,'channel'));return}
 if(b.dataset.dpProduct){dpProductDetail(b.dataset.dpProduct);return}
 if(b.hasAttribute('data-dp-trend')){dpLegacy(b.dataset.module,b.dataset.module,()=>openNewProductTrends(+b.dataset.dpTrend,false,b.dataset.module));return}
 if(b.hasAttribute('data-dp-scatter')){dpState.tab.matrix=b.dataset.grade;renderDepartment();const row=$(`[data-dp-product="matrix:${b.dataset.dpScatter}"]`);row?.closest('tr')?.scrollIntoView({block:'center'});if(row)row.closest('tr').style.background='#eeedff';return}
 if(b.hasAttribute('data-dp-stock')){dpWith('inventory',()=>dpStockDetail(+b.dataset.dpStock,b.dataset.dim));return}
 if(b.dataset.dpTask){dpTaskDetail(b.dataset.dpTask);return}
 if(b.id==='dp-rules'){dpRules();return}if(b.id==='dp-sync-periods'){dpState.periods={};renderDepartment();return}
 if(b.id==='dp-score-config'){dpWith('management',dpScoreConfig);return}
 if(b.id==='dp-target-config'){const previous=salesDimension;salesDimension=dpState.tab.sales==='brand'?'brand':'chain';try{dpLegacy('sales','sales',openSalesTargets)}finally{salesDimension=previous}return}
 if(b.dataset.dpWorkEdit){dpWith('ai',()=>dpWorkEditor(dpRiskCache.get(b.dataset.dpWorkEdit)));return}
 if(b.id==='dp-new-rules'){dpNewRules();return}
 if(b.id==='dp-audit-log'){openModal('DBS 操作审计',dpTable(['时间','操作人','动作','对象','明细'],dpStore.audit.map(a=>[new Date(a.at).toLocaleString('zh-CN'),a.actor,a.action,esc(a.object),esc(a.detail)])));return}
 
});
document.addEventListener('change',e=>{const b=e.target,period=b.closest('[data-dp-period]');if(b.hasAttribute('data-dp-year')||b.hasAttribute('data-dp-value')){dpChangePeriod(period.dataset.dpPeriod,b.hasAttribute('data-dp-year')?'year':'value',b.value);return}if(b.id==='dp-scope-chain'){dpState.chain=b.value;dpState.pages={};renderDepartment();return}if(b.id==='dp-role'){dpState.role=b.value;if(b.value==='owner'){if(dpState.chain==='all')dpState.chain='0';dpState.tab.sales='channel';dpState.tab.inventory='brand'}else{dpState.tab.sales='chain';dpState.tab.inventory='chain'}dpState.pages={};renderDepartment();return}if(b.dataset.dpFilter){(dpState.filters[b.dataset.dpFilter]??={})[b.dataset.field]=pfControlValue(b);dpState.pages={};renderDepartment();return}if(b.dataset.dpProductSort){(dpState.filters[b.dataset.dpProductSort]??={}).sort=b.value;renderDepartment();return}if(b.hasAttribute('data-dp-project-sort')){(dpState.filters.projects??={}).sort=b.value;renderDepartment();return}});
document.addEventListener('input',e=>{if(e.target.dataset.dpSearch){const input=e.target,id=input.dataset.dpSearch,pos=input.selectionStart;(dpState.filters[id]??={}).search=input.value;dpState.pages[id]=1;renderDepartment();const next=$(`[data-dp-search="${id}"]`);next.focus();next.setSelectionRange(pos,pos)}});
function dpNewRules(){openModal('新品评级目标配置',`<form class="dp-form" id="dp-new-rule-form">${chains.map((name,i)=>`<label>${name}月均销售目标（万元）<input type="number" name="c${i}" value="${dpStore.newTargets[i]}" min="1" max="100000" step="1" required></label>`).join('')}<label>目标利润率（%）<input name="margin" type="number" min="1" max="100" step=".1" required value="${dpStore.marginTarget}"></label><label>调整原因<input name="reason" required minlength="5"></label><p class="dp-notice full">A：月均销售≥品链群标且利润达标；B：月均销售≥品链群标且利润未达标；C：月均销售&lt;品链群标且利润达标；D：月均销售&lt;品链群标且利润未达标。利润率≥目标利润率即为达标，所有新品只归入 ABCD 四类。保存后总看板与产品部采用同一新品等级。</p></form>`);$('#dialogactions').insertAdjacentHTML('afterbegin','<button class="btn primary" type="submit" form="dp-new-rule-form">保存规则</button>');$('#dp-new-rule-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),audit=dpAudit('新品评级规则','品链群标',f.get('reason'));if(dpSave({...dpStore,newTargets:chains.map((_,i)=>+f.get('c'+i)),marginTarget:+f.get('margin'),audit:[audit,...dpStore.audit]})){renderAll();renderDepartment();closeModal()}}}
const dpRenderSalesPrevious=renderSales;renderSales=function(){dpRenderSalesPrevious();if(dpState.view==='department')renderDepartment()};
window.departmentSnapshot=()=>({scope:{chain:dpState.chain,role:dpState.role},periods:dpModules.map(([id])=>({id,...dpP(id)})),sales:dpWith('sales',()=>dpSalesRows('chain')),channels:dpWith('sales',()=>dpSalesRows('channel')),projects:dpWith('projects',()=>dpProjects()),lifecycle:dpWith('lifecycle',()=>lifeNames.map((_,i)=>({summary:lifeSumRows(dpLifeRows(i)),channels:dpLifeChannels(i),records:dpLifeRecords(i,'period',periodFor()).length}))),inventory:dpWith('inventory',()=>inventoryProductSum(inventoryProductLedger().filter(dpInScope))),tasks:JSON.parse(JSON.stringify(dpStore.tasks))});
requestAnimationFrame(()=>{if(location.hash==='#department'||location.hash.startsWith('#dp-'))dpSwitchView('department',false)});
