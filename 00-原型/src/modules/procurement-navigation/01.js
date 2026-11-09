

// Mount procurement beside the existing director and product workspaces.
const pbRenderers={risk:pbRenderRisk,ai:pbRenderAI,management:pbRenderManagement,suppliers:pbRenderSuppliers,selection:pbRenderSelection,lifecycle:pbRenderLifecycle,channels:pbRenderChannels,tasks:pbRenderTasks};
pbState.tabs.process='supplier';pbState.tabs.document='0';pbState.tabs.selectionGran='month';
const pbLedgerOriginal=pbSupplierLedger,pbLedgerCache=new Map();pbSupplierLedger=function(){const key=periodKey();if(!pbLedgerCache.has(key))pbLedgerCache.set(key,pbLedgerOriginal());return pbLedgerCache.get(key)};
pbView=document.createElement('div');pbView.id='purchasing-view';pbView.className='dp-view pb-view';pbView.hidden=true;dpMain.appendChild(pbView);
function renderPurchasing(){
 const scope=`<div class="dp-top-filters"><div class="dp-scope"><label>管理视角<select id="pb-role"><option value="manager" ${pbState.role==='manager'?'selected':''}>采购部部长</option><option value="owner" ${pbState.role==='owner'?'selected':''}>产品链主</option></select></label><label>品类<select id="pb-chain">${pbState.role==='manager'?'<option value="all">全部品类</option>':''}${chains.map((n,i)=>`<option value="${i}" ${String(i)===pbState.chain?'selected':''}>${n}</option>`).join('')}</select></label><label>供应商类型<select id="pb-tier"><option value="all">全部类型</option>${['整机供应商','物料供应商'].map((n,i)=>`<option value="${i}" ${pbState.tier===String(i)?'selected':''}>${n}</option>`).join('')}</select></label><label>责任采购<select id="pb-owner"><option value="all">全部人员</option>${pbPeople.filter((n,i)=>pbState.chain==='all'||i%4===+pbState.chain).map(n=>`<option ${n===pbState.owner?'selected':''}>${n}</option>`).join('')}</select></label></div><div class="dp-controls">${pbPeriodHTML('global')}${pbBtn('全部同步','sync','all')}</div></div>`;
 pbView.innerHTML=scope+`<nav class="dp-nav pb-nav" aria-label="采购部模块"><div class="dp-nav-links">${pbModules.map(([id,title,label])=>`<a href="#pb-${id}">${label}${id==='tasks'?` <span class="dp-task-count">${pbStore.tasks.filter(pbScope).filter(t=>t.state!=='已验收').length}</span>`:''}</a>`).join('')}</div><div class="dp-nav-actions">${pbBtn('⚙ 指标口径','rules','all','btn small')}</div></nav>`+pbModules.map(([id,title],i)=>`<section class="section dp-section" id="pb-${id}" data-pb-section="${id}"><div class="sectionhead"><div class="titlegroup"><span class="${id==='ai'?'ai-logo':'dp-number'}">${id==='ai'?'<b>AI</b>':String(i+1).padStart(2,'0')}</span><h2>${title}</h2></div>${pbPeriodHTML(id)}</div>${id==='ai'?'':`<div class="dp-range">${periodLabel(pbPeriod(id))} · 截至 ${bounds(pbPeriod(id)).cutoff}${['lifecycle','channels'].includes(id)?' · 品类范围':''}</div>`}<div class="pb-content">${pbWith(id,pbRenderers[id])}</div></section>`).join('');
 if(pbObserver)pbObserver.disconnect();pbObserver=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);if(visible.length)pbView.querySelectorAll('.pb-nav a').forEach(a=>a.classList.toggle('active',a.hash==='#'+visible[0].target.id))},{rootMargin:'-80px 0px -65% 0px'});pbView.querySelectorAll('.dp-section').forEach(n=>pbObserver.observe(n));
}
let pbObserver=null;
const pbPreviousSwitch=dpSwitchView;dpSwitchView=function(view,hash=true){pbView.hidden=true;dpNavButtons[5].classList.remove('active');dpNavButtons[5].removeAttribute('aria-current');pbPreviousSwitch(view,hash)};
function pbSwitchView(hash=true){pbPreviousSwitch('director',false);dpDirectorNodes.forEach(n=>n.hidden=true);dpView.hidden=true;pbView.hidden=false;dpState.view='procurement';dpNavButtons.forEach((n,i)=>{n.classList.toggle('active',i===5);if(i===5)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current')});if($('.headright .optional'))$('.headright .optional').textContent='采购经营与协同中心';if(hash)history.replaceState(null,'','#procurement');renderPurchasing();window.scrollTo({top:0,behavior:'instant'})}
dpNavButtons[5].disabled=false;dpNavButtons[5].removeAttribute('title');dpNavButtons[5].onclick=()=>pbSwitchView();
function pbChangePeriod(id,field,value){const p={...pbPeriod(id)};if(field==='mode'){const m=p.mode==='quarter'?(p.value-1)*3+1:p.mode==='month'?p.value:1;p.mode=value;p.value=value==='quarter'?Math.ceil(m/3):value==='month'?m:1}else p[field]=+value;const max=dashboardPeriodLimit(p);p.value=p.mode==='year'?1:Math.max(1,Math.min(p.value,max));if(id==='global'){pbState.global=p;pbState.periods={}}else pbState.periods[id]=p;pbState.pages={};renderPurchasing()}
function pbSupplierSet(rows,title='供应商明细'){pbModalList(title,rows,['供应商 / 编码','供应商类型','品类','等级 / 星级','合作状态','责任采购','创建日期','操作'],pbSupplierCells)}
function pbCurrentSuppliers(){const t=pbState.tabs.suppliers,s=pbState.tabs.supplierStatus;return pbSuppliers().filter(r=>(!['machine','material'].includes(t)||r.kind===(t==='machine'?0:1))&&(s==='all'||r.state===s))}
function pbSampleSet(rows,title='选品明细'){pbModalList(title,rows,['产品 / 型号','供应商','品类','责任采购','当前节点','运营部门','到样日期','操作'],r=>[pbProduct(r),r.supplier,chains[r.chain],r.owner,pbStages[r.stage],r.ops,r.date,pbActions(r)])}
function pbRiskSet(rows,title='采购风险明细'){pbModalList(title,rows,['风险','事项 / 产品','品类','责任采购','核心指标','卡点原因','操作'],r=>[pbTag(r),esc(r.name),chains[r.chain],r.owner,r.metric||'—',esc(r.issue),pbActions(r)])}
function pbProjectOpen(id){const old=localPeriods.projects;localPeriods.projects={...pbPeriod(pbModalSection)};try{projectDetail(+id)}finally{if(old)localPeriods.projects=old;else delete localPeriods.projects}}

document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const section=b.closest('[data-pb-section]');if(section)pbModalSection=section.dataset.pbSection;
 if(b.hasAttribute('data-pb-mode'))return pbChangePeriod(b.closest('[data-pb-period]').dataset.pbPeriod,'mode',b.dataset.pbMode);
 if(b.dataset.pbTab){pbState.tabs[b.dataset.pbTab]=b.dataset.value;pbState.pages={};renderPurchasing();return}
 if(b.dataset.pbAiTab){pbWith('ai',()=>pbOpenAI(b.dataset.pbAiTab));return}if(b.dataset.pbAiRange){pbState.aiRange=b.dataset.pbAiRange;pbWith('ai',()=>pbOpenAI(pbState.aiTab));return}
 const action=b.dataset.pbAction,key=b.dataset.key;if(!action||b.classList.contains('pb-disabled'))return;pbWith(pbModalSection,()=>{const r=pbCache.get(periodKey()+'|'+key);
 switch(action){
 case 'page':{const [id,page]=key.split('|');pbState.pages[id]=+page;renderPurchasing();break}
 case 'sync':pbState.periods={};pbState.pages={};renderPurchasing();toast('全部采购模块已同步当前周期');break;
 case 'rules':pbRules();break;case 'risk-list':pbOpenRiskList(+key);break;
 case 'detail':pbDetails(r);break;case 'dispatch':pbDispatch(r);break;case 'task':pbTaskDetail(key);break;
 case 'person':pbPerson(r);break;case 'supplier':pbSupplierDetail(key);break;case 'project':pbProjectOpen(key);break;
 case 'ai':pbModalSection='ai';pbWith('ai',()=>pbOpenAI(key));break;
 case 'ai-page':pbState.pages['ai-'+pbState.aiTab+'-'+pbState.aiRange]=+key;pbOpenAI(pbState.aiTab);$('#dialogbody').scrollTop=0;break;
 case 'ai-refresh':pbOpenAI(pbState.aiTab);toast('已根据当前业务台账重新生成诊断');break;
 case 'ai-add':pbEditAI();break;case 'ai-edit':pbEditAI(r);break;case 'ai-remove':pbRemoveAI(r);break;
 
 case 'targets':pbTargets(key);break;
 case 'supplier-type':pbSupplierSet(pbSuppliers().filter(r=>key==='all'||r.kind===(key==='machine'?0:1)),key==='all'?'全部供应商':key==='machine'?'整机供应商':'物料供应商');break;
 case 'supplier-state':pbSupplierSet(pbSuppliers().filter(r=>r.state===key),key+'供应商');break;
 case 'supplier-filter':{const [kind,grade]=key.split('|');pbSupplierSet(pbSuppliers().filter(r=>r.kind===+kind&&r.grade===grade),grade+'级供应商');break}
 case 'supplier-current':pbSupplierSet(pbCurrentSuppliers().filter(r=>key==='new'?r.date>=bounds().start:key==='low'?r.stars<2&&r.state!=='已淘汰':true));break;
 case 'supplier-star':case 'supplier-chain':case 'supplier-owner':{const rows=section?.dataset.pbSection==='suppliers'&&['machine','material'].includes(pbState.tabs.suppliers)?pbCurrentSuppliers():pbSuppliers();pbSupplierSet(rows.filter(r=>action==='supplier-star'?r.stars===parseInt(key):action==='supplier-chain'?chains[r.chain]===key:r.owner===key),key+' · 供应商明细');break}
 case 'supplier-products':{const s=pbSupplierLedger().find(r=>r.key===key);pbModalList('合作产品 · '+s.name,productRows(false).filter(r=>r.chain===s.chain).slice(0,8),['产品 / 型号','品类','品牌','供应商'],r=>[pbProduct(r),chains[r.chain],r.brand,s.name]);break}
 case 'supplier-orders':pbRiskSet(pbOrders().filter(r=>r.supplierKey===key),'供应商历史订单');break;
 case 'supplier-risks':pbRiskSet(pbSupplierRisks().filter(r=>r.supplierKey===key),'供应商全部风险记录');break;
 case 'selection-stage':pbState.tabs.stage=String(key);pbSampleSet(pbStageRows(+key),pbStages[+key]+'产品明细');break;
 case 'sample-owner':case 'sample-chain':case 'sample-supplier':case 'sample-ops':pbSampleSet(pbStageRows(+pbState.tabs.stage).filter(r=>action==='sample-owner'?r.owner===key:action==='sample-chain'?chains[r.chain]===key:action==='sample-supplier'?r.supplierState===key:r.ops===key),key+' · 选品明细');break;
 case 'life-stage':pbState.tabs.lifecycle=String(key);renderPurchasing();break;case 'life-detail':pbLifeDetail(key);break;
 case 'channel-detail':pbModal(dpChannelNames[+key]+' · 采购交付',dpTable(['规划类型','周期目标','周期完成','完成率','年度目标','年度完成'],[0,1,2,3,4,6].map(i=>{const d=pbLifeChannels(i)[+key];return[lifeNames[i],d.target,pbBtn(d.actual+'','life-detail',i+'|period|'+key+'|all'),pbPct(d.actual,d.target),d.yearTarget,pbBtn(d.yearActual+'','life-detail',i+'|year|'+key+'|all')]})));break;
 case 'scope':pbState.role='owner';pbState.chain=key;pbState.owner='all';pbState.pages={};renderPurchasing();$('#pb-lifecycle').scrollIntoView({block:'start'});break;
 case 'tasks':pbState.tabs.tasks=key;pbOpenTaskRecords();break;
 case 'modal-set':if(key==='people')pbModalList('采购人员与评分',pbScores(),['姓名 / 岗位','品类','AI得分','状态','任务闭环率','关键问题','过程问题','操作'],pbScoreCells);else pbRiskSet(key==='projects'?pbProjectRows():pbRiskLists(true)[6],key==='projects'?'采购责任项目':'工作过程偏差');break;
 }
 });
});
document.addEventListener('change',e=>{const b=e.target;if(b.hasAttribute('data-pb-year')||b.hasAttribute('data-pb-value')){pbChangePeriod(b.closest('[data-pb-period]').dataset.pbPeriod,b.hasAttribute('data-pb-year')?'year':'value',b.value);return}if(b.dataset.pbFilter){(pbState.filters[b.dataset.pbFilter]??={})[b.dataset.field]=b.value;pbState.pages={};renderPurchasing();return}if(!['pb-role','pb-chain','pb-tier','pb-owner'].includes(b.id))return;pbState[b.id.slice(3)]=b.value;if(pbState.role==='owner'&&pbState.chain==='all')pbState.chain='0';if(b.id!=='pb-owner')pbState.owner='all';pbState.pages={};renderPurchasing()});