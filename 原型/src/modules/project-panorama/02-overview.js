function ppHelp(label,text){return `<span class="metric-help" role="button" tabindex="0" aria-label="${esc(label)}说明" data-metric-rule="${esc(text)}"></span>`}
function ppLink(kind,value,label,body='',type=''){
 const active=ppState.link?.kind===kind&&ppState.link.value===value&&(!type||ppState.link.type===type);
 return `<button type="button" class="pp-link ${active?'selected':''}" data-pp-link="${kind}" data-value="${esc(value)}" data-type="${esc(type)}" aria-pressed="${active}">${label}${body}</button>`;
}
function ppOverview(rows){
 const c=ppCounts(rows.filter(p=>p.projectState==='进行中')),dimension=ppState.distribution;
 const keys=dimension==='type'?Object.keys(ppStages):pfCategories;
 const groups=keys.map(key=>({key,...ppCounts(rows.filter(p=>p[dimension]===key))}));
 const max=Math.max(1,...groups.map(g=>g.red+g.yellow));
 return `<article class="pp-card pp-rate"><div class="pp-card-head"><h3>红黄灯率 ${ppHelp('红黄灯率','红黄灯率＝（红灯项目数＋黄灯项目数）÷进行中项目数。')}</h3><span>进行中 ${c.total} 个项目</span></div>
 ${ppLink('light','红黄灯',`<span>红黄灯合计</span><strong>${c.rate(c.red+c.yellow)}</strong><small>${c.red+c.yellow} 个项目</small>`)}
 <div class="pp-rate-split">${[['红灯',c.red,'red'],['黄灯',c.yellow,'orange']].map(([name,count,color])=>ppLink('light',name,`<span><i class="dot ${color}"></i>${name}率</span><b class="${color}">${c.rate(count)}</b><small>${count} 个项目</small>`)).join('')}</div></article>
 <article class="pp-card"><div class="pp-card-head"><h3>项目红黄灯分布</h3><span><i class="dot red"></i>红灯 <i class="dot orange"></i>黄灯</span></div>
 <div class="pp-tabs">${[['type','项目类型'],['category','类目']].map(([key,label])=>`<button type="button" data-pp-distribution="${key}" aria-pressed="${dimension===key}" class="${dimension===key?'active':''}">${label}</button>`).join('')}</div>
 <div class="pp-bars">${groups.map(g=>ppLink(dimension,g.key,`<span class="pp-bar-label">${esc(g.key)}</span>`,`<span class="pp-bar-line"><span class="pp-track"><i class="pp-red" style="width:${g.red/max*100}%"></i><i class="pp-yellow" style="width:${g.yellow/max*100}%"></i></span><span><b class="red">${g.red}</b> / <b class="orange">${g.yellow}</b></span></span>`)).join('')}</div></article>
 ${ppDepartmentRiskChart(rows)}`;
}
function ppAI(rows){
 const red=rows.filter(p=>p.status==='红灯'),missing=red.filter(p=>!p.ledger.length).length;
 return `<div class="pp-ai-heading"><h3><span>AI</span> 红灯归因分析</h3><small>依据项目风险台账 · 当前筛选范围</small></div>
 <p class="pp-ai-summary">当前 ${red.length} 个红灯项目${missing?`，其中 ${missing} 个尚未提供风险台账，暂无法完成根因归类`:'；按责任部门汇总已有根因与纠正措施'}。</p>
 <div class="pp-ai-grid">${ppDepartments.map(department=>{
  const facts=ppDepartmentFacts(rows,department),evidence=facts.records.filter(x=>x.project.status==='红灯'),causes=new Map();
  for(const x of evidence){const reason=x.risk.rootCause||x.risk.description;if(!reason)continue;if(!causes.has(reason))causes.set(reason,new Set());causes.get(reason).add(x.project.id)}
  const top=[...causes].sort((a,b)=>b[1].size-a[1].size).slice(0,3),actions=ppValues(evidence.map(x=>x.risk.action));
  return `<article><div class="pp-card-head"><h4>${department}</h4><button type="button" class="link" data-pp-ai-department="${department}">${missing&&!facts.redProjects.length?'待补充':facts.redProjects.length+' 个红灯项目'}</button></div>
  ${top.length?`<ul>${top.map(([reason,ids])=>`<li>${esc(reason)}<small>涉及 ${ids.size} 个项目</small></li>`).join('')}</ul>`:'<p class="muted">暂无可归因的风险台账。</p>'}
  ${actions.length?`<p class="pp-ai-action"><b>已维护措施</b>${esc(actions.slice(0,2).join('；'))}</p>`:''}
  ${evidence.length?`<details><summary>查看依据 · ${evidence.length} 条风险</summary><ul>${evidence.map(x=>`<li><button class="link" data-pp-evidence="${x.project.id}">${esc(x.project.name)}</button><p>${esc(x.risk.description||'问题描述待补充')}</p><small>责任人：${esc(x.risk.owner||'待补充')} · 整改期限：${esc(x.risk.deadline||'待补充')}</small></li>`).join('')}</ul></details>`:''}</article>`;
 }).join('')}</div><p class="pp-note">同一项目可归属多个部门，部门数量不可直接相加。当前为规则汇总原型，未调用真实 AI。</p>`;
}
