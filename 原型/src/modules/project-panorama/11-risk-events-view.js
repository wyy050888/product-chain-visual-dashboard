function ppRiskEventChart(){
 const range=ppEventRange(),dimension=ppEventState.dimension,groups=ppEventGroups(ppEventRows(),range,dimension),max=Math.max(1,...groups.flatMap(g=>[g.new.length,g.closed.length]));
 const bar=(g,kind)=>{const rows=g[kind],red=rows.filter(e=>e.risk.light==='红灯').length,yellow=rows.length-red,label=kind==='new'?'新增':'闭环';
  return `<button type="button" class="pp-event-bar" data-pp-event-group="${esc(g.key)}" data-kind="${kind}" aria-label="${esc(g.key)}${label}：红灯${red}条，黄灯${yellow}条"><span>${label}</span><span class="pp-track"><i class="pp-red" style="width:${red/max*100}%"></i><i class="pp-yellow" style="width:${yellow/max*100}%"></i></span><span><b class="red">${red}</b> / <b class="orange">${yellow}</b></span></button>`};
 return `<article class="pp-card pp-events"><div class="pp-card-head"><h3>风险新增与闭环</h3><span><i class="dot red"></i>红灯 <i class="dot orange"></i>黄灯</span></div>
 <button type="button" class="pp-event-period" data-pp-event-period>${range.start} — ${range.end}<span>⌄</span></button>
 <div class="pp-tabs">${[['type','项目类型'],['category','类目']].map(([key,label])=>`<button type="button" data-pp-event-dimension="${key}" aria-pressed="${key===dimension}" class="${key===dimension?'active':''}">${label}</button>`).join('')}</div>
 <div class="pp-event-groups">${groups.map(g=>`<div class="pp-event-group"><b>${esc(g.key)}</b>${bar(g,'new')}${bar(g,'closed')}</div>`).join('')}</div></article>`;
}
function ppRenderEvents(){withPeriod('projects',()=>{const card=$('#pp-overview .pp-events');if(card)card.outerHTML=ppRiskEventChart()})}
function ppOpenEventPeriod(){
 const range=withPeriod('projects',ppEventRange),cutoff=withPeriod('projects',()=>bounds().cutoff);
 openModal('风险统计时间',`<form id="pp-event-period-form"><div class="pp-event-presets">${[['7','近7天'],['30','近30天'],['month','本月']].map(([key,label])=>`<button type="button" data-pp-event-preset="${key}">${label}</button>`).join('')}</div><div class="pp-event-date-fields"><label>开始日期<input type="date" name="start" value="${range.start}" max="${cutoff}" required></label><label>结束日期<input type="date" name="end" value="${range.end}" max="${cutoff}" required></label></div><p class="pp-event-error" role="alert"></p><button class="primary" type="submit">确定</button></form>`);
 const form=$('#pp-event-period-form');
 form.onclick=e=>{const preset=e.target.closest('[data-pp-event-preset]');if(!preset)return;const key=preset.dataset.ppEventPreset;form.elements.end.value=cutoff;form.elements.start.value=key==='month'?cutoff.slice(0,7)+'-01':ppEventDateOffset(cutoff,1-Number(key));form.querySelector('.pp-event-error').textContent=''};
 form.onsubmit=e=>{e.preventDefault();const start=form.elements.start.value,end=form.elements.end.value;if(!ppDate(start)||!ppDate(end)||start>end||end>cutoff){form.querySelector('.pp-event-error').textContent='请选择有效的起止日期';return}Object.assign(ppEventState,{start,end});$('#modalclose').click();ppRenderEvents()};
}
function ppOpenEventRecords(key,kind){
 const range=withPeriod('projects',ppEventRange),dimension=ppEventState.dimension;
 const events=withPeriod('projects',()=>ppRiskEvents(ppEventRows(),range)).filter(e=>e.project[dimension]===key&&e.kind===kind),label=kind==='new'?'新增':'闭环';
 const headers=['项目名称','任务名称','风险单红绿灯','问题描述','责任部门','创建日期','闭环日期'];
 openModal(key+' · '+label+'风险',`<div class="pp-analysis-detail"><div class="pp-analysis-total">${range.start} — ${range.end} · ${events.length} 条风险</div><div class="pp-analysis-table"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${events.length?events.map(({project,risk})=>`<tr>${[esc(project.name),ppTaskNames(risk),traffic(risk.light),esc(risk.description||'未填写'),esc(ppValues(risk.department).join('、')||'—'),esc(risk.recordedAt?.slice(0,10)||'—'),esc(risk.closedAt?.slice(0,10)||'—')].map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join(''):'<tr><td colspan="7" class="pp-analysis-empty">该时段暂无风险记录</td></tr>'}</tbody></table></div></div>`,true);
}
document.addEventListener('click',e=>{
 const button=e.target.closest('#projects.pp-main [data-pp-event-dimension],#projects.pp-main [data-pp-event-period],#projects.pp-main [data-pp-event-group]');if(!button)return;
 if(button.dataset.ppEventDimension){ppEventState.dimension=button.dataset.ppEventDimension;ppRenderEvents()}
 else if(button.hasAttribute('data-pp-event-period'))ppOpenEventPeriod();
 else ppOpenEventRecords(button.dataset.ppEventGroup,button.dataset.kind);
});
