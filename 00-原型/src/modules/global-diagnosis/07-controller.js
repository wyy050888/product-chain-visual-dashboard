// 分析查看与任务办理共用来源身份；重点建议确认后进入执行单。
function gdRefreshFilters(all=false){if(all)gdState.pages={};else gdState.pages[gdState.part+'|'+gdState.tabs[gdState.part]]=1;gdRender({reuseData:!all})}
document.addEventListener('click',event=>{
 if(event.target.closest('[data-gd-generated]'))return gdOpenGeneratedTasks();
 const target=event.target,part=target.closest('[data-gd-part]'),tab=target.closest('[data-gd-tab]'),status=target.closest('[data-gd-status]');
 if(part){if(!gdParts.some(([key])=>key===part.dataset.gdPart)||gdState.part===part.dataset.gdPart)return;gdState.part=part.dataset.gdPart;gdRender({reuseData:true});return}
 if(tab){
  const part=gdState.part,key=tab.dataset.gdTab;
  if(!gdTabs[part]?.some(([value])=>value===key)||gdState.tabs[part]===key)return;
  gdState.tabs[part]=key;gdRender({reuseData:true});
  requestAnimationFrame(()=>{if(gdState.part===part&&gdState.tabs[part]===key)$('[data-gd-tab="'+key+'"]')?.focus({preventScroll:true})});return;
 }
 const departments=gdState.part==='tasks'?[...new Set([...upTodoDepartments,...gdLedgerValues('department')])]:gdState.part==='execution'?Object.keys(gdReportProfileCatalog):upTodoDepartments;
 for(const [attribute,field,allowed] of [['category','category',gdState.part==='execution'?[]:['all',...(gdState.part==='tasks'?gdLedgerChains:pfCategories)]],['department','department',['all',...departments]],['priority','priority',['all',...Object.keys(upTodoPriorities)]],['report-type','reportType',['all','日报','周报','月报']]]){
  const button=target.closest('[data-gd-'+attribute+']');if(!button)continue;const key=button.getAttribute('data-gd-'+attribute);if(!allowed.includes(key))return;
  gdTableFilters()[field]=key;gdRefreshFilters();$('[data-gd-'+attribute+'="'+key+'"]')?.focus({preventScroll:true});return;
 }
 if(status){
  const key=status.dataset.gdStatus;
  if(gdState.part==='tasks'){if(!['all',...gdStatusOptions().map(([value])=>value)].includes(key))return;gdTableFilters().status=key;gdRefreshFilters();$('[data-gd-status="'+key+'"]')?.focus({preventScroll:true});return}if(!['all',...gdStatusOptions().map(([k])=>k)].includes(key))return;
  const open=status.closest('[data-gd-status-dropdown]')?.open,next=pfToggleChoice(gdTableFilters().status,key),selected=pfSelected(next);
  gdTableFilters().status=!selected.length||selected.length===3?'all':selected;gdRefreshFilters();
  if(open){const dropdown=$('[data-gd-status-dropdown]');dropdown.open=true;dropdown.querySelector('[data-gd-status="'+key+'"]').focus({preventScroll:true})}
  return;
 }
 const sort=target.closest('[data-gd-header-sort]');
 if(sort){const generated=!!sort.closest('.gd-generated-dialog'),filter=generated?gdGeneratedFilters:gdTableFilters(),key=sort.dataset.gdHeaderSort;filter.sortDirection=filter.sort===key?(filter.sortDirection==='asc'?'desc':'asc'):key==='listedAt'?'desc':'asc';filter.sort=key;if(generated)drawerReplace(gdOpenGeneratedTasks);else gdRefreshFilters();return}
 const mode=target.closest('[data-gd-mode]');if(mode){gdChangePeriod('mode',mode.dataset.gdMode);return}
 const button=target.closest('[data-gd-action]');if(!button)return;const row=gdFind(button.dataset.gdId);if(!row)return;
 if(button.dataset.gdAction==='analysis')return gdOpenAnalysis(row,button.dataset.gdTopic||'');
 if(button.dataset.gdAction==='task-detail')return gdOpenTask(row);
 if(button.dataset.gdAction==='task-delete'&&row.task&&!row.task.deletedAt)return upOpenTodoDialog(row.task,'delete',{},gdSyncTodos);
});
function gdSearchChanged(event){
 if(!event.target.matches('[data-gd-search]')||event.isComposing)return;const input=event.target,position=input.selectionStart;gdTableFilters().query=input.value;gdRefreshFilters();const next=$('[data-gd-search]');next.focus({preventScroll:true});next.setSelectionRange(position,position);
}
document.addEventListener('input',gdSearchChanged);
document.addEventListener('compositionend',gdSearchChanged);
document.addEventListener('change',event=>{const input=event.target;if(input.matches('[data-gd-year]'))gdChangePeriod('year',input.value);if(input.matches('[data-gd-value]'))gdChangePeriod('value',input.value)});
document.addEventListener('keydown',event=>{
 const button=event.target.closest('.gd-workspace [role="tab"],.gd-dialog [role="tab"]');if(!button||!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;const buttons=[...button.closest('[role="tablist"]').querySelectorAll('[role="tab"]')],current=buttons.indexOf(button),index=event.key==='Home'?0:event.key==='End'?buttons.length-1:(current+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;event.preventDefault();buttons[index].click();
});
window.globalDiagnosisAudit=()=>{const data=gdRenderedData||gdDataset();return {state:JSON.parse(JSON.stringify(gdState)),range:gdRange(),counts:gdCardCounts(data),sources:data.sources.map(s=>({id:s.id,name:s.name,total:s.rows.length})),work:data.work,deviations:data.deviations,improvements:data.improvements,mismatch:data.mismatch,reports:data.reports,focus:data.focus,tasks:data.tasks,classifications:data.classifications,visible:gdSectionRows(data),tableRows:[],rubrics:gdReportRubrics,rubricProfiles:gdReportProfileCatalog,standards:gdKeyWorkStandards,catalog:{sourceTypes:diagnosisSourceTypes,objectTypes:diagnosisObjectTypes}}};
