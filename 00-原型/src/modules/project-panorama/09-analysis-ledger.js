// 部门台账完整内嵌，筛选状态不与其他风险入口共享。
const ppAnalysisState={department:ppDepartments[0],mode:'all',page:1,sort:{key:'deadline',direction:'asc'},filters:{query:'',light:[],rectificationStatus:[],verificationStatus:[]}};
function ppAnalysisPageSize(){return listPageSize('pp-analysis')}
function ppAnalysisSelection(rows,department=ppAnalysisState.department,mode=ppAnalysisState.mode){
 const facts=ppAnalysisDepartment(rows,department),group=facts.top.find(item=>item.key===mode);
 const light=({red:'红灯',yellow:'黄灯'})[mode];
 const records=group?group.records:light?facts.activeRecords.filter(entry=>entry.project.status===light):facts.records;
 // 全局条件改变后，已不存在的根因回到全部台账。
 if(department===ppAnalysisState.department&&mode===ppAnalysisState.mode&&!group&&!light&&mode!=='all'){ppAnalysisState.mode='all';ppAnalysisState.page=1}
 return {facts,group,records};
}
function ppAnalysisLedgerRows(selection){return ppRiskSorted(ppRiskFiltered(selection.records,ppAnalysisState.filters,ppAnalysisRiskLights),ppAnalysisState.sort)}
function ppAnalysisLedger(selection){
 const records=ppAnalysisLedgerRows(selection);
 ppAnalysisState.page=Math.max(1,Math.min(ppAnalysisState.page,Math.max(1,Math.ceil(records.length/ppAnalysisPageSize()))));
 const offset=(ppAnalysisState.page-1)*ppAnalysisPageSize(),visible=records.slice(offset,offset+ppAnalysisPageSize());
 return `<div class="pp-analysis-ledger-scroll" tabindex="0" aria-label="部门风险台账，可横向滚动">${ppRiskTableMarkup(visible,ppAnalysisState.sort,{start:offset,sortAttribute:'data-pp-analysis-sort',rowAttribute:'data-pp-analysis-row',emptyText:selection.records.length?'暂无符合条件的风险记录':'暂无相关记录'})}</div>`;
}
function ppAnalysisPager(selection){
 return listPager(ppAnalysisLedgerRows(selection).length,ppAnalysisState.page,ppAnalysisPageSize(),{sizeKey:'pp-analysis',attr:'data-pp-analysis-page'});
}
function ppMountAnalysisFilters(){pfMultiMount($('#pp-analysis-filters'))}
function ppQueryAnalysisLedger(reset=false){
 const form=$('#pp-analysis-filters');if(!form)return;
 if(reset){form.reset();form.querySelector('[name="query"]').value='';for(const select of form.querySelectorAll('select[multiple]'))pfControlSet(select,[])}
 const fields=new FormData(form);
 ppAnalysisState.filters={query:String(fields.get('query')||'').trim(),...Object.fromEntries(['light','rectificationStatus','verificationStatus'].map(key=>[key,pfSelected(fields.getAll(key))]))};
 ppAnalysisState.page=1;ppRefreshAnalysisLedger('',true);
}
function ppSelectAnalysis(department,mode='all',focus=''){
 Object.assign(ppAnalysisState,{department,mode,page:1,sort:{key:'deadline',direction:'asc'},filters:ppRiskEmptyFilters()});
 withPeriod('projects',()=>{$('#pp-ai').innerHTML=ppAI(ppAnalysisRows());ppMountAnalysisFilters()});
 if(focus)$('#pp-ai '+focus)?.focus({preventScroll:true});
}
function ppRefreshAnalysisLedger(focus='',resetScroll=false){
 const container=$('#pp-analysis-ledger-results'),scroll=container?.querySelector('.pp-analysis-ledger-scroll')?.scrollLeft||0;
 if(!container)return;
 withPeriod('projects',()=>{const selection=ppAnalysisSelection(ppAnalysisRows());container.innerHTML=ppAnalysisLedger(selection);$('#pp-analysis-pages').innerHTML=ppAnalysisPager(selection)});
 container.querySelector('.pp-analysis-ledger-scroll').scrollLeft=scroll;if(resetScroll)container.querySelector('.pp-analysis-ledger-scroll').scrollTop=0;
 if(focus)$('#pp-analysis-panel').querySelector(focus)?.focus({preventScroll:true});
}
document.addEventListener('click',event=>{
 const button=event.target.closest('#pp-ai button');if(!button)return;
 const data=button.dataset;
 if(data.ppAnalysisDepartment){ppSelectAnalysis(data.ppAnalysisDepartment,'all','[data-pp-analysis-department="'+data.ppAnalysisDepartment+'"]');return}
 if(button.hasAttribute('data-pp-analysis-reset')){ppQueryAnalysisLedger(true);return}
 if(data.ppAnalysisPage){ppAnalysisState.page=Number(data.ppAnalysisPage);ppRefreshAnalysisLedger('[aria-current="page"]');return}
 if(data.ppAnalysisSort){const key=data.ppAnalysisSort;ppAnalysisState.sort={key,direction:ppAnalysisState.sort.key===key&&ppAnalysisState.sort.direction==='asc'?'desc':'asc'};ppAnalysisState.page=1;ppRefreshAnalysisLedger('[data-pp-analysis-sort="'+key+'"]');return}

});
document.addEventListener('submit',event=>{if(event.target.matches('#pp-analysis-filters')){event.preventDefault();ppQueryAnalysisLedger()}});
document.addEventListener('input',event=>{if(event.target.matches('#pp-analysis-filters input[name="query"]'))ppQueryAnalysisLedger()});
document.addEventListener('change',event=>{if(event.target.matches('#pp-analysis-filters select'))ppQueryAnalysisLedger()});

document.addEventListener('keydown',event=>{
 const tab=event.target.closest('#pp-ai [role="tab"]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 event.preventDefault();event.stopPropagation();
 const current=ppDepartments.indexOf(tab.dataset.ppAnalysisDepartment),count=ppDepartments.length,index=event.key==='Home'?0:event.key==='End'?count-1:(current+(event.key==='ArrowRight'?1:count-1))%count,name=ppDepartments[index];
 ppSelectAnalysis(name,'all','[data-pp-analysis-department="'+name+'"]');
});
window.projectAnalysisAudit=()=>withPeriod('projects',()=>{const selection=ppAnalysisSelection(ppAnalysisRows());return {state:{...ppAnalysisState},pageSize:ppAnalysisPageSize(),...selection,filteredRecords:ppAnalysisLedgerRows(selection)}});
