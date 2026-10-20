// 只接管总看板供应链模块；原采购工作台、项目详情和抽屉栈继续复用原入口
renderSuppliers=bindRender('suppliers',scpRender);
function scpRepaint(){
 const host=$('#suppliergrid'),active=document.activeElement,query=active?.dataset.scpQuery,position=query?active.selectionStart:null;
 let focusSelector='';
 if(active?.dataset.scpSort)focusSelector=`[data-scp-sort="${active.dataset.scpSort}"][data-rp-sort="${active.dataset.rpSort}"]`;
 else for(const attr of ['data-scp-brand'])if(active?.hasAttribute(attr))focusSelector=`[${attr}="${CSS.escape(active.getAttribute(attr))}"]`;
 if(active?.hasAttribute('data-scp-expand-brands'))focusSelector='[data-scp-expand-brands]';
 const period=active?.closest('[data-scp-period]');if(period){const field=active.hasAttribute('data-scp-quarter')?'[data-scp-quarter]':active.hasAttribute('data-scp-mode')?`[data-scp-mode="${active.dataset.scpMode}"]`:'[data-scp-year]';focusSelector=`[data-scp-period="${period.dataset.scpPeriod}"] ${field}`}
 const scrolls=[...host.querySelectorAll('.scp-card-scroll,.scp-material-scroll')].map(el=>({left:el.scrollLeft,top:el.scrollTop}));
 renderSuppliers();[...host.querySelectorAll('.scp-card-scroll,.scp-material-scroll')].forEach((el,i)=>{el.scrollLeft=scrolls[i]?.left||0;el.scrollTop=scrolls[i]?.top||0});
 if(query){const input=host.querySelector(`[data-scp-query="${query}"]`);input?.focus({preventScroll:true});try{input?.setSelectionRange(position,position)}catch(_){}}
 else if(focusSelector)host.querySelector(focusSelector)?.focus({preventScroll:true});
}
$('#suppliergrid').addEventListener('input',event=>{
 const key=event.target.dataset.scpQuery;if(!key)return;
 scpState[key==='project'?'projectQuery':'categoryQuery']=event.target.value;scpRepaint();
});
$('#suppliergrid').addEventListener('change',event=>{
 const container=event.target.closest('[data-scp-period]');if(!container||!event.target.matches('[data-scp-year],[data-scp-quarter]'))return;
 const key=container.dataset.scpPeriod;
 if(key==='resource')scpState.resourceYear=+event.target.value;
 else scpUpdatePeriod(scpState[key==='category'?'categoryPeriod':'materialPeriod'],event.target.hasAttribute('data-scp-quarter')?'quarter':'year',event.target.value);
 scpRepaint();
});
$('#suppliergrid').addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.hasAttribute('data-scp-mode')){const key=button.closest('[data-scp-period]').dataset.scpPeriod;scpUpdatePeriod(scpState[key==='category'?'categoryPeriod':'materialPeriod'],'mode',button.dataset.scpMode);scpRepaint();return}
 if(button.hasAttribute('data-scp-all-categories')){scpOpenCategories();return}
 if(button.hasAttribute('data-scp-coverage')){const scope=JSON.parse(button.dataset.scpCoverage);scpOpenCoverage(scope.brand,scope.material);return}
 else if(button.hasAttribute('data-scp-brand')){const key=button.dataset.scpBrand;scpState.openBrands.has(key)?scpState.openBrands.delete(key):scpState.openBrands.add(key)}
 else if(button.hasAttribute('data-scp-expand-brands'))scpState.openBrands=new Set(button.dataset.scpExpandBrands==='all'?scpBrands.map(row=>row[0]):[]);
 else if(button.hasAttribute('data-scp-sort')){rpSortCycle(scpState.sorts[button.dataset.scpSort],button.dataset.rpSort);event.stopPropagation()}
 else return;
 scpRepaint();
});
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-scp-members],[data-scp-supplier]');if(!button)return;
 if(button.hasAttribute('data-scp-members'))scpOpenMembers(JSON.parse(button.dataset.scpMembers));
 else scpOpenSupplier(button.dataset.scpSupplier,button.dataset.scpCutoff||DATA_CUTOFF);
});
