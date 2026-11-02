

// Stage/task structure follows the supplied project-management reference.
// Dates, owners and diagnostic evidence below remain local demonstration data.
const aiFlowStages=[
 {name:'产品寻源期',tasks:['产品寻源','自选品立项','测试体验','销售体验','验厂','产品供应商确认落地','产品评审会']},
 {name:'整改测试期',tasks:['整改及认证','最终报价','上市筹备','封样评审','首批订单']},
 {name:'首批上线期',tasks:['备料期','批量量产']},
 {name:'新品改进期',tasks:['新品改进立项']}
];
const aiFlowMapping={
 'block-0':{stage:0,task:5,next:'产品评审会 → 整改及认证 → 首批订单',accept:'补齐核心物料资质、复审结论及供应商交付承诺；品质确认资质有效，项目部确认样机与量产排期。'},
 'block-1':{stage:1,task:0,next:'封样评审 → 首批订单 → 批量量产',accept:'研发提交冻结版本、变更清单和回归报告；品质完成复测并出具通过结论，方可进入封样评审。'},
 'block-2':{stage:1,task:0,next:'封样评审 → 首批订单 → 渠道备货',accept:'品质确认噪声测试标准与异常样本；完成整改复测，报告满足标准后再签署封样结论。'},
 'block-3':{stage:2,task:0,next:'批量量产 → 首批上线 → 新品改进立项',accept:'项目部取得试产、检测和物料资源的确认记录；链主批准统一排期，明确每一节点的交付人与验收人。'},
 'block-4':{stage:0,task:6,next:'整改及认证 → 最终报价 → 首批订单',accept:'产品部更新需求基线和成本售价测算；完成变更评审，各部门确认后向后续任务同步新版资料。'},
 'block-5':{stage:2,task:0,next:'批量量产 → 首批上线',accept:'采购确认关键电机到料日期、数量及替代规格；品质验证替代物料，生产确认试产物料齐套。'}
};
aiRecords.filter(r=>r.kind==='block').forEach(r=>{const m=aiFlowMapping[r.id];r.flowStage=aiFlowStages[m.stage].name;r.flowTask=aiFlowStages[m.stage].tasks[m.task]});
function aiFlowDayDiff(start,end){return Math.round((Date.parse(end)-Date.parse(start))/86400000)}
function aiFlowSnapshot(r){const m=aiFlowMapping[r.id],high=r.level==='高危';return aiFlowStages.map((stage,si)=>{
 const tasks=stage.tasks.map((name,ti)=>{
  const primary=si===m.stage&&ti===m.task,parallelQuote=si===m.stage&&si===1&&ti===1;
  const done=si<m.stage||(si===m.stage&&ti<m.task)||parallelQuote;
  const waiting=!done&&!primary,offset=si<m.stage?-65+(si-m.stage+2)*18+ti*2:si>m.stage?18+(si-m.stage-1)*24+ti*5:primary?(high?-7:2):parallelQuote?-3:ti<m.task?-10-(m.task-ti)*4:6+(ti-m.task)*3;
  const duration=si===0&&ti===4?15:primary?12:si===2&&ti===0?10:2,start=shiftDate(r.date,offset-duration+1),end=shiftDate(r.date,offset),actual=done?end:'';
  const dept=primary?r.department:si===0?['采购部','产品部','品质部','产品部','品质部','采购部','产品部'][ti]:si===1?['品质部','采购部','产品部','品质部','产品部'][ti]:si===2?['采购部','品质部'][ti]:'品质部';
  const owner=primary?r.owner:({'采购部':'唐琪','产品部':r.owner,'品质部':'刘畅','研发部':'王磊','项目部':'沈舟'}[dept]);
  return{name,primary,done,waiting,start,end,actual,duration,dept,owner,delay:done?Math.max(0,aiFlowDayDiff(end,actual)):Math.max(0,aiFlowDayDiff(end,r.date)),status:done?'已完成':primary?(high?'延期未完成':'风险处理中'):si>m.stage?'待启动':'待前置完成',tone:done?'green':primary?(high?'red':'orange'):'muted',problem:primary?r.problem:waiting?`需确认「${r.flowTask}」解除后，复核本任务的启动条件。`:'当前记录无遗留问题。',action:primary?r.action:waiting?'保留计划节点，协调资源；前置条件满足后确认实际启动日期。':'已完成交付确认。'};
 });
 const start=tasks.map(t=>t.start).sort()[0],end=tasks.map(t=>t.end).sort().at(-1),done=tasks.filter(t=>t.done).length;
 return{name:stage.name,tasks,start,end,duration:aiFlowDayDiff(start,end)+1,done,total:tasks.length,actual:done===tasks.length?tasks.map(t=>t.actual).sort().at(-1):'',state:si<m.stage?'已完成':si===m.stage?'核心卡点':'待前置解除',tone:si<m.stage?'green':si===m.stage?(high?'red':'orange'):'muted'};
 })}
const aiTableBeforeFlow=aiDetailTable;
aiDetailTable=function(kind,rows){if(kind!=='block')return aiTableBeforeFlow(kind,rows);
 const headers=['风险等级','项目 / 链群','卡点/任务','责任部门 / 链主','诊断明细与业务影响','记录时间','操作'];
 return `<div class="ai-flow-list"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${[
 `<span class="tag ${r.level==='高危'?'red':'orange'}">${r.level}</span>`,
 `<div class="af-project-cell">${riskThumbnail(Object.keys(productImages).find(name=>r.subject.includes(name))||r.subject)}<div><strong>${esc(r.subject)}</strong><small>${esc(r.chain)}</small></div></div>`,
 `<span class="af-stage-label">${r.flowStage}</span><strong>${r.flowTask}</strong>`,
 `${esc(r.department)}<small>链主：${esc(r.owner)}</small>`,
 `<p>${esc(r.problem)}</p><small>${esc(r.source)}</small>`,r.date,
 `<div class="ai-row-actions"><button class="link" data-ai-detail="${r.id}">查看详情</button><button class="btn soft small" data-ai-handle="${r.id}">立即处理</button></div>${aiTasks[r.id]?'<small class="ai-task-saved">已建本地任务</small>':''}`
 ].map((v,i)=>`<td data-label="${headers[i]}">${v}</td>`).join('')}</tr>`).join(''):'<tr><td colspan="7" class="empty">当前筛选条件下暂无项目管理卡点。</td></tr>'}</tbody></table></div>`;
};
function renderAIFlowStage(r,selected){const stages=aiFlowSnapshot(r),s=stages[selected];
 $$('#af-stage-tabs [data-af-stage]').forEach(b=>{const current=+b.dataset.afStage===selected;b.classList.toggle('selected',current);b.setAttribute('aria-selected',String(current))});
 const headers=['任务名称','状态','负责人 / 部门','计划开始','计划结束','计划工期','实际结束','工期偏差','问题描述','纠正措施'];
 $('#af-stage-panel').innerHTML=`<div class="af-panel-heading"><div><h3>${s.name} <span class="tag ${s.tone}">${s.state}</span></h3><p>计划 ${s.start} — ${s.end} · 工期 ${s.duration} 天 · 实际结束 ${s.actual||'—（未完成）'}</p></div><span>总任务 <b>${s.total}</b> · 已完成 <b class="green">${s.done}</b></span></div><div class="af-task-scroll"><table><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${s.tasks.map(t=>`<tr class="${t.primary?'af-primary-row':''}">${[
 `<strong>${t.name}</strong>${t.primary?'<small class="red">本次诊断定位任务</small>':''}`,`<span class="tag ${t.tone}">${t.status}</span>`,`${esc(t.owner)}<small>${esc(t.dept)}</small>`,t.start,t.end,t.duration+' 天',t.actual||'—',t.delay?`<strong class="red">延期 ${t.delay} 天</strong>`:t.done?'<span class="green">按期完成</span>':'<span class="muted">未到期</span>',`<p>${esc(t.problem)}</p>`,`<p>${esc(t.action)}</p>`
 ].map((v,i)=>`<td data-label="${headers[i]}">${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 $('#af-stage-panel').setAttribute('aria-labelledby','af-stage-'+selected);
}
const openAIRecordBeforeFlow=openAIRecord;
openAIRecord=function(id){const r=aiRecords.find(r=>r.id===id);if(!r||r.kind!=='block')return openAIRecordBeforeFlow(id);
 const m=aiFlowMapping[id],stages=aiFlowSnapshot(r),task=stages[m.stage].tasks[m.task],saved=aiTasks[id],high=r.level==='高危';modalModule=null;
 openModal('项目管理卡点 · 查看详情',`<article class="ai-flow-detail">
 <header class="af-hero"><div><span class="tag ${high?'red':'orange'}">${r.level}</span><span class="af-eyebrow">${esc(r.chain)} · ${esc(r.subject)}</span><h2>卡在「${r.flowStage}」</h2><p>具体任务：<b>${r.flowTask}</b><span class="af-separator">|</span>${task.delay?`<strong class="red">延期 ${task.delay} 天未完成</strong>`:`<strong class="orange">距计划结束 ${aiFlowDayDiff(r.date,task.end)} 天 · 存在延期风险</strong>`}</p></div><div class="af-owner"><small>责任部门 / 链主</small><strong>${esc(r.department)} / ${esc(r.owner)}</strong><small>诊断快照 ${r.date}</small></div></header>
 <div class="af-location"><span>项目链路定位</span><strong>${esc(r.subject)} <i>›</i> ${r.flowStage} <i>›</i> ${r.flowTask}</strong></div>
 <section class="af-section"><div class="af-section-heading"><h3>全链路进度</h3><small>点击阶段查看任务明细 · 阶段允许交叉执行</small></div><div class="af-stage-tabs" id="af-stage-tabs" role="tablist" aria-label="项目链路阶段">${stages.map((s,i)=>`<button type="button" id="af-stage-${i}" role="tab" data-af-stage="${i}" aria-selected="${i===m.stage}" aria-controls="af-stage-panel" class="af-stage ${i===m.stage?'selected':''} ${s.tone}"><span class="af-stage-top"><span class="af-step">0${i+1}</span><span class="tag ${s.tone}">${s.state}</span></span><strong>${s.name}</strong><small>${s.done} / ${s.total} 项已完成</small><span class="af-progress"><i style="width:${s.done/s.total*100}%"></i></span>${i===m.stage?`<small class="${high?'red':'orange'}">卡点任务：${r.flowTask}</small>`:'<small>点击查看阶段任务</small>'}</button>`).join('')}</div></section>
 <section class="af-analysis"><div class="af-analysis-heading"><span class="ai-logo" aria-hidden="true"><b>AI</b></span><h3>核心卡点分析</h3></div><div class="af-analysis-grid"><div><small>直接原因</small><p>${esc(r.problem)}</p><small>定位依据</small><p>${esc(r.source)}记录的「${esc(r.stage)}」问题，映射至「${r.flowStage} / ${r.flowTask}」。</p></div><div><small>下游影响路径</small><p class="af-impact-path">${r.flowTask} → ${m.next}</p><small>风险影响</small><p>当前任务未闭环，后续节点需重新确认启动条件与排期；各任务可并行开展准备工作。</p></div></div></section>
 <section class="af-section"><div class="af-section-heading"><h3>阶段任务明细</h3><small>红色标记延期 · 橙色标记临期风险</small></div><div id="af-stage-panel" role="tabpanel"></div></section>
 <section class="af-section af-resolution"><div class="af-section-heading"><h3>解除卡点与闭环要求</h3><span class="tag">责任链主：${esc(r.owner)}</span></div><div class="af-resolution-grid"><div><span>01</span><strong>明确责任与完成日期</strong><p>${esc(r.action)}</p></div><div><span>02</span><strong>提交可验证的交付物</strong><p>${esc(m.accept)}</p></div><div><span>03</span><strong>验证后同步下游节点</strong><p>项目部复核整改证据，更新任务实际结束日期与阶段状态；链主确认下游计划后闭环。</p></div></div></section>
 ${saved?aiTaskSummary(saved):'<p class="notice">可通过“立即处理”指派人员、设置完成日期，并生成钉钉通知待发记录。</p>'}<p class="af-foot">依据提供的项目管理阶段与任务结构制作；日期、责任人及卡点分析为演示数据，详情按所选诊断记录日期展示。</p></article>`,false,'定位具体链路与任务，追踪原因、影响和处理进展');
 renderAIFlowStage(r,m.stage);
 $('#af-stage-tabs').onclick=e=>{const b=e.target.closest('[data-af-stage]');if(b)renderAIFlowStage(r,+b.dataset.afStage)};
 $('#af-stage-tabs').onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const tabs=[...$$('#af-stage-tabs [data-af-stage]')],current=tabs.indexOf(document.activeElement);if(current<0)return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?3:(current+(e.key==='ArrowRight'?1:3))%4;renderAIFlowStage(r,next);tabs[next].focus()};
 $('#dialogactions').insertAdjacentHTML('afterbegin',`<button class="btn primary small" data-ai-handle="${id}">${saved?'修改处理任务':'立即处理'}</button>`);
};
// Carry the selected stage and task into the existing assignment/notification flow.
const openAIHandleBeforeFlow=openAIHandle;
openAIHandle=function(id){openAIHandleBeforeFlow(id);const r=aiRecords.find(r=>r.id===id);if(!r||r.kind!=='block'||!$('#ai-handle-form'))return;
 $('.ai-handle-context p').insertAdjacentHTML('afterend',`<p class="af-handle-path">卡点链路：${r.flowStage} → ${r.flowTask}</p>`);
 if(!aiTasks[id]){$('#ai-task-title').value=r.subject+' · '+r.flowTask+'卡点处理';$('#ai-task-notes').value=`卡点链路：${r.flowStage} → ${r.flowTask}\n${r.action}\n验收要求：${aiFlowMapping[id].accept}`;$('#ai-task-notes').dispatchEvent(new Event('input',{bubbles:true}))}
};