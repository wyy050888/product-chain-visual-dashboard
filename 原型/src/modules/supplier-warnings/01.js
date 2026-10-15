

// Four warning views share the canonical risk ledger and its permission scope.
const swTypes=['供应商数量预警','引入延期预警','信息缺失预警','劣质供应商预警'];
const swStatuses=['已注册','意向储备','准入储备','已合作','已淘汰'];
function swSupplierState(r){return r.categoryId===0?({intent:'意向储备',admission:'准入储备',strategic:'已合作'}[r.reserveStage]||r.originalState):r.originalState;}
function swMissing(r){const contract=n=>/合同|协议|意向单|评估表/.test(n);return {fields:(r.missing||[]).filter(n=>!contract(n)),contracts:(r.missing||[]).filter(contract)};}
function swTimeline(r,s,cutoff){
 const date=d=>d&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&d<=cutoff?d:'未完成';
 const intent=s&&s.state!=='已注册'?date(shiftDate(s.date,2)):'未完成',admission=s&&['准入储备','已合作'].includes(s.state)?date(s.admitted):'未完成',cooperation=s?.state==='已合作'?date(s.cooperation):'未完成';
 const stages=['意向储备','准入储备','合作落地'],activeIndex=stages.indexOf(r.stage),activeDate=date(r.actualDate),dates=[intent,admission,cooperation];
 // A later milestone cannot be completed before the delayed prerequisite.
 let previous=null;
 return stages.map((stage,i)=>{const active=i===activeIndex;let actual=active?activeDate:dates[i];
  if(!active&&i>activeIndex&&(activeDate==='未完成'||actual<activeDate||previous==='未完成'))actual='未完成';
  if(!active&&i<activeIndex&&activeDate!=='未完成'&&actual>activeDate)actual='未完成';
  if(actual!=='未完成'&&previous&&previous!=='未完成'&&actual<previous)actual='未完成';
  previous=actual;
  return {stage,name:active||actual!=='未完成'?(s?.name||r.supplier):'—',date:actual,active,target:active?r.targetDate:null,days:active?r.value:0};});
}
function swHeaders(type){return [
 ['采购人员','供应商类型','供应商状态','产品类目','产品项目','预警事项 / 缺口','操作'],
 ['采购人员','产品类目','产品项目','意向储备供应商名称','意向储备完成时间','准入储备供应商名称','验厂完成时间','合作供应商名称','供应商落地确认时间','操作'],
 ['采购人员','供应商名称','供应商类型','供应商状态','缺失必填信息','缺失合同','操作'],
 ['采购人员','供应商名称','供应商类型','供应商状态','星级','操作']
 ][type];}
function swCells(r,ledger,cutoff,plain=false){
 const s=ledger.find(s=>s.key===r.supplierKey),category=r.coreMaterial?r.brand+' / '+r.material:r.categoryPath||chains[r.chain],project=r.projectId!=null?r.project:'未关联项目',state=swSupplierState(r),missing=swMissing(r),action=plain?'':`<button type="button" class="link" data-sw-detail="${esc(r.key)}">查看详情</button> <button type="button" class="link" data-sw-handle="${esc(r.key)}">立即处理</button>`,safe=v=>plain?String(v):esc(String(v)),list=items=>items.length?items.map(safe).join(plain?'、':'<br>'):'—';
 if(r.categoryId===0)return [safe(r.owner),safe(r.supplierType),safe(state),safe(category),sqProjectCell(r,plain),plain?r.name+'：缺 '+r.gap+' 家；已有 '+r.value+' / 目标 '+r.target+' 家':`<span class="tag ${r.level==='高危'?'red':'orange'}">${r.level==='高危'?'红灯':'黄灯'}</span><b>${esc(r.quantityRule||r.name)}</b><small>缺 ${r.gap} 家 · 已有 ${r.value} / 目标 ${r.target} 家</small>`,action];
 if(r.categoryId===1)return [safe(r.owner),safe(category),safe(project),...swTimeline(r,s,cutoff).flatMap(t=>[safe(t.name),plain?t.date+(t.active?'；目标 '+t.target+'；延期 '+t.days+' 天':''):`<span class="${t.active?'red':''}">${t.date}</span>${t.active?`<small>目标 ${t.target}</small><small class="red">延期 ${t.days} 天</small>`:''}`]),action];
 if(r.categoryId===2)return [safe(r.owner),safe(r.supplier),safe(r.supplierType),safe(state),list(missing.fields),list(missing.contracts),action];
 return [safe(r.owner),safe(r.supplier),safe(r.supplierType),safe(state),plain?r.value+' 星':`<b class="red">${r.value} 星</b><small class="red">低于 2 星</small>`,action];
}
function swOpenWarnings({procurement=false,redOnly=false,initialType=0}={}){
 if(svState.role==='other'){toast('当前视角无明细权限');return;}
 const period={...periodFor()},range=bounds(period),ledger=svLedger(),source=(procurement?pbSupplierRisks():svScoped()).filter(r=>!r.closed&&r.categoryId<4&&(!redOnly||r.level==='高危'));
 let type=initialType,page=1,owner='all',kind='all',state='all',query='';
 const run=fn=>{const previous=localPeriods.suppliers,context=svState.context;localPeriods.suppliers={...period};svState.context='director';try{return withPeriod('suppliers',fn)}finally{if(previous)localPeriods.suppliers=previous;else delete localPeriods.suppliers;svState.context=context;}};
 const select=(id,label,values)=>`<label>${label}<select id="${id}"><option value="all">全部</option>${values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select></label>`;
 openModal('供应商预警 · 全部',`<div class="sw-controls"><label>预警类型<select id="sw-type">${swTypes.map((name,i)=>`<option value="${i}" ${i===type?'selected':''}>${name}</option>`).join('')}</select></label>${select('sw-owner','采购人员',[...new Set(source.map(r=>r.owner))])}${select('sw-kind','供应商类型',['整机','物料'])}${select('sw-state','供应商状态',swStatuses)}<label>搜索<input id="sw-query" type="search" placeholder="供应商 / 品类 / 项目"></label></div><div class="sw-count" id="sw-count"></div><div id="sw-table"></div><div id="sw-pages"></div>`,false,periodLabel(period)+' · 截至 '+range.cutoff+(redOnly?' · 高危风险':''));
 $('#dialogsub').textContent=periodLabel(period)+' · '+range.start+' — '+range.cutoff+(redOnly?' · 高危风险':'');
 $('#dialog').classList.add('sw-dialog');
 
 const dispatch=r=>run(()=>{svDispatch(r);const form=$('#sr-dispatch');if(form){const submit=form.onsubmit;form.onsubmit=e=>run(()=>submit(e));}});
 const filtered=()=>source.filter(r=>r.categoryId===type&&(type!==3||r.value<2)&&(owner==='all'||r.owner===owner)&&(kind==='all'||r.supplierType===kind)&&(state==='all'||swSupplierState(r)===state)&&(!query||[r.supplier,r.name,r.quantityRule,r.project,r.categoryPath,r.brand,r.material,chains[r.chain]].join(' ').toLowerCase().includes(query.toLowerCase())));
 const fill=()=>{const rows=filtered(),pages=Math.max(1,Math.ceil(rows.length/DRAWER_PAGE_SIZE));page=Math.min(page,pages);$('#sw-count').textContent=swTypes[type]+' · '+rows.length+' 条'+(type===3?' · 星级＜2星触发预警':'');$('#sw-table').innerHTML=dpTable(swHeaders(type),rows.slice((page-1)*DRAWER_PAGE_SIZE,page*DRAWER_PAGE_SIZE).map(r=>swCells(r,ledger,range.cutoff)));$('#sw-table table').classList.add('sw-table');const heads=swHeaders(type);$$('#sw-table tbody tr').forEach(tr=>[...tr.cells].forEach((td,i)=>td.dataset.label=heads[i]||''));mountListPager($('#sw-pages'),rows.length,page,next=>{page=next;fill()});};
 $('#sw-type').onchange=e=>{type=+e.target.value;page=1;fill()};for(const [id,set] of [['sw-owner',v=>owner=v],['sw-kind',v=>kind=v],['sw-state',v=>state=v]])$('#'+id).onchange=e=>{set(e.target.value);page=1;fill()};$('#sw-query').oninput=e=>{query=e.target.value.trim();page=1;fill()};
 
 $('#sw-table').onclick=e=>{const button=e.target.closest('[data-sw-detail],[data-sw-handle]');if(!button)return;const key=button.dataset.swDetail||button.dataset.swHandle,r=source.find(r=>r.key===key);if(!r||!svPermission(r))return;run(()=>{if(button.dataset.swHandle){if(r.categoryId===0&&r.categoryGroup){scDetail(r.categoryGroup);$('#sc-assign')?.scrollIntoView({block:'start'});}else dispatch(r);}else{svDetail(r);if(r.categoryId!==0||!r.categoryGroup){$('#dialogactions').insertAdjacentHTML('afterbegin','<button class="btn primary small" id="sw-detail-handle">立即处理</button>');$('#sw-detail-handle').onclick=()=>dispatch(r);}if(r.categoryId===1){const cells=swCells(r,ledger,range.cutoff,true);$('#dialogbody').insertAdjacentHTML('afterbegin',svInfo(swHeaders(1).slice(0,-1).map((h,i)=>[h,cells[i]])));}}});};fill();
}
const swPreviousRiskList=pbOpenRiskList;pbOpenRiskList=function(index){if(index!==0)return swPreviousRiskList(index);return swOpenWarnings({procurement:true,initialType:swRankType.procurement});};
const swPreviousMajor=svMajor;svMajor=function(){if(svState.context!=='director')return swPreviousMajor();return swOpenWarnings({redOnly:true,initialType:swRankType.director});};
const swPreviousModal=openModal;openModal=function(...args){$('#dialog').classList.remove('sw-dialog');return swPreviousModal(...args);};

// The rank cards expose the same four-way selector as their full-list modal.
const swRankType={director:0,procurement:0};
function swRankContent(rows,scope){const type=swRankType[scope],filtered=rows.filter(r=>!r.closed&&r.categoryId===type),procurement=scope==='procurement';return `<div class="rhead"><h3><i class="riskbadge"></i>${procurement?'供应商预警':'供应商高危预警'}</h3>${procurement?pbBtn('全部 '+filtered.length+' ›','risk-list',0):svButton('全部 '+filtered.length+' ›','major')}</div><div class="sw-rank-filter"><select aria-label="供应商预警类型" data-sw-rank-type="${scope}">${swTypes.map((name,i)=>`<option value="${i}" ${i===type?'selected':''}>${name}</option>`).join('')}</select></div>${filtered.slice(0,6).map((r,i)=>`<button class="sw-rank-row" ${procurement?`data-pb-action="detail" data-key="${esc(r.key)}"`:`data-sr-action="detail" data-sr-key="${esc(r.key)}"`}><span class="rank ${i<3?'top':''}">${String(i+1).padStart(2,'0')}</span><span class="sw-rank-name" title="${esc(r.name)}">${esc(r.name)}</span><span class="sw-rank-value">${r.categoryId===0?'缺 '+r.gap+' 家':esc(r.metric)}</span></button>`).join('')||'<div class="dp-empty">当前类型暂无预警</div>'}`;}
const swRankPreviousRender=renderRisks;renderRisks=function(){swRankPreviousRender();withPeriod('suppliers',()=>{const card=$('#riskrail .sr-global-risk');if(card)card.innerHTML=swRankContent(svAll().filter(r=>r.level==='高危'&&svPermission(r)),'director');});};
const swRankPreviousProcurement=pbRenderRisk;pbRenderRisk=function(){const root=document.createElement('div');root.innerHTML=swRankPreviousProcurement();const card=root.querySelector('.riskcard');if(card)card.innerHTML=swRankContent(pbSupplierRisks(),'procurement');return root.innerHTML;};pbRenderers.risk=pbRenderRisk;
document.addEventListener('change',e=>{const scope=e.target.dataset.swRankType;if(!scope)return;swRankType[scope]=Number(e.target.value);if(scope==='director')renderRisks();else renderPurchasing();});