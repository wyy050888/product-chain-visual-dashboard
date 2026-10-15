

// Director-only: one project ledger for delayed projects and AI bottlenecks.
const apState={season:'all',scope:'all',page:1,key:''};
const apPreviousRisks=renderRisks;
renderRisks=function(...args){const result=apPreviousRisks(...args);$('#riskrail [data-risk="5"]')?.closest('.riskcard')?.remove();const sub=$('#risk .sectionhead .sub');if(sub)sub.textContent='6 大风险榜单 · TOP 6';return result};
function apPeriod(){const r=inlineAIRange();return {mode:'day',year:+r.end.slice(0,4),value:+r.end.slice(5,7),dayMode:r.start===r.end?'single':'range',start:r.start,end:r.end}}
function apRun(period,fn){const saved=localPeriods.projects;try{localPeriods.projects={...period};return withPeriod('projects',fn)}finally{if(saved)localPeriods.projects=saved;else delete localPeriods.projects}}
function apModel(r){return r.model||r.subject.match(/[A-Z]+-\d+/)?.[0]||r.id}
function apMerge(original){
 const period=apPeriod(),delayed=apRun(period,()=>drRows().filter(p=>p.status!=='绿灯'&&(!p.actual||p.actual==='—'))),allOriginal=original.filter(r=>r.kind==='block'),map=new Map(allOriginal.map(r=>[r.projectId!==undefined?'project:'+r.projectId:apModel(r),{...r,model:r.projectId!==undefined?sampleProjectRows().find(p=>p.id===r.projectId)?.model||'—':apModel(r),period,evidenceId:r.id,attribute:srAttribute(r.subject),delayed:false}]));
 delayed.forEach(p=>{const key='project:'+p.id,existing=map.get(key),chain=chains[p.chain],owner=p.chainOwner;
  if(!pfIncludes(aiView.chain,chain)||(aiView.department!=='全部'&&p.dept!==aiView.department)||(aiView.owner!=='全部'&&owner!==aiView.owner))return;
  map.set(key,{...existing,kind:'block',id:'ap-project-'+p.id,model:p.model,subject:p.name+' '+p.model,name:p.name,chain,department:p.dept,owner,level:p.level==='P1'?'高危':'中风险',riskLevel:p.level,stage:p.blockStage,flowStage:p.blockStage,flowTask:p.blockTask,problem:p.cause,action:existing?.action||p.desc,source:'项目进度台账',date:period.end,attribute:p.attribute,delayed:true,delay:p.delay,plan:p.plan,projectId:p.id,period});
 });
 return [...map.values()].sort((a,b)=>(b.delay||0)-(a.delay||0)||a.subject.localeCompare(b.subject,'zh'));
}
const apPreviousRows=inlineAIRows;
inlineAIRows=function(){const rows=apPreviousRows();return wfDirector()?[...rows.filter(r=>r.kind!=='block'),...apMerge(rows)]:rows};
function apFiltered(rows){return rows.filter(r=>(apState.season==='all'||r.attribute===apState.season)&&(apState.scope==='all'||(apState.scope==='delay'?r.delayed:!r.delayed)))}
const apPreviousTable=aiDetailTable;
aiDetailTable=function(kind,rows){
 if(kind!=='block'||!wfDirector())return apPreviousTable(kind,rows);
 const key=JSON.stringify([inlineAIRange(),aiView.chain,aiView.department,aiView.owner,apState.season,apState.scope]);if(key!==apState.key){apState.key=key;apState.page=1}
 const selected=apFiltered(rows),pages=Math.max(1,Math.ceil(selected.length/5));apState.page=Math.min(apState.page,pages);
 const headers=['项目 / 类目','卡点/任务','责任部门 / 链主','计划上线 / 延期','产品属性','风险等级','操作'];
 return `<div class="ap-tools"><label>产品属性 <select id="ap-season">${[['all','全部'],['夏季品','夏季品'],['冬季品','冬季品'],['四季品','四季品']].map(([v,n])=>`<option value="${v}" ${apState.season===v?'selected':''}>${n}</option>`).join('')}</select></label><label>项目范围 <select id="ap-scope">${[['all','全部项目卡点'],['delay','延期项目'],['block','其他项目卡点']].map(([v,n])=>`<option value="${v}" ${apState.scope===v?'selected':''}>${n}</option>`).join('')}</select></label><span class="note">共 ${rows.length} 个项目 · 延期 ${rows.filter(r=>r.delayed).length} 个</span></div><div class="ap-table"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${selected.length?selected.slice((apState.page-1)*5,apState.page*5).map(r=>`<tr><td><div class="ap-product">${riskThumbnail(r.name||Object.keys(productImages).find(n=>r.subject.includes(n))||r.subject)}<div><strong>${esc(r.name||r.subject.replace(r.model,'').trim())}</strong><small>${esc(r.model)} · ${esc(r.chain)}</small></div></div></td><td><strong>${esc(r.flowStage||r.stage)}</strong><small>${esc(r.flowTask||r.stage)}</small></td><td>${esc(r.department)}<small>${esc(r.owner)}</small></td><td>${r.delayed?`${r.plan}<small class="red">延期 ${r.delay} 天</small>`:'—<small class="orange">卡点待处理</small>'}</td><td>${esc(r.attribute)}</td><td><span class="tag ${r.level==='高危'?'red':'orange'}">${esc(r.riskLevel||r.level)}</span></td><td><div class="ap-actions"><button class="link" data-ap-detail="${r.id}">查看详情</button><button class="link" data-ap-handle="${r.id}">立即处理</button></div></td></tr>`).join(''):'<tr><td colspan="7" class="empty">当前筛选下暂无项目卡点</td></tr>'}</tbody></table></div>${listPager(selected.length,apState.page,5,{attr:"data-ap-page"})}<details class="ap-rules"><summary>统计口径</summary><p>延期项目按所选截止日的未上线项目统计（含跨期未完成），延期超过 ${config.delay} 天纳入；AI 卡点按所选期间记录统计，相同产品型号合并一条。延期项目优先按延期天数排序；P1 ≥30天，P2 为15—29天，P3 ＜15天。</p></details>`;
};
function apOpen(id,handle=false){
 const r=inlineAIRows().find(r=>r.id===id&&r.kind==='block');if(!r)return;
 if(r.projectId!==undefined){apRun(r.period,()=>projectDetail(r.projectId));$('#dialogtitle').textContent=r.name+' · 项目管理卡点';$('.pc-hero')?.insertAdjacentHTML('afterend',`<div class="ap-detail-meta"><span>产品属性：${esc(r.attribute)}</span><span>风险等级：${esc(r.riskLevel)}</span>${r.evidenceId?`<button class="link" data-ap-evidence="${r.evidenceId}">查看 AI 诊断依据</button>`:''}</div>`);if(handle)$('#pc-dispatch-open')?.click()}
 else if(handle)openAIHandle(r.evidenceId);else openAIRecord(r.evidenceId);
 $('#dialogactions').insertAdjacentHTML('afterbegin','<button class="btn small" data-ap-back>返回项目管理卡点</button>');
}
const apPreviousRender=renderInlineAI;
renderInlineAI=function(){apPreviousRender();if(!wfDirector())return;const card=$('#aigrid [data-ai-kind="block"] p');if(card)card.textContent='延期项目与卡点统一跟踪';const note=$('#ai-detail-block .ai-detail-heading .note');if(note)note.textContent='延期项目已合并 · 同一型号不重复展示';};
renderAI=renderInlineAI;
document.addEventListener('change',e=>{if(e.target.id==='ap-season'||e.target.id==='ap-scope'){apState[e.target.id==='ap-season'?'season':'scope']=e.target.value;apState.page=1;renderInlineAI()}});
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-ap-detail],[data-ap-handle],[data-ap-page],[data-ap-back],[data-ap-evidence]');if(!b)return;
 if(b.dataset.apDetail)apOpen(b.dataset.apDetail);else if(b.dataset.apHandle)apOpen(b.dataset.apHandle,true);
 else if(b.hasAttribute('data-ap-page')&&!b.disabled){apState.page=+b.dataset.apPage;renderInlineAI()}
 else if(b.hasAttribute('data-ap-back')){$('#close').click();aiView.kind='block';renderInlineAI();$('#ai-detail-block')?.scrollIntoView({block:'center',behavior:'instant'})}
 else if(b.dataset.apEvidence){openAIRecord(b.dataset.apEvidence);$('#dialogactions').insertAdjacentHTML('afterbegin','<button class="btn small" data-ap-back>返回项目管理卡点</button>')}

});