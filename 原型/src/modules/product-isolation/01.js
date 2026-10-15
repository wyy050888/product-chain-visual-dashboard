

// Product department shares director components, with independent UI state.
const dxModuleOrder=['risk','ai','management','sales','new','projects','lifecycle','matrix','inventory'];
const dxModuleTitles={risk:'产品中心高危预警榜单 TOP6',ai:'产品中心AI 全局智能诊断',management:'产品部全局管理'};
dpModules.sort((a,b)=>dxModuleOrder.indexOf(a[0])-dxModuleOrder.indexOf(b[0]));
for(const m of dpModules)if(dxModuleTitles[m[0]])m[1]=m[2]=dxModuleTitles[m[0]];
let dxSalesIndex=0;
const dxStates={new:{chain:'全部',metric:'all',channel:'all',page:1,key:''},matrix:{grade:'B',page:1,key:''},lifecycle:{stage:0,view:'chain'}};
const dxAI={...aiView,department:'产品部',chain:'全部',owner:'全部',kind:'block',reportType:'all',finding:'all'};
let dxScope='all',dxModal=null,dxDepth=0,dxRendering=false;
function dxSyncScope(){if(dxScope===dpState.chain)return;dxScope=dpState.chain;dxStates.new.chain=dxScope==='all'?'全部':dxScope;dxStates.new.key='';dxAI.chain=dxScope==='all'?'全部':chains[+dxScope];dxAI.owner='全部';}
function dxWith(module,fn,period=dpP(module),chain=dpState.chain){
 const oldSalesDimension=salesDimension,oldActiveSales=activeSales,oldSalesView=salesView;
 if(module==='sales')salesDimension='chain';
 const oldPeriod=localPeriods[module],oldProducts=productRows,oldLifeData=lifeData,oldChannels=lifeChannelRows,oldIndex=lifeIndex,oldView=lifeView,oldMatrix=matrixTab,savedNew={...newProductSelection},savedPage={...matrixProductPage},savedAI={...aiView};
 localPeriods[module]={...period};dxDepth++;
 if(chain!=='all'){productRows=isNew=>oldProducts(isNew).filter(r=>r.chain===+chain);if(module==='lifecycle'&&dxRendering){lifeData=stage=>lifeSumRows([lifeChainRows(stage)[+chain]],chains[+chain]);lifeChannelRows=(stage,p=periodFor())=>[lifeSumRows([lifeChainRows(stage,p)[+chain]],chains[+chain])];}}
 if(module==='new')Object.assign(newProductSelection,{metric:dxStates.new.metric,channel:dxStates.new.channel,page:dxStates.new.page,key:dxStates.new.key});
 if(module==='matrix'){matrixTab=dxStates.matrix.grade;Object.assign(matrixProductPage,{page:dxStates.matrix.page,key:dxStates.matrix.key})}
 if(module==='lifecycle'){lifeIndex=dxStates.lifecycle.stage;lifeView=dxStates.lifecycle.view}
 if(module==='ai')Object.assign(aiView,dxAI);
 try{return withPeriod(module,fn)}finally{salesDimension=oldSalesDimension;activeSales=oldActiveSales;salesView=oldSalesView;dxDepth--;productRows=oldProducts;lifeData=oldLifeData;lifeChannelRows=oldChannels;lifeIndex=oldIndex;lifeView=oldView;matrixTab=oldMatrix;Object.assign(newProductSelection,savedNew);Object.assign(matrixProductPage,savedPage);Object.assign(aiView,savedAI);if(oldPeriod)localPeriods[module]=oldPeriod;else delete localPeriods[module];}
}
const dxAttrs=['ai-daymode','sales','new-metric','new-channel','new-reset','product-page','page','product','new-trend','matrix','matrix-trend','matrix-diagnosis','rules','life','view','life-completed','ai-kind','ai-period','ai-detail','ai-handle','report-type'];
function dxRender(module){dxSyncScope();const original=$('#'+module),clone=original.cloneNode(true);clone.hidden=true;original.replaceWith(clone);dxRendering=true;
 try{return dxWith(module,()=>{
  if(module==='new'){$('#newchain').value=dxStates.new.chain;renderNew();Object.assign(dxStates.new,newProductSelection)}
  if(module==='matrix'){renderMatrix();Object.assign(dxStates.matrix,matrixProductPage)}
  if(module==='lifecycle'){renderLife();clone.querySelectorAll('[data-view]').forEach(n=>n.classList.toggle('active',n.dataset.view===dxStates.lifecycle.view));if(dpState.chain!=='all')clone.querySelectorAll('#lifetable tbody tr').forEach((n,i)=>{if(dxStates.lifecycle.view==='chain'&&i!==+dpState.chain)n.remove()})}
  if(module==='ai')renderInlineAI();
  if(module==='sales'){
   dpRenderSalesPrevious();clone.querySelector('.salescard.company')?.remove();clone.querySelector('.sales-brand-disclosure')?.remove();
   if(dpState.chain!=='all'){
    clone.querySelectorAll('.salescard').forEach((n,i)=>{if(i!==+dpState.chain)n.remove()});
    clone.querySelectorAll('#saleschart [data-sales]').forEach(n=>{if(+n.dataset.sales!==+dpState.chain)n.remove()});
    clone.querySelectorAll('#attainchart .barrow').forEach((n,i)=>{if(i!==+dpState.chain)n.remove()});
   }
  }
  const head=clone.querySelector('.sectionhead'),toolbar=document.createElement('div');toolbar.className='dx-toolbar';
  for(const node of [head.querySelector('.tag'),head.querySelector('.inline'),head.querySelector('[data-rules]'),head.querySelector('#refreshai'),head.querySelector('#sales-config')])if(node)toolbar.append(node);
  head.replaceWith(toolbar);clone.querySelector('.module-timebar')?.remove();
  // Select value properties are not serialized by innerHTML.
  clone.querySelectorAll('select').forEach(select=>{const selected=new Set([...select.selectedOptions]);select.querySelectorAll('option').forEach(n=>n.toggleAttribute('selected',selected.has(n)))});
  const ids=new Map([...clone.querySelectorAll('[id]')].map(n=>[n.id,'dx-'+n.id]));clone.querySelectorAll('[id]').forEach(n=>n.id=ids.get(n.id));
  for(const attr of dxAttrs)clone.querySelectorAll('[data-'+attr+']').forEach(n=>{n.setAttribute('data-dx-'+attr,n.getAttribute('data-'+attr));n.removeAttribute('data-'+attr)});
  for(const attr of ['aria-controls','aria-labelledby','for'])clone.querySelectorAll('['+attr+']').forEach(n=>n.setAttribute(attr,n.getAttribute(attr).split(' ').map(v=>ids.get(v)||v).join(' ')));
  return `<div class="dx-content" data-dx-module="${module}">${clone.innerHTML}</div>`;
 });}finally{clone.replaceWith(original);dxRendering=false;}
}
for(const module of ['sales','new','matrix','lifecycle','ai'])dpRenderers[module]=()=>dxRender(module);
function dxRefresh(module){const host=$('#dp-'+module+' .dx-content');if(host)host.outerHTML=dxRender(module)}
const dxRenderDepartment=renderDepartment;
renderDepartment=function(){dxRenderDepartment();$('#dp-ai .sectionhead>.dp-controls')?.remove()};
function dxSalesDetail(index,view){dxSalesIndex=index;return dxOpen('sales',()=>{
 salesDetail(index,view);$('#dialogbody').querySelectorAll('[data-salesview]').forEach(n=>{n.dataset.dxSalesview=n.dataset.salesview;delete n.dataset.salesview});
})}
document.addEventListener('click',e=>{const b=e.target.closest('[data-dx-salesview]');if(b)dxSalesDetail(dxSalesIndex,b.dataset.dxSalesview)});
const dxOriginalModal=openModal;
openModal=function(...args){if(!dxDepth)dxModal=null;return dxOriginalModal(...args)};
function dxOpen(module,fn){dxModal={module,period:{...dpP(module)},chain:dpState.chain};return dxWith(module,fn,dxModal.period,dxModal.chain)}
function dxContinue(module,fn){return dxModal?.module===module&&dpState.view==='department'?dxWith(module,fn,dxModal.period,dxModal.chain):fn()}
const dxAllNew=openAllNewProducts,dxTrend=openNewProductTrends,dxProduct=productDetail;
openAllNewProducts=function(...args){return dxContinue('new',()=>dxAllNew(...args))};
openNewProductTrends=function(id,fromAll=false,module='new'){return dxContinue(module,()=>dxTrend(id,fromAll,module))};
productDetail=function(isNew,...args){return dxContinue(isNew?'new':'matrix',()=>dxProduct(isNew,...args))};
const dxRenderAI=renderInlineAI;
renderInlineAI=function(){dxRenderAI();if(!dxRendering&&dpState.view==='department')dxRefresh('ai')};renderAI=renderInlineAI;
document.addEventListener('click',e=>{
 const root=e.target.closest('[data-dx-module]');if(!root)return;const module=root.dataset.dxModule,s=dxStates[module],b=e.target.closest('button,[data-dx-sales],[data-dx-product],[data-dx-new-channel]');if(!b||b.disabled)return;
 if(b.hasAttribute('data-dx-sales'))return dxSalesDetail(+b.dataset.dxSales);
 if(b.id==='dx-sales-config')return dxOpen('sales',openSalesTargets);
 if(b.id==='dx-newall')return dxOpen('new',()=>openAllNewProducts());
 if(b.hasAttribute('data-dx-product')){const [kind,id]=b.dataset.dxProduct.split(',');return dxOpen(module,()=>productDetail(kind==='new',id))}
 if(b.hasAttribute('data-dx-new-trend')||b.hasAttribute('data-dx-matrix-trend'))return dxOpen(module,()=>openNewProductTrends(b.dataset.dxNewTrend||b.dataset.dxMatrixTrend,false,module));
 if(b.hasAttribute('data-dx-matrix-diagnosis'))return dxOpen(module,()=>openMatrixDiagnosis(b.dataset.dxMatrixDiagnosis));
 if(b.hasAttribute('data-dx-rules'))return dxOpen(module,showRules);
 if(b.hasAttribute('data-dx-life-completed'))return dxOpen(module,()=>openLifecycleProducts(b.dataset.dxLifeCompleted,dpState.chain!=='all'?'chain':b.dataset.lifeDimension,dpState.chain!=='all'?+dpState.chain:+b.dataset.lifeRow));
 if(b.hasAttribute('data-dx-ai-detail'))return dxOpen('ai',()=>openAIRecord(b.dataset.dxAiDetail));
 if(b.hasAttribute('data-dx-ai-handle'))return dxOpen('ai',()=>openAIHandle(b.dataset.dxAiHandle));
 let changed=true;
 if(b.dataset.dxProductPage)s.page=+b.dataset.dxPage;
 else if(b.dataset.dxNewMetric||b.dataset.dxNewChannel||b.dataset.dxNewReset){s.metric=b.dataset.dxNewMetric||'all';s.channel=b.dataset.dxNewChannel??'all';s.page=1}
 else if(b.dataset.dxMatrix){s.grade=b.dataset.dxMatrix;s.page=1}
 else if(b.hasAttribute('data-dx-life'))s.stage=+b.dataset.dxLife;
 else if(b.dataset.dxView)s.view=b.dataset.dxView;
 else if(b.dataset.dxAiPeriod)dxAI.mode=b.dataset.dxAiPeriod;
 else if(b.dataset.dxAiDaymode)dxAI.dayMode=b.dataset.dxAiDaymode;
 else if(b.dataset.dxAiKind)dxAI.kind=b.dataset.dxAiKind;
 else if(b.dataset.dxReportType)dxAI.reportType=b.dataset.dxReportType;
 else if(b.id==='dx-ai-reset'){dxAI.chain=dpState.chain==='all'?'全部':chains[+dpState.chain];dxAI.department=dpDepartmentName();dxAI.owner='全部';dxAI.reportType=dxAI.finding='all'}
 else if(b.id==='dx-refreshai')toast('已刷新当前筛选下的演示诊断');
 else changed=false;
 if(changed)dxRefresh(module);
});
document.addEventListener('change',e=>{const b=e.target,module=b.closest('[data-dx-module]')?.dataset.dxModule;if(!module)return;
 if(b.id==='dx-newchain')dxStates.new.chain=b.value;
 else if(['dx-ai-chain','dx-ai-department','dx-ai-owner'].includes(b.id))dxAI[b.id.slice(6)]=pfControlValue(b);
 else if(b.id==='dx-deviation-result-filter')dxAI.finding=b.value;
 else if(b.id==='dx-ai-date'||b.id==='dx-ai-month'){if(!b.checkValidity()||!b.value){toast('请选择演示数据范围内的有效日期');dxRefresh('ai');return}if(b.id==='dx-ai-date'){dxAI.date=b.value;dxAI.month=b.value.slice(0,7)}else{dxAI.month=b.value;dxAI.date=b.value===aiCutoff.slice(0,7)?aiCutoff:b.value+'-01'}}
 else return;dxRefresh(module);
});
document.addEventListener('keydown',e=>{const b=e.target.closest('[data-dx-new-channel]');if(b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();b.dispatchEvent(new MouseEvent('click',{bubbles:true}))}});



