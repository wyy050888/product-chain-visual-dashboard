

// Render the director lifecycle component in an isolated, temporary DOM scope.
// Keep the original nodes, event handlers, selected view and period untouched.
const pdlState={stage:0,view:'chain'};
function pdlWith(fn){const oldPeriod=localPeriods.lifecycle,oldStage=lifeIndex,oldView=lifeView;localPeriods.lifecycle={...pbPeriod('lifecycle')};lifeIndex=pdlState.stage;lifeView=pdlState.view;try{return withPeriod('lifecycle',fn);}finally{if(oldPeriod)localPeriods.lifecycle=oldPeriod;else delete localPeriods.lifecycle;lifeIndex=oldStage;lifeView=oldView;}}
function pdlRender(){const original=$('#lifecycle'),clone=original.cloneNode(true);clone.hidden=true;original.replaceWith(clone);try{return pdlWith(()=>{renderLife();clone.querySelector('.sectionhead')?.remove();clone.querySelector('.module-timebar')?.remove();clone.querySelectorAll('[id]').forEach(n=>n.id='pdl-'+n.id);clone.querySelectorAll('[data-life]').forEach(n=>{n.dataset.pdlStage=n.dataset.life;n.removeAttribute('data-life')});clone.querySelectorAll('[data-view]').forEach(n=>{n.dataset.pdlView=n.dataset.view;n.classList.toggle('active',n.dataset.view===pdlState.view);n.removeAttribute('data-view')});clone.querySelectorAll('[data-life-completed]').forEach(n=>{n.dataset.pdlCompleted=n.dataset.lifeCompleted;n.removeAttribute('data-life-completed')});return clone.innerHTML;});}finally{clone.replaceWith(original);}}
pbRenderLifecycle=pdlRender;pbRenderers.lifecycle=pbRenderLifecycle;
document.addEventListener('click',e=>{const stage=e.target.closest('[data-pdl-stage]'),view=e.target.closest('[data-pdl-view]'),detail=e.target.closest('[data-pdl-completed]');if(stage){pdlState.stage=+stage.dataset.pdlStage;renderPurchasing();}if(view){pdlState.view=view.dataset.pdlView;renderPurchasing();}if(detail){pbModalSection='lifecycle';pdlWith(()=>openLifecycleProducts(detail.dataset.pdlCompleted,detail.dataset.lifeDimension,+detail.dataset.lifeRow));}});
const pdpState={status:'all',page:1,chain:'全部',type:'全部',query:'',department:'采购部',departmentPage:1,departmentScope:''};
pbModules.splice(pbModules.findIndex(m=>m[0]==='lifecycle'),0,['projects','项目红绿灯全景管控','项目全景']);moduleNames['pb-projects']='项目红绿灯全景管控';
function pdpWith(fn){const oldPeriod=localPeriods.projects,saved={status:projectStatus,page:projectPage,department:projectDepartment,departmentPage,departmentScope};localPeriods.projects={...pbPeriod('projects')};projectStatus=pdpState.status;projectPage=pdpState.page;projectDepartment=pdpState.department;departmentPage=pdpState.departmentPage;departmentScope=pdpState.departmentScope;
 try{return withPeriod('projects',fn);}finally{if(oldPeriod)localPeriods.projects=oldPeriod;else delete localPeriods.projects;projectStatus=saved.status;projectPage=saved.page;projectDepartment=saved.department;departmentPage=saved.departmentPage;departmentScope=saved.departmentScope;}}
function pdpRender(){const original=$('#projects'),clone=original.cloneNode(true);clone.hidden=true;original.replaceWith(clone);try{return pdpWith(()=>{
 $('#projectchain').value=pdpState.chain;$('#projecttype').value=pdpState.type;$('#projectsearch').value=pdpState.query;renderProjects();pdpState.page=projectPage;pdpState.departmentPage=departmentPage;pdpState.departmentScope=departmentScope;
 const head=clone.querySelector('.sectionhead'),filters=clone.querySelector('.module-timebar .unified-filter-extras')||head.querySelector('.inline');if(filters){filters.classList.add('pdp-filters');head.after(filters);}head.remove();clone.querySelector('.module-timebar')?.remove();
 clone.querySelectorAll('[id]').forEach(n=>n.id='pdp-'+n.id);
 for(const attr of ['status','page','dept-inline','department-page','project'])clone.querySelectorAll('[data-'+attr+']').forEach(n=>{n.setAttribute('data-pdp-'+attr,n.getAttribute('data-'+attr));n.removeAttribute('data-'+attr)});
 clone.querySelectorAll('[aria-controls="department-attribution"]').forEach(n=>n.setAttribute('aria-controls','pdp-department-attribution'));
 const output=clone.cloneNode(true);output.querySelector('#pdp-projectchain').querySelectorAll('option').forEach(n=>n.toggleAttribute('selected',n.value===pdpState.chain));output.querySelector('#pdp-projecttype').querySelectorAll('option').forEach(n=>n.toggleAttribute('selected',n.value===pdpState.type));output.querySelector('#pdp-projectsearch').setAttribute('value',pdpState.query);return output.innerHTML;
 });}finally{clone.replaceWith(original);}}
pbRenderers.projects=pdpRender;
function pdpRefresh(){const body=$('#pb-projects .pb-content');if(body)body.innerHTML=pbWith('projects',pdpRender);}
document.addEventListener('click',e=>{const b=e.target.closest('[data-pdp-status],[data-pdp-page],[data-pdp-dept-inline],[data-pdp-department-page],[data-pdp-project]');if(!b||b.disabled)return;
 if(b.hasAttribute('data-pdp-project')){pbModalSection='projects';return pdpWith(()=>projectDetail(+b.dataset.pdpProject));}
 if(b.hasAttribute('data-pdp-status')){pdpState.status=b.dataset.pdpStatus;pdpState.page=1;}if(b.hasAttribute('data-pdp-page'))pdpState.page=+b.dataset.pdpPage;if(b.hasAttribute('data-pdp-dept-inline')){pdpState.department=b.dataset.pdpDeptInline;pdpState.departmentPage=1;}if(b.hasAttribute('data-pdp-department-page'))pdpState.departmentPage=+b.dataset.pdpDepartmentPage;pdpRefresh();
});
document.addEventListener('change',e=>{if(e.target.id==='pdp-projectchain'||e.target.id==='pdp-projecttype'){pdpState[e.target.id==='pdp-projectchain'?'chain':'type']=e.target.value;pdpState.page=1;pdpRefresh();}});
document.addEventListener('input',e=>{if(e.target.id==='pdp-projectsearch'){const position=e.target.selectionStart;pdpState.query=e.target.value;pdpState.page=1;pdpRefresh();const input=$('#pdp-projectsearch');input.focus({preventScroll:true});input.setSelectionRange(position,position);}});

// Reuse the director components while keeping procurement selections and periods isolated.
for(let i=pbModules.length-1;i>=0;i--)if(['channels','tasks'].includes(pbModules[i][0]))pbModules.splice(i,1);
pbModules.splice(pbModules.findIndex(m=>m[0]==='projects'),0,['new','新品专项管控','新品专项']);
pbModules.push(['matrix','关键产品管控','关键产品']);
const ppTrailingModules=['suppliers','selection'].map(id=>pbModules.splice(pbModules.findIndex(m=>m[0]===id),1)[0]);
pbModules.splice(pbModules.findIndex(m=>m[0]==='matrix')+1,0,...ppTrailingModules);
moduleNames['pb-new']='新品专项管控';moduleNames['pb-matrix']='关键产品管控';
const ppStates={new:{chain:'全部',metric:'all',channel:'all',page:1,key:''},matrix:{grade:'B',page:1,key:''}};
let ppModalScope=null,ppDepth=0;
function ppPeriod(module,period,fn){const previous=localPeriods[module];localPeriods[module]={...period};ppDepth++;try{return withPeriod(module,fn)}finally{ppDepth--;if(previous)localPeriods[module]=previous;else delete localPeriods[module]}}
function ppRender(module){
 const original=$('#'+module),clone=original.cloneNode(true),prefix=module==='new'?'pnp-':'pmx-',state=ppStates[module],savedNew={...newProductSelection},savedMatrix={...matrixProductPage},savedGrade=matrixTab;
 clone.hidden=true;original.replaceWith(clone);
 try{return ppPeriod(module,pbPeriod(module),()=>{
  if(module==='new'){$('#newchain').value=state.chain;Object.assign(newProductSelection,{metric:state.metric,channel:state.channel,page:state.page,key:state.key});renderNew();Object.assign(state,newProductSelection)}else{matrixTab=state.grade;Object.assign(matrixProductPage,{page:state.page,key:state.key});renderMatrix();Object.assign(state,matrixProductPage)}
  const head=clone.querySelector('.sectionhead'),toolbar=document.createElement('div');toolbar.className='pp-toolbar';
  const tag=head.querySelector('.tag');if(tag)toolbar.append(tag);
  const filters=head.querySelector('.inline');if(filters)toolbar.append(filters);
  const rules=head.querySelector('[data-rules]');if(rules)toolbar.append(rules);
  // 移除公司时间栏前保留其中的业务筛选，采购页继续使用独立时间。
  const extraFilters=clone.querySelector('.module-timebar .unified-filter-extras');
  if(extraFilters)toolbar.append(extraFilters);
  head.replaceWith(toolbar);clone.querySelector('.module-timebar')?.remove();
  for(const attr of ['new-metric','new-channel','new-reset','product-page','page','product','new-trend','matrix','matrix-trend','matrix-diagnosis','rules'])clone.querySelectorAll('[data-'+attr+']').forEach(n=>{n.setAttribute('data-pp-'+attr,n.getAttribute('data-'+attr));n.removeAttribute('data-'+attr)});
  clone.querySelectorAll('[id]').forEach(n=>n.id=prefix+n.id);
  if(module==='new')clone.querySelector('#pnp-newchain').querySelectorAll('option').forEach(n=>n.toggleAttribute('selected',n.value===state.chain));
  return clone.innerHTML;
 });}finally{Object.assign(newProductSelection,savedNew);Object.assign(matrixProductPage,savedMatrix);matrixTab=savedGrade;clone.replaceWith(original)}
}
pbRenderers.new=()=>ppRender('new');pbRenderers.matrix=()=>ppRender('matrix');
function ppRefresh(module){const body=$('#pb-'+module+' .pb-content');if(body)body.innerHTML=pbWith(module,()=>ppRender(module))}
function ppOpen(module,fn){ppModalScope={module,period:{...pbPeriod(module)}};return ppPeriod(module,ppModalScope.period,fn)}
// Modal continuations (all products -> trend -> back) retain their originating period.
const ppOriginalModal=openModal;
openModal=function(...args){if(!ppDepth)ppModalScope=null;return ppOriginalModal(...args)};
function ppContinue(module,fn){return ppModalScope?.module===module&&dpState.view==='procurement'?ppPeriod(module,ppModalScope.period,fn):fn()}
const ppAllNew=openAllNewProducts,ppTrend=openNewProductTrends,ppProductDetail=productDetail;
openAllNewProducts=function(...args){return ppContinue('new',()=>ppAllNew(...args))};
openNewProductTrends=function(id,fromAll=false,module='new'){return ppContinue(module,()=>ppTrend(id,fromAll,module))};
productDetail=function(isNew,...args){return ppContinue(isNew?'new':'matrix',()=>ppProductDetail(isNew,...args))};
document.addEventListener('click',e=>{
 const section=e.target.closest('#pb-new,#pb-matrix');if(!section)return;const module=section.dataset.pbSection,state=ppStates[module];
 const b=e.target.closest('[data-pp-new-metric],[data-pp-new-channel],[data-pp-new-reset],[data-pp-product-page],[data-pp-product],[data-pp-new-trend],[data-pp-matrix],[data-pp-matrix-trend],[data-pp-matrix-diagnosis],[data-pp-rules],#pnp-newall');if(!b||b.disabled)return;
 if(b.id==='pnp-newall')return ppOpen(module,()=>openAllNewProducts());
 if(b.hasAttribute('data-pp-rules'))return ppOpen(module,showRules);
 if(b.dataset.ppProduct){const [kind,id]=b.dataset.ppProduct.split(',');return ppOpen(module,()=>productDetail(kind==='new',id))}
 if(b.dataset.ppNewTrend||b.dataset.ppMatrixTrend)return ppOpen(module,()=>openNewProductTrends(b.dataset.ppNewTrend||b.dataset.ppMatrixTrend,false,module));
 if(b.dataset.ppMatrixDiagnosis)return ppOpen(module,()=>openMatrixDiagnosis(b.dataset.ppMatrixDiagnosis));
 if(b.dataset.ppProductPage)state.page=+b.dataset.ppPage;
 else if(module==='new'){state.metric=b.dataset.ppNewMetric||'all';state.channel=b.dataset.ppNewChannel??'all';state.page=1}
 else{state.grade=b.dataset.ppMatrix;state.page=1}
 ppRefresh(module);
});
document.addEventListener('change',e=>{if(e.target.id==='pnp-newchain'){ppStates.new.chain=e.target.value;ppRefresh('new')}});
document.addEventListener('keydown',e=>{const b=e.target.closest('[data-pp-new-channel]');if(b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();b.dispatchEvent(new MouseEvent('click',{bubbles:true}))}});