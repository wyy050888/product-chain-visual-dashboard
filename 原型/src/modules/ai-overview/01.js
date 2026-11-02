
// Inline diagnosis: every visible total is derived from the visible detail records.
let aiCutoff=DATA_CUTOFF;
const aiCoverageStart='2026-08-01';
const aiView={dayMode:'single',dayStart:aiCutoff,dayEnd:aiCutoff,mode:'week',date:aiCutoff,month:aiCutoff.slice(0,7),chain:'全部',department:'全部',owner:'全部',kind:'block'};
const aiOwners=['林悦','周铭','陈嘉','许宁'];
for(const owner of new Set(sampleProjectSource.map(p=>p.productOwner)))if(!aiOwners.includes(owner))aiOwners.push(owner);
const aiKinds=[['block','项目管理卡点','卡点'],['deviation','产品链工作偏差','偏差'],['priority','产品链接紧急事项','工作'],['resource','全局资源调配建议','建议']];
const aiFixtures={
 block:[
  ['厨电','采购部','海尔1.2升多功能破壁豆浆机','核心物料资质复审未完成，样机交付与后续量产排期受阻。','采购补齐资质材料，链主确认替代方案及交付时间。','高危','供应商寻源','项目卡点台账 · XM-102'],
  ['清洁','研发部','苏泊尔洗地机EWV-M22','测试版本冻结延后，品质复测尚未启动，影响上品排期。','研发确认版本冻结节点，品质同步预留复测窗口。','高危','研发测试','研发日报 · RD-105'],
  ['环境','品质部','美的加湿制冷冰雾台扇ADJ05CH','噪声测试结果未达标，需要确认整改方案，渠道备货存在延期风险。','复核异常样本，确认复测标准和整改完成日期。','中风险','品质复测','品质复测记录 · QA-103'],
  ['个护&健康','项目部','苏泊尔暴力吹（联鑫）','试产排期与检测计划存在冲突，跨部门交付日期尚未对齐。','项目部对齐研发与品质排期，明确唯一交付负责人。','中风险','排期协同','跨部门会议 · MT-104'],
  ['厨电','产品部','美的空气炸烤箱P20','产品需求基线变更后，成本评估尚未同步更新。','补充成本及售价测算，组织变更评审。','中风险','需求评审','需求评审记录 · PR-106'],
  ['清洁','采购部','创维擦窗机器人（壹洁）','关键电机交期延后，当前采购计划不能覆盖试产需求。','确认可替代物料规格，评估双供方案。','高危','采购交付','采购交付台账 · PO-101']
 ],
 deviation:[
  ['个护&健康','产品部','立项评估资料','竞品对比与成本测算附件缺失，立项依据不完整。','补齐评估附件，并在推进下一节点前完成复核。','P1','流程遗漏','立项检查记录 · CK-204'],
  ['环境','项目部','跨链需求响应','上次会议确认的依赖事项未形成明确责任人及回复时限。','补齐交付责任与时间，跟踪协同事项闭环。','P1','协同漏洞','会议纪要 · MT-203'],
  ['清洁','研发部','研发人力投入','低优先级优化占用测试资源，高风险版本验证投入不足。','重新评估优先级，保障高风险版本验证。','P0','重心错位','研发排期表 · RS-201'],
  ['厨电','采购部','供应商资源配置','储备供应商已有相近工艺能力，但新项目仍重复寻源。','核查资质适配性，通过复核后复用现有资源。','P1','资源浪费','供应商资源池 · SR-202'],
  ['个护&健康','品质部','整改闭环记录','复测结论未附带完整证据，项目台账中仍显示待确认。','补齐测试依据，同步品质和项目记录。','P1','流程遗漏','品质整改台账 · QA-205'],
  ['环境','研发部','方案交接','研发方案更新后，采购未收到新的物料清单。','完成版本交接并确认采购清单一致。','P1','协同漏洞','版本交接记录 · RD-206']
 ],
 priority:[
  ['厨电','采购部','物料资质复审闭环','优先解除海尔1.2升多功能破壁豆浆机物料资质卡点，避免试产继续后移。','周铭牵头确认复审材料、责任人与可执行交付日期。','P0','最高优先','重点工作清单 · WK-302'],
  ['清洁','研发部','洗地机测试版本冻结','按已确认问题清单完成版本冻结，为品质复测提供稳定样机。','林悦协调研发输出测试版本和变更清单。','P0','最高优先','重点工作清单 · WK-301'],
  ['环境','产品部','季节性库存处置方案','核实高库龄冷风扇的库存与渠道动销，降低季节性积压。','陈嘉汇总清库、调拨方案及成本测算。','P1','本周重点','库存处置会议 · WK-303'],
  ['个护&健康','项目部','吹风机试产排期确认','确定试产与检测资源，形成跨部门一致的交付计划。','许宁组织排期对齐，落实各节点验收人。','P1','本周重点','项目周计划 · WK-304'],
  ['厨电','品质部','退货原因专项复盘','聚合高频退货原因，区分品质、物流与预期差异。','周铭对齐责任部门，给出针对性整改计划。','P1','品质专项','品质周例会 · WK-305'],
  ['清洁','产品部','高销低利产品降本测算','对主销扫地机测算采购、工艺与包装优化空间。','林悦协同采购核实单台节约额，交财务复核。','P1','降本专项','经营复盘记录 · WK-306']
 ],
 resource:[
  ['厨电','研发部','研发工程师排期','厨电上品项目需要测试支持，现有工程师排期已满。','建议与环境协商临时支持 1 人、为期 2 周；需双方部长评估对原排期的影响。','P1','人力缺口','资源排期表 · RC-402'],
  ['清洁','品质部','高危整改复测窗口','复测资源紧张，影响洗地机问题验证与上品判断。','建议预留 2 个复测时段，低优先级样品调整须品质负责人确认。','P0','检测资源','检测排期表 · RC-401'],
  ['环境','采购部','备用供应商导入','核心物料依赖单一供应商，季节性排产期间响应存在不确定性。','建议组织备选供应商打样；费用、资质与导入节奏由采购部复核。','P1','供应商缺口','供应商风险台账 · RC-403'],
  ['个护&健康','项目部','试产与检测协同排期','试产与检测计划重叠，缺少统一协调窗口。','建议项目部组织排期协调，不直接变更现有业务计划。','P1','排期冲突','项目资源记录 · RC-404'],
  ['厨电','产品部','新品评估支持','多个新品同时评审，市场与成本评估工作量集中。','建议补充临时评审支持，保留核心评审质量要求。','P1','评审资源','产品评审计划 · RC-405'],
  ['清洁','研发部','工艺验证支持','降本方案需要研发验证，但常规迭代占用测试设备。','建议错峰开展工艺验证，研发负责人确认后调整设备使用计划。','P1','设备资源','设备排期表 · RC-406']
 ]};
aiFixtures.block=sampleProjectRows().filter(p=>p.status==='红灯').slice(0,6).map(p=>[chains[p.chain],p.dept,p.name+' '+p.model,p.report||'当前节点进度待确认','核对项目日报与调整计划，确认交付责任人及完成日期。',p.delay>=30?'高危':'中风险',p.stage,'项目进度台账 · XM-'+String(p.id+1).padStart(3,'0'),p.id]);
const aiRecords=aiKinds.flatMap(([kind])=>aiFixtures[kind].map((row,i)=>({kind,id:kind+'-'+i,chain:row[0],department:row[1],owner:row[8]!==undefined?sampleProjectSource.find(p=>p.id===row[8]).productOwner:aiOwners[chains.indexOf(row[0])],subject:row[2],problem:row[3],action:row[4],level:row[5],stage:row[6],source:row[7],projectId:row[8],date:shiftDate(aiCutoff,-[0,0,1,2,7,21][i]),deadline:kind==='priority'?shiftDate(shiftDate(aiCutoff,-[0,0,1,2,7,21][i]),row[5]==='P0'?1:3):null})));
function aiDayPickerHTML(){return `<div class="ai-day-picker"><div class="period-segment ai-day-options"><button type="button" data-ai-daymode="single" aria-pressed="${aiView.dayMode!=='range'}">单日</button><button type="button" data-ai-daymode="range" aria-pressed="${aiView.dayMode==='range'}">日期区间</button></div>${aiView.dayMode==='range'?`<form id="ai-day-range-form" class="ai-day-range"><label class="ai-date-label">开始<input id="ai-day-start" type="date" aria-label="AI诊断开始日期" min="${aiCoverageStart}" max="${aiCutoff}" required value="${aiView.dayStart}"></label><span>至</span><label class="ai-date-label">结束<input id="ai-day-end" type="date" aria-label="AI诊断结束日期" min="${aiCoverageStart}" max="${aiCutoff}" required value="${aiView.dayEnd}"></label><button type="submit" class="btn small">应用</button><span id="ai-day-error" role="alert"></span></form>`:`<label class="ai-date-label">日期<input id="ai-date" type="date" aria-label="AI诊断日期" min="${aiCoverageStart}" max="${aiCutoff}" value="${aiView.date}"></label>`}</div>`}
function aiApplyDayRange(view,start,end){aiCutoff=dashboardSyncDate();if(!start||!end||!Number.isFinite(Date.parse(start))||!Number.isFinite(Date.parse(end))||start<aiCoverageStart||end>aiCutoff||start>end)return false;view.dayStart=start;view.dayEnd=end;view.date=end;view.month=end.slice(0,7);return true}
document.addEventListener('click',e=>{const b=e.target.closest('[data-ai-daymode]');if(!b)return;aiView.dayMode=b.dataset.aiDaymode;renderInlineAI()});
document.addEventListener('submit',e=>{const form=e.target;if(!['ai-day-range-form','dx-ai-day-range-form'].includes(form.id))return;e.preventDefault();const prefix=form.id.startsWith('dx-')?'dx-':'',view=prefix?dxAI:aiView,start=$('#'+prefix+'ai-day-start').value,end=$('#'+prefix+'ai-day-end').value;if(!aiApplyDayRange(view,start,end)){$('#'+prefix+'ai-day-error').textContent='请选择有效日期，开始日期不能晚于结束日期';return}if(prefix)dxRefresh('ai');else renderInlineAI()});
function inlineAIRange(){aiCutoff=dashboardSyncDate();let start,end;if(aiView.mode==='all')return{start:aiCoverageStart,end:aiCutoff,plannedEnd:aiCutoff,label:'总览',partial:false};if(aiView.mode==='month'){start=aiView.month+'-01';const [y,m]=aiView.month.split('-').map(Number);end=iso(new Date(Date.UTC(y,m,0)))}else if(aiView.mode==='week'){const date=new Date(aiView.date+'T00:00:00Z'),offset=(date.getUTCDay()+6)%7;start=shiftDate(aiView.date,-offset);end=shiftDate(start,6)}else{start=aiView.dayMode==='range'?aiView.dayStart:aiView.date;end=aiView.dayMode==='range'?aiView.dayEnd:aiView.date}return{start,end:end>aiCutoff?aiCutoff:end,plannedEnd:end,label:{day:start===end?'日诊断':'区间诊断',week:'周诊断',month:'月诊断'}[aiView.mode],partial:end>aiCutoff}}
function inlineAIRows(){const range=inlineAIRange();return aiRecords.filter(r=>r.date>=range.start&&r.date<=range.end&&pfIncludes(aiView.chain,r.chain)&&(aiView.department==='全部'||r.department===aiView.department)&&(aiView.owner==='全部'||r.owner===aiView.owner)).sort((a,b)=>b.date.localeCompare(a.date)||((a.level==='高危'||a.level==='P0')?-1:1))}
function aiDetailTable(kind,rows){const hs=['风险 / 优先级','对应部门','对应链主','诊断明细与业务影响',kind==='priority'?'行动要求 / 计划完成':'建议行动','记录时间','操作'];return `<div class="ai-detail-table ai-no-category"><table><thead><tr>${hs.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${[
 `<span class="tag ${r.level==='高危'||r.level==='P0'?'red':'orange'}">${r.level}</span><small>${r.stage}</small>`,
 esc(r.department),`<span class="chain-owner">${esc(r.owner)}</span>`,
 `<strong>${esc(r.subject)}</strong><p>${esc(r.problem)}</p><small class="ai-source">证据来源：${esc(r.source)}</small>`,
 `<p>${esc(r.action)}</p>${r.deadline?`<small class="ai-due">计划完成：${r.deadline}</small>`:''}`,r.date,
 `<div class="ai-row-actions"><button class="link" data-ai-detail="${r.id}">查看详情</button><button class="btn soft small" data-ai-handle="${r.id}">立即处理</button></div>${aiTasks[r.id]?'<small class="ai-task-saved">已建本地任务</small>':''}`
 ].map((v,i)=>`<td data-label="${hs[i]}">${v}</td>`).join('')}</tr>`).join(''):`<tr><td class="empty" colspan="7">所选时间及筛选条件下，暂无${aiKinds.find(k=>k[0]===kind)[1]}记录</td></tr>`}</tbody></table></div>`}
function renderInlineAI(){
 const range=inlineAIRange(),rows=inlineAIRows(),counts=Object.fromEntries(aiKinds.map(([k])=>[k,rows.filter(r=>r.kind===k&&(k!=='deviation'||r.finding==='deviation')).length])),high=rows.filter(r=>r.level==='高危'||r.level==='P0').length;
 $('#aitime').textContent='链群 × 部门 × 链主 · 按分类查看明细';
 $('#ai-inline-controls').innerHTML=`<div class="ai-time-main"><div class="period-segment ai-time-segment" role="group" aria-label="AI诊断时间粒度">${[['day','日'],['week','周'],['month','月'],['all','总览']].map(([v,l])=>`<button data-ai-period="${v}" aria-pressed="${aiView.mode===v}">${l}</button>`).join('')}</div>${aiView.mode==='all'?`<span class="ai-date-cover">全部记录</span>`:aiView.mode==='month'?`<label class="ai-date-label">月份<input id="ai-month" type="month" aria-label="AI诊断月份" min="${aiCoverageStart.slice(0,7)}" max="${aiCutoff.slice(0,7)}" value="${aiView.month}"></label>`:aiView.mode==='day'?aiDayPickerHTML():`<label class="ai-date-label">${aiView.mode==='week'?'所在周':'日期'}<input id="ai-date" type="date" aria-label="AI诊断日期" min="${aiCoverageStart}" max="${aiCutoff}" value="${aiView.date}"></label>`}<span class="ai-range-label">${range.start} — ${range.end}</span></div><div class="ai-dimension-filters"><label>链群<select multiple data-pf-multiple id="ai-chain" aria-label="AI链群筛选"><option>全部</option>${chains.map(c=>`<option ${pfOptionSelected(aiView.chain,c)?'selected':''}>${c}</option>`).join('')}</select></label><label>部门<select id="ai-department" aria-label="AI部门筛选"><option>全部</option>${depts.map(d=>`<option ${d===aiView.department?'selected':''}>${d}</option>`).join('')}</select></label><label>链主<select id="ai-owner" aria-label="AI链主筛选"><option>全部</option>${aiOwners.map(o=>`<option ${o===aiView.owner?'selected':''}>${o}</option>`).join('')}</select></label><button class="link" id="ai-reset">重置筛选</button></div>`;
 $('#aigrid').innerHTML=aiKinds.map(([kind,title,unit],i)=>`<button type="button" class="aicard ${kind===aiView.kind?'selected':''}" data-ai-kind="${kind}" aria-pressed="${kind===aiView.kind}" aria-controls="ai-inline-details"><h3>${title}</h3><div class="an num ${i===0?'red':i===2?'blue':''}">${counts[kind]}<span>${unit==='卡点'?'个':'项'}</span></div><p>${['定位阶段阻塞与业务影响','识别流程、重心及协同偏差','明确行动要求与计划完成日期','展示建议、涉及资源及决策边界'][i]}</p></button>`).join('');
 $('#ai-inline-summary').innerHTML=`<span class="ai-logo" aria-hidden="true"><b>AI</b></span><p>${rows.length?`${range.label} · 全部类型共 <b>${rows.length}</b> 条诊断记录，涉及 <b>${new Set(rows.map(r=>r.chain)).size}</b> 个链群、<b>${new Set(rows.map(r=>r.department)).size}</b> 个部门、<b>${new Set(rows.map(r=>r.owner)).size}</b> 位链主；其中 <b class="red">${high}</b> 条为高危或 P0，建议优先核实并安排闭环。`:'所选条件下暂无诊断记录，可调整时间、链群、部门或链主。'}</p>`;
 $('#ai-inline-details').innerHTML=aiKinds.map(([kind,title],i)=>kind!==aiView.kind?'':`<section class="ai-detail-block" id="ai-detail-${kind}" aria-labelledby="ai-detail-title-${kind}"><div class="ai-detail-heading"><div class="titlegroup"><span class="ai-detail-index">0${i+1}</span><h3 id="ai-detail-title-${kind}">${title}</h3><span class="tag">${counts[kind]} ${kind==='block'?'个':'项'}</span></div><span class="note">${['按项目归集主要卡点','按期间记录统计','计划日期保留原始记录','仅为建议，需负责人确认'][i]}</span></div>${aiDetailTable(kind,rows.filter(r=>r.kind===kind))}</section>`).join('');
 $('#ai-inline-foot').textContent=`演示诊断 · 数据截至 ${aiCutoff} · 同一项目可出现在不同诊断类型中，条目数不等于项目数。历史行动项仅供复盘。`;
 $('#ai-reset').onclick=()=>{aiView.chain=aiView.department=aiView.owner='全部';renderInlineAI()};
 for(const [id,key] of [['ai-chain','chain'],['ai-department','department'],['ai-owner','owner']])$('#'+id).onchange=e=>{aiView[key]=pfControlValue(e.target);renderInlineAI()};
 if($('#ai-date'))$('#ai-date').onchange=e=>{const v=e.target.value;if(!e.target.checkValidity()||v<aiCoverageStart||v>aiCutoff){toast('请选择 '+aiCoverageStart+' 至 '+dashboardToday()+' 内的日期');renderInlineAI();return}aiView.date=v;aiView.month=v.slice(0,7);renderInlineAI()};
 if($('#ai-month'))$('#ai-month').onchange=e=>{const v=e.target.value;if(!e.target.checkValidity()||v<aiCoverageStart.slice(0,7)||v>dashboardToday().slice(0,7)){toast('请选择 '+aiCoverageStart.slice(0,7)+' 至 '+dashboardToday().slice(0,7)+' 内的月份');renderInlineAI();return}aiView.month=v;aiView.date=v===aiCutoff.slice(0,7)?aiCutoff:v+'-01';renderInlineAI()};
}
renderAI=renderInlineAI;
document.addEventListener('click',e=>{const b=e.target.closest('[data-ai-period]');if(!b)return;aiView.mode=b.dataset.aiPeriod;renderInlineAI()});
document.addEventListener('click',e=>{const b=e.target.closest('[data-ai-kind]');if(!b)return;aiView.kind=b.dataset.aiKind;renderInlineAI();$(`[data-ai-kind="${aiView.kind}"]`).focus({preventScroll:true})});
$('#refreshai').onclick=()=>{renderInlineAI();toast('已刷新当前筛选下的演示诊断，未调用真实 AI 服务')};