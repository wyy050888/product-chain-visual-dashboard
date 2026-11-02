function ppAnalysisButton(department,mode,label,body='',className=''){
 return `<button type="button" class="${className}" data-pp-analysis="${esc(department)}" data-mode="${esc(mode)}" aria-pressed="${ppAnalysisState.department===department&&ppAnalysisState.mode===mode}">${label}${body}</button>`;
}
function ppAnalysisMetricValue(count){
 return `<div class="pp-analysis-value"><strong>${count}</strong><i class="pp-analysis-chevron" aria-hidden="true">›</i></div>`;
}
const ppAnalysisHelp={
 scope:'三个指标按当前范围内未闭环风险统计；TOP3共性根因使用全部风险台账。',
 metrics:[
  {label:'红灯项目',description:'风险单的责任部门包含该部门的红灯项目数。'},
  {label:'高危项目',get description(){return '上述红灯项目中，延期天数'+brcDescribe('lights.projectDelay')+'的项目数。'}},
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
// 保留浅色部门卡片与右侧台账结构，两侧复用同一份部门事实。
function ppAI(rows){
 const selection=ppAnalysisSelection(rows),{facts,group}=selection,department=facts.department;
 return `<div class="pp-analysis-header"><div class="pp-ai-heading"><h3><span class="ai-logo" aria-hidden="true"><b>AI</b></span> 部门风险根因分析 <span class="metric-help pp-analysis-help" role="button" tabindex="0" aria-label="部门风险根因分析说明" data-metric-rule="${esc(ppAnalysisHelpText())}"></span></h3></div>
 <div class="pp-analysis-tabs" role="tablist" aria-label="风险分析部门">${ppDepartments.map(name=>`<button type="button" role="tab" id="pp-analysis-tab-${ppDepartments.indexOf(name)}" aria-controls="pp-analysis-panel" aria-selected="${department===name}" tabindex="${department===name?0:-1}" data-pp-analysis-department="${name}">${name}</button>`).join('')}</div></div>
 <div id="pp-analysis-panel" class="pp-analysis-layout" role="tabpanel" aria-labelledby="pp-analysis-tab-${ppDepartments.indexOf(department)}">
 <article class="pp-analysis-card" data-analysis-department="${department}"><div class="pp-card-head"><h4>${department}</h4></div>
 <div class="pp-analysis-metrics">${ppAnalysisButton(department,'high','<span>高危项目</span>',ppAnalysisMetricValue(facts.high.length))}${ppAnalysisButton(department,'red','<span>红灯项目</span>',ppAnalysisMetricValue(facts.red.length))}<div class="pp-analysis-share"><span>红灯风险占比</span><strong>${facts.riskShare.rate}</strong></div></div>
 <h5>TOP 3 共性根因</h5><div class="pp-root-list">${facts.top.length?facts.top.map((item,index)=>ppAnalysisButton(department,item.key,`<span class="pp-root-rank">${index+1}</span>`,`<span class="pp-root-content"><b>${esc(item.title)}</b>${item.summary?`<span class="pp-root-summary">${esc(item.summary)}</span>`:''}<small>${item.records.length} 条风险 · ${item.projects.size} 个项目 <em>查看台账 ›</em></small></span>`,'pp-root-item')).join(''):'<div class="pp-analysis-empty">暂无可归纳的根因</div>'}</div>
 ${ppAnalysisButton(department,'all','查看全部风险台账','<span>→</span>','pp-analysis-all')}</article>
 <section class="pp-analysis-ledger pp-risk-detail" aria-label="${department}风险台账"><div class="pp-analysis-ledger-head"><h4>风险台账${group?' · '+esc(group.title):''}</h4></div>
 ${ppRiskFilterForm({id:'pp-analysis-filters',filters:ppAnalysisState.filters,resetAttribute:'data-pp-analysis-reset',allowedLights:ppAnalysisRiskLights})}
 <div id="pp-analysis-ledger-results">${ppAnalysisLedger(selection)}</div></section>
 <div id="pp-analysis-pages" class="pp-analysis-pages" aria-label="部门风险台账分页">${ppAnalysisPager(selection)}</div></div>`;
}

document.addEventListener('click',e=>{
 const button=e.target.closest('#pp-ai [data-pp-analysis]');
 if(button){ppSelectAnalysis(button.dataset.ppAnalysis,button.dataset.mode,'[data-pp-analysis="'+button.dataset.ppAnalysis+'"][data-mode="'+button.dataset.mode+'"]');return}
 const view=e.target.closest('#dialogbody [data-pp-analysis-view],#pp-ai [data-pp-analysis-view]');
 if(view)toast('点击跳转项目详情页-风险管理');
});
