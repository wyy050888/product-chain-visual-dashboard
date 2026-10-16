function ppAnalysisButton(department,mode,label,body='',className=''){
 return `<button type="button" class="${className}" data-pp-analysis="${esc(department)}" data-mode="${esc(mode)}">${label}${body}</button>`;
}
const ppAnalysisHelp={
 scope:'基于当前筛选范围内的未闭环风险单统计。',
 metrics:[
  {label:'红灯项目',description:'风险单的责任部门包含该部门的红灯项目数。'},
  {label:'高危项目',description:'上述红灯项目中，延期天数＞15天的项目数。'},
  {label:'红灯风险占比',numerator:'该部门红灯风险单数',denominator:'红灯风险单总数',description:'分子为责任部门包含该部门的红灯风险单数。'}
 ],
 note:'各部门独立统计，同一项目或风险单可关联多个部门。'
};
function ppAnalysisHelpText(){
 return [ppAnalysisHelp.scope,...ppAnalysisHelp.metrics.map(item=>item.label+'：'+item.description+(item.numerator?item.numerator+' ÷ '+item.denominator+' ×100%。':'')),ppAnalysisHelp.note].join('\n\n');
}
// 指标定义由部门分析维护，复用统一浮层的定位与键盘交互。
function renderProjectAnalysisTooltip(container){
 const append=(parent,tag,text,className='')=>{
  const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;parent.append(node);return node;
 };
 const heading=append(container,'header','','pp-analysis-tip-heading');
 append(heading,'h4','指标统计口径');
 append(heading,'p',ppAnalysisHelp.scope);
 const list=append(container,'div','','pp-analysis-tip-metrics');
 for(const item of ppAnalysisHelp.metrics){
  const section=append(list,'section','','pp-analysis-tip-metric');
  const title=append(section,'div','','pp-analysis-tip-label');
  append(title,'h5',item.label);
  if(item.numerator){
   const formula=append(section,'div','','pp-analysis-tip-formula');
   const fraction=append(formula,'span','','pp-analysis-tip-fraction');
   append(fraction,'span',item.numerator);append(fraction,'span',item.denominator);
   append(formula,'span','× 100%');
  }
  append(section,'p',item.description);
 }
 append(container,'footer',ppAnalysisHelp.note,'pp-analysis-tip-note');
}
function ppAI(rows){
 return `<div class="pp-ai-heading"><h3><span>AI</span> 部门风险根因分析 <span class="metric-help pp-analysis-help" role="button" tabindex="0" aria-label="部门风险根因分析说明" data-metric-rule="${esc(ppAnalysisHelpText())}"></span></h3></div><div class="pp-ai-grid">${ppDepartments.map(department=>{
  const facts=ppAnalysisDepartment(rows,department);
  return `<article data-analysis-department="${department}"><div class="pp-card-head"><h4>${department}</h4></div>
  <div class="pp-analysis-metrics">${ppAnalysisButton(department,'red','<span>红灯项目</span>',`<strong>${facts.red.length}</strong>`)}${ppAnalysisButton(department,'high','<span>高危项目</span>',`<strong>${facts.high.length}</strong>`)}<div class="pp-analysis-share"><span>红灯风险占比</span><strong>${facts.riskShare.rate}</strong></div></div>
  <h5>TOP 3 共性根因</h5><div class="pp-root-list">${facts.top.length?facts.top.map((group,index)=>ppAnalysisButton(department,group.key,`<span class="pp-root-rank">${index+1}</span>`,`<span class="pp-root-content"><b>${esc(group.title)}</b>${group.summary?`<span class="pp-root-summary">${esc(group.summary)}</span>`:''}<small>${group.records.length} 条风险 · ${group.projects.size} 个项目 <em>查看台账 ›</em></small></span>`,'pp-root-item')).join(''):'<div class="pp-analysis-empty">暂无可归纳的根因</div>'}</div>
  ${ppAnalysisButton(department,'all','查看全部风险台账','<span>→</span>','pp-analysis-all')}</article>`;
 }).join('')}</div>`;
}
function ppOpenAnalysis(department,mode){
 const facts=withPeriod('projects',()=>ppAnalysisDepartment(ppAnalysisRows(),department));
 const group=facts.top.find(item=>item.key===mode),highIds=new Set(facts.high.map(p=>p.id));
 const records=group?group.records:mode==='high'?facts.records.filter(x=>highIds.has(x.project.id)):facts.records;
 ppOpenRiskDetail(department+'风险台账明细',records,{conclusion:group});
}
document.addEventListener('click',e=>{
 const button=e.target.closest('#pp-ai [data-pp-analysis]');
 if(button){ppOpenAnalysis(button.dataset.ppAnalysis,button.dataset.mode);return}
 const view=e.target.closest('#dialogbody [data-pp-analysis-view]');
 if(view)toast('点击跳转项目详情页-风险管理');
});
