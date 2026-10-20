function gdRefreshFilters(all=false){if(all)gdState.pages={};else for(const key of Object.keys(gdState.pages)){if(key.startsWith(gdState.part+'|')&&(gdState.part!=='execution'||key===gdState.part+'|'+gdState.tabs.execution))gdState.pages[key]=1}gdRender()}
document.addEventListener('click',event=>{
 const target=event.target,part=target.closest('[data-gd-part]'),tab=target.closest('[data-gd-tab]'),mode=target.closest('[data-gd-mode]');
 if(part){gdState.part=part.dataset.gdPart;gdRender();$(`[data-gd-part="${gdState.part}"]`).focus({preventScroll:true});return}
 if(tab){gdState.tabs[gdState.part]=tab.dataset.gdTab;gdRender();$(`[data-gd-tab="${tab.dataset.gdTab}"]`).focus({preventScroll:true});return}
 if(mode){gdChangePeriod('mode',mode.dataset.gdMode);return}
 if(target.closest('[data-gd-reset]')){gdState.filters[gdFilterKey()]=gdFilterDefaults();gdRefreshFilters();return}
 const button=target.closest('[data-gd-action]');if(!button)return;
 const row=gdFind(button.dataset.gdId);if(!row)return;const action=button.dataset.gdAction;
 if(action==='evidence')return gdOpenEvidence(row);
 if(action==='task'||action==='task-detail')return gdOpenTask(row);
});
document.addEventListener('input',event=>{
 if(!event.target.matches('[data-gd-search]'))return;
 const input=event.target,position=input.selectionStart;gdTableFilters().query=input.value;gdRefreshFilters();const next=$('[data-gd-search]');next.focus({preventScroll:true});next.setSelectionRange(position,position);
});
document.addEventListener('change',event=>{
 const input=event.target;
 if(input.matches('[data-gd-filter]')){gdTableFilters()[input.dataset.gdFilter]=pfControlValue(input);gdRefreshFilters()}
 if(input.matches('[data-gd-issue-type]')){gdTableFilters().issueType=pfControlValue(input);gdRefreshFilters()}
 if(input.matches('[data-gd-status]')){gdTableFilters().status=input.value;gdRefreshFilters()}
 if(input.matches('[data-gd-report-type]')){gdTableFilters().reportType=input.value;gdRefreshFilters()}
 if(input.matches('[data-gd-sort]')){gdTableFilters().sort=input.value;gdRefreshFilters()}
 if(input.matches('[data-gd-year]'))gdChangePeriod('year',input.value);
 if(input.matches('[data-gd-value]'))gdChangePeriod('value',input.value);
});
document.addEventListener('keydown',event=>{
 const button=event.target.closest('.gd-workspace [role="tab"],.gd-dialog [role="tab"]');if(!button||!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
 const buttons=[...button.closest('[role="tablist"]').querySelectorAll('[role="tab"]')],current=buttons.indexOf(button),index=event.key==='Home'?0:event.key==='End'?buttons.length-1:(current+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;event.preventDefault();buttons[index].click();
});
window.globalDiagnosisAudit=()=>{const data=gdDataset();return {state:JSON.parse(JSON.stringify(gdState)),range:gdRange(),counts:gdCardCounts(data),issueTypes:gdIssueTypes,sources:data.sources.map(s=>({id:s.id,name:s.name,range:s.range,metrics:s.metrics,total:s.rows.length})),reports:data.reports,focus:data.focus,coordination:data.coordination,resource:data.resource,tasks:data.tasks,visible:gdSectionRows(data)}};
