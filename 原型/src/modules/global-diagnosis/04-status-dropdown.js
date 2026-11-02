// 重点工作保留多选下拉；任务清单以单选状态页签呈现，复用同一状态与计数规则。
function gdTaskStatusTabs(base,filter){
 const selected=pfSelected(filter.status),current=selected.length===1?selected[0]:'all';
 const options=[['all','全部任务'],...gdStatusOptions()];
 return `<div class="tabs gd-scope-tabs gd-task-status-tabs" role="tablist" aria-label="任务状态">${options.map(([key,label])=>{
  const count=base.filter(row=>gdAnalysisMatches(row,{...filter,status:key})).length,active=key===current;
  return `<button type="button" role="tab" data-gd-status="${key}"  aria-selected="${active}" class="${active?'active':''}">${label}<span>${count}</span></button>`;
 }).join('')}</div>`;
}
function gdTaskStatusDropdown(base,filter){
 const options=[['all','全部'],...gdStatusOptions()],selected=pfSelected(filter.status);
 const label=selected.length?options.filter(([key])=>selected.includes(key)).map(([,text])=>text).join('、'):'全部';
 const count=key=>base.filter(row=>gdAnalysisMatches(row,{...filter,status:key})).length;
 return `<details class="gd-status-dropdown" data-gd-status-dropdown><summary aria-label="任务状态：${esc(label)}"><span class="gd-status-caption">任务状态</span><span class="gd-status-value">${esc(label)}</span><span class="gd-status-arrow" aria-hidden="true"></span></summary><div class="gd-status-menu gd-filter-options" role="group" aria-label="任务状态选项">${options.map(([key,text])=>{
  const active=key==='all'?!selected.length:selected.includes(key);
  return `<button type="button" data-gd-status="${key}" class="gd-filter-option ${active?'active':''}" aria-pressed="${active}"><span class="gd-status-check" aria-hidden="true">${active?'✓':''}</span><span>${text}</span>${key==='all'?'':`<span class="gd-filter-count">${count(key)}</span>`}</button>`;
 }).join('')}</div></details>`;
}
document.addEventListener('click',event=>{
 for(const dropdown of document.querySelectorAll('[data-gd-status-dropdown][open]'))if(!dropdown.contains(event.target))dropdown.open=false;
});
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape')return;
 const dropdown=document.querySelector('[data-gd-status-dropdown][open]');if(!dropdown)return;
 dropdown.open=false;dropdown.querySelector('summary').focus({preventScroll:true});event.preventDefault();event.stopImmediatePropagation();
},true);
