function ppAnalysisButton(department,mode,label,body='',className=''){
 return `<button type="button" class="${className}" data-pp-analysis="${esc(department)}" data-mode="${esc(mode)}">${label}${body}</button>`;
}
function ppAI(rows){
 return `<div class="pp-ai-heading"><h3><span>AI</span> 部门风险根因分析</h3></div><div class="pp-ai-grid">${ppDepartments.map(department=>{
  const facts=ppAnalysisDepartment(rows,department);
  return `<article data-analysis-department="${department}"><div class="pp-card-head"><h4>${department}</h4></div>
  <div class="pp-analysis-metrics">${ppAnalysisButton(department,'red','<span>关联红灯项目</span>',`<strong>${facts.red.length}</strong>`)}${ppAnalysisButton(department,'high','<span>高危红灯（&gt;15天）</span>',`<strong>${facts.high.length}</strong>`)}</div>
  <h5>TOP 3 共性根因</h5><div class="pp-root-list">${facts.top.length?facts.top.map((group,index)=>ppAnalysisButton(department,group.key,`<span class="pp-root-rank">${index+1}</span>`,`<span class="pp-root-content"><b>${esc(group.title)}</b>${group.summary?`<span class="pp-root-summary">${esc(group.summary)}</span>`:''}<small>${group.records.length} 条风险 · ${group.projects.size} 个项目 <em>查看台账 ›</em></small></span>`,'pp-root-item')).join(''):'<div class="pp-analysis-empty">暂无可归纳的根因</div>'}</div>
  ${ppAnalysisButton(department,'all','查看全部风险台账','<span>→</span>','pp-analysis-all')}</article>`;
 }).join('')}</div>`;
}
function ppOpenAnalysis(department,mode){
 const facts=withPeriod('projects',()=>ppAnalysisDepartment(ppAnalysisRows(),department));
 const group=facts.top.find(item=>item.key===mode),highIds=new Set(facts.high.map(p=>p.id));
 const records=group?group.records:mode==='high'?facts.records.filter(x=>highIds.has(x.project.id)):facts.records;
 const title=group?group.title:mode==='high'?'高危红灯项目':mode==='red'?'红灯项目':'风险台账';
 const projects=group?[...new Map(records.map(x=>[x.project.id,x.project])).values()]:mode==='high'?facts.high:facts.red;
 const projectRows=mode==='red'||mode==='high';
 const headers=projectRows?['项目名称','项目红绿灯','延期天数','计划上线日期','风险单数','操作']:['项目名称','任务名称','风险单红绿灯','问题描述 / 原始根因','纠正措施','责任链主','整改期限','操作'];
 const rows=projectRows?projects.map(p=>[esc(p.name),ppProjectTraffic(p),ppDelayText(p),esc(p.plan||'—'),String(records.filter(x=>x.project.id===p.id).length),`<button type="button" class="link" data-pp-analysis-view="${p.id}">查看</button>`]):records.map(({project,risk})=>[esc(project.name),ppTaskNames(risk),['红灯','黄灯','绿灯'].includes(risk.light)?traffic(risk.light):'—',`<b>${esc(risk.description||'未填写')}</b><small>${esc(risk.rootCause||'未填写')}</small>`,esc(risk.action||'未填写'),esc(risk.owner||'未填写'),esc(risk.deadline||'—'),`<button type="button" class="link" data-pp-analysis-view="${project.id}">查看</button>`]);
 openModal(department+' · '+title,`<div class="pp-analysis-detail">${group?`<div class="pp-analysis-conclusion"><h3>${esc(group.title)}</h3><p>${esc(group.summary||group.title)}</p></div>`:''}<div class="pp-analysis-total">${projects.length} 个项目${projectRows?'':' · '+records.length+' 条风险'}</div><div class="pp-analysis-table"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(cells=>`<tr>${cells.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}" class="pp-analysis-empty">暂无相关记录</td></tr>`}</tbody></table></div></div>`,true);
}
document.addEventListener('click',e=>{
 const button=e.target.closest('#pp-ai [data-pp-analysis]');
 if(button){ppOpenAnalysis(button.dataset.ppAnalysis,button.dataset.mode);return}
 const view=e.target.closest('#dialogbody [data-pp-analysis-view]');
 if(view)toast('点击跳转项目详情页-风险管理');
});
