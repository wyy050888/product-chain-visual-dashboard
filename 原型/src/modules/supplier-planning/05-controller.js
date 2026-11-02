// 只接管总看板供应链模块；原采购工作台、项目详情和抽屉栈继续复用原入口
renderSuppliers=bindRender('suppliers',scpRender);
function scpRepaint(scope=null){
 const host=$('#suppliergrid'),active=document.activeElement,query=active?.dataset.scpQuery,position=query?active.selectionStart:null;
 let focusSelector='';
 if(active?.hasAttribute('data-scp-project-type'))focusSelector=`[data-scp-project-type="${active.dataset.scpProjectType}"]`;
 if(active?.dataset.scpSort)focusSelector=`[data-scp-sort="${active.dataset.scpSort}"][data-rp-sort="${active.dataset.rpSort}"]`;
 const period=active?.closest('[data-scp-period]');if(period){const field=active.hasAttribute('data-scp-quarter')?'[data-scp-quarter]':active.hasAttribute('data-scp-mode')?`[data-scp-mode="${active.dataset.scpMode}"]`:'[data-scp-year]';focusSelector=`[data-scp-period="${period.dataset.scpPeriod}"] ${field}`}
 const scrollSelector='.scp-card-scroll,.scp-material-scroll';
 const scrolls=[...host.querySelectorAll(scrollSelector)].map(el=>({node:el,left:el.scrollLeft,top:el.scrollTop}));
 renderSuppliers(scope);[...host.querySelectorAll(scrollSelector)].forEach((el,i)=>{
  const saved=scrolls[i];if(!saved||el===saved.node)return;
  // 新节点默认归零；只有真实滚动过的区域需要恢复，避免零值写入也强制布局。
  if(saved.left)el.scrollLeft=saved.left;if(saved.top)el.scrollTop=saved.top;
 });
 if(query){const input=host.querySelector(`[data-scp-query="${query}"]`);input?.focus({preventScroll:true});try{input?.setSelectionRange(position,position)}catch(_){}}
 else if(focusSelector)host.querySelector(focusSelector)?.focus({preventScroll:true});
}
$('#suppliergrid').addEventListener('input',event=>{
 const key=event.target.dataset.scpQuery;if(!key)return;
 scpState[key==='project'?'projectQuery':'categoryQuery']=event.target.value;scpRepaint(key==='project'?'projects':'categories');
});
$('#suppliergrid').addEventListener('change',event=>{
 const container=event.target.closest('[data-scp-period]');if(!container||!event.target.matches('[data-scp-year],[data-scp-quarter]'))return;
 const key=container.dataset.scpPeriod;
 if(key==='resource')scpState.resourceYear=+event.target.value;
 else scpUpdatePeriod(scpState[key==='category'?'categoryPeriod':'materialPeriod'],event.target.hasAttribute('data-scp-quarter')?'quarter':'year',event.target.value);
 scpRepaint(key==='resource'?'resources':key==='category'?'categories':null);
});
$('#suppliergrid').addEventListener('click',event=>{
 if(event.target.closest('.scp-project-link')){event.stopPropagation();toast('打开运营罗盘-供应商管理-引入全流程管理-项目详情页');return}
 const button=event.target.closest('button');if(!button)return;
 if(button.hasAttribute('data-scp-project-type')){scpState.projectType=button.dataset.scpProjectType;scpRepaint('projects');$('#suppliergrid .scp-project-card .scp-card-scroll').scrollTop=0;return}
 if(button.hasAttribute('data-scp-mode')){const key=button.closest('[data-scp-period]').dataset.scpPeriod;scpUpdatePeriod(scpState[key==='category'?'categoryPeriod':'materialPeriod'],'mode',button.dataset.scpMode);scpRepaint(key==='category'?'categories':null);return}
 if(button.hasAttribute('data-scp-material-view')){scpOpenMaterialCategory(button.dataset.scpMaterialView);return}
 if(button.hasAttribute('data-scp-all-categories')){scpOpenCategories();return}
 if(button.hasAttribute('data-scp-coverage')){const scope=JSON.parse(button.dataset.scpCoverage);scpOpenCoverage(scope.brand,scope.material);return}
 else if(button.hasAttribute('data-scp-sort')){rpSortCycle(scpState.sorts[button.dataset.scpSort],button.dataset.rpSort,scpDefaultSort(button.dataset.scpSort));event.stopPropagation()}
 else return;
 scpRepaint(button.dataset.scpSort||null);
});
