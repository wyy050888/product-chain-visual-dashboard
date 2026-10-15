

// Illustrative report evidence; no live document ingestion or model inference.
aiView.reportType='all';aiView.finding='all';
const deviationSources=[['all','全部记录'],['daily','日报'],['weekly','周报'],['meeting','会议记录']];
const deviationFindings=[['all','全部结果'],['deviation','存在偏差'],['normal','暂无明显偏差'],['verify','待核实']];
const reportEvidence=[
 {type:'daily',title:'产品立项评估日报',author:'许宁',period:'2026-09-16',plan:'今日提交竞品对比表、成本测算表，完成立项资料预审。',actual:'已提交产品概念方案；竞品对比与成本测算尚未上传，拟直接推进立项评审。',next:'申请安排立项评审会议。',basis:'计划要求提交 2 份关键附件，实际记录中两份均未完成，下一步却已进入评审。',comparison:'对照当日计划：必要交付物缺失。',source:'产品日报 · DR-204'},
 {type:'meeting',title:'跨链需求协调会记录',author:'沈舟',period:'2026-09-16 10:00–10:30',plan:'会上明确样机支持事项的负责人、回复时限及验收方式。',actual:'会议决议：由相关部门协调样机；记录中未明确具体责任人、回复日期与验收人。',next:'各部门会后继续沟通。',basis:'决议使用“相关部门协调”，未形成明确人员与日期，不能据此追踪闭环。',comparison:'对照会议目标：责任与时限尚未落实。',source:'会议记录 · MT-203'},
 {type:'daily',title:'研发资源投入日报',author:'王磊',period:'2026-09-15',plan:'优先保障洗地机高风险版本验证，今日计划投入 6 小时。',actual:'高风险版本验证实际投入 2 小时，低优先级外观优化投入 6 小时；昨日验证投入 4 小时。',next:'尚未重新确认验证完成日期。',basis:'高优先级验证投入较计划少 4 小时，较昨日减少 2 小时；低优先级事项占用主要工时。',comparison:'较昨日恶化：验证投入 4 → 2 小时；同时偏离当日计划。',source:'研发日报 · DR-201'},
 {type:'weekly',title:'采购供应商配置周报',author:'唐琪',period:'2026-09-14 — 2026-09-20（周内更新）',plan:'先复核现有供应商能力，优先复用已具备相近工艺的供应资源。',actual:'本周已启动 3 家新供应商寻源，尚未完成现有供应商能力清单复核。',next:'继续新增寻源，未安排存量能力复核。',basis:'计划优先复核存量资源，当前实际及下一步均侧重新增寻源，缺少复用评估。',comparison:'对照本周计划：寻源顺序与资源投入重点偏移。',source:'采购周报 · WR-202'},
 {type:'weekly',title:'品质整改闭环周报',author:'刘畅',period:'2026-09-07 — 2026-09-13（周内更新）',plan:'完成复测并同步全部测试证据，更新项目整改状态。',actual:'已填写复测结论，但测试附件未归档，项目台账仍为待确认。',next:'等待补充附件后更新台账。',basis:'“复测完成”缺少完整证据支持，且跨系统状态未同步。',comparison:'对照闭环要求：结论、证据与台账状态不一致。',source:'品质周报 · WR-205'},
 {type:'meeting',title:'研发方案交接会议记录',author:'王磊',period:'2026-08-26 14:00–14:40',plan:'采购签收新版物料清单后，才按新版本发起打样。',actual:'会议确认研发方案已更新，但采购仍使用旧版物料清单，未记录新版签收。',next:'研发会后发送新版本，采购确认收到后再打样。',basis:'方案版本已更新，但采购侧交接确认缺失，存在用错物料清单的风险。',comparison:'对照交接约定：版本签收未完成。',source:'会议记录 · MT-206'}
];
aiRecords.filter(r=>r.kind==='deviation').forEach((r,i)=>{r.report=reportEvidence[i];r.finding='deviation';r.source=r.report.source});
const extraReports=[
 {id:'deviation-daily-normal',chain:'厨房链',department:'采购部',owner:'周铭',date:'2026-09-16',subject:'样机物料交付',level:'正常',stage:'按计划推进',finding:'normal',problem:'日报中计划与实际交付一致，未识别出明显工作偏差。',action:'按原计划跟进明日样机验收，并补充验收结果。',report:{type:'daily',title:'样机物料交付日报',author:'唐琪',period:'2026-09-16',plan:'今日完成 3 项样机物料交付，并上传签收单。',actual:'3 项物料均已交付，签收单已归档，未记录新增阻塞。',next:'明日按计划完成样机验收。',basis:'计划交付 3 项，实际完成 3 项；交付数量、证据和下一步安排一致。',comparison:'对照当日计划：暂无明显偏差。',source:'采购日报 · DR-207'}},
 {id:'deviation-weekly-normal',chain:'环境链',department:'品质部',owner:'陈嘉',date:'2026-09-15',subject:'冷风扇品质验证周进度',level:'正常',stage:'按计划推进',finding:'normal',problem:'已提交周报中的验证项目全部完成，未识别出明显偏差。',action:'保持当前验证安排，持续跟踪下一阶段结果。',report:{type:'weekly',title:'品质验证周报',author:'刘畅',period:'2026-09-07 — 2026-09-13',plan:'本周完成 5 项品质验证，异常项全部留存复测记录。',actual:'5 项验证均已完成，1 项异常复测通过并归档，周报注明无遗留阻塞。',next:'下一周开展试产抽检。',basis:'计划与完成数量一致，异常复测已记录；现有记录没有显示未闭环事项。',comparison:'对照本周计划：暂无明显偏差。',source:'品质周报 · WR-208'}},
 {id:'deviation-meeting-verify',chain:'个护 & 健康链',department:'项目部',owner:'许宁',date:'2026-09-16',subject:'吹风机试产排期确认',level:'待核实',stage:'缺少对照依据',finding:'verify',problem:'会议记录未提供原批准排期和最新资源确认，暂不能判断是否发生延期偏差。',action:'补充原计划、最新资源确认及调整后的交付日期，再核实是否偏离计划。',report:{type:'meeting',title:'试产排期碰头会记录',author:'沈舟',period:'2026-09-16 15:00–15:20',plan:'核实试产排期是否满足已批准的交付计划。',actual:'纪要仅写“试产待资源确认后安排”，未附原计划日期和当前设备排期。',next:'待项目部补充排期依据。',basis:'缺少原计划及当前资源状态，现有记录不足以断定延期或责任归属。',comparison:'证据不足：暂不作偏差结论。',source:'会议记录 · MT-209'}}
];
extraReports.forEach(r=>aiRecords.push({...r,kind:'deviation',source:r.report.source,deadline:null}));
function deviationResult(r){return deviationFindings.find(([k])=>k===r.finding)?.[1]||'待核实'}
function deviationTag(r){return `<span class="tag ${r.finding==='normal'?'green':r.finding==='verify'?'orange':r.level==='P0'?'red':'orange'}">${deviationResult(r)}</span>`}
function deviationRows(rows){return rows.filter(r=>(aiView.reportType==='all'||r.report.type===aiView.reportType)&&(aiView.finding==='all'||r.finding===aiView.finding))}
function renderDeviationReports(rows){
 const list=deviationRows(rows),count=k=>list.filter(r=>r.finding===k).length;
 const filters=`<div class="deviation-filters"><div class="period-segment" role="group" aria-label="工作记录类型">${deviationSources.map(([key,label])=>`<button type="button" data-report-type="${key}" aria-pressed="${aiView.reportType===key}">${label}<span>${key==='all'?rows.length:rows.filter(r=>r.report.type===key).length}</span></button>`).join('')}</div><label>AI 判断<select id="deviation-result-filter" aria-label="工作偏差分析结果">${deviationFindings.map(([v,l])=>`<option value="${v}" ${v===aiView.finding?'selected':''}>${l}</option>`).join('')}</select></label></div>`;
 const summary=`<div class="deviation-summary" aria-live="polite"><span>当前 <b>${list.length}</b> 条记录</span><span class="orange">存在偏差 <b>${count('deviation')}</b></span><span class="green">暂无明显偏差 <b>${count('normal')}</b></span><span class="muted">待核实 <b>${count('verify')}</b></span></div>`;
 const headers=['来源记录','类目 / 部门 / 链主','工作记录摘要','AI 偏差分析','建议行动','操作'];
 const content=list.length?`<div class="deviation-table"><table><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${list.map(r=>`<tr data-deviation-record="${r.id}" data-report-source="${r.report.type}">${[
 `<span class="tag">${deviationSources.find(([k])=>k===r.report.type)[1]}</span><strong>${esc(r.report.title)}</strong><small>${esc(r.report.author)} · 提交 ${r.date}</small><small>记录范围：${esc(r.report.period)}</small>`,
 `<strong>${esc(r.chain)}</strong><p>${esc(r.department)}</p><small>链主：${esc(r.owner)}</small>`,
 `<div class="deviation-excerpt"><p><b>计划</b>${esc(r.report.plan)}</p><p><b>实际</b>${esc(r.report.actual)}</p></div>`,
 `${deviationTag(r)}<strong>${esc(r.stage)}${r.finding==='deviation'?' · '+esc(r.level):''}</strong><p>${esc(r.problem)}</p><div class="deviation-evidence"><b>判断依据</b>${esc(r.report.basis)}</div><small>${esc(r.report.comparison)}</small>`,
 `<p>${esc(r.action)}</p>`,
 `<div class="ai-row-actions"><button class="link" data-ai-detail="${r.id}">查看详情</button><button class="btn soft small" data-ai-handle="${r.id}">立即处理</button></div>${aiTasks[r.id]?'<small class="ai-task-saved">已建本地任务</small>':''}`
 ].map((v,i)=>`<td data-label="${headers[i]}">${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<div class="empty deviation-empty">当前时间、组织和记录类型下暂无匹配记录，可调整筛选条件。</div>';
 return `${filters}${summary}${content}<p class="deviation-foot">按记录提交日期筛选；日报、周报、会议记录为记录类型，与上方日 / 周 / 月的时间范围独立。示例记录与 AI 分析供页面演示，未连接真实日志或 AI 服务。</p>`;
}
const aiTableBeforeReports=aiDetailTable;
aiDetailTable=function(kind,rows){return kind==='deviation'?renderDeviationReports(rows):aiTableBeforeReports(kind,rows)};
const aiRenderBeforeReports=renderInlineAI;
renderInlineAI=function(){aiRenderBeforeReports();$('[data-ai-kind="deviation"] .an span').textContent='项偏差';$('[data-ai-kind="deviation"] p').textContent='日报 / 周报 / 会议记录偏差分析';if(aiView.kind==='deviation'){
 const all=inlineAIRows().filter(r=>r.kind==='deviation'),visible=deviationRows(all);
 $('#ai-detail-deviation .ai-detail-heading .tag').textContent=`${visible.length} 条记录`;
 $('#ai-detail-deviation .ai-detail-heading>.note').textContent='对照工作计划与实际进展，定位偏差依据';
 $('#deviation-result-filter').onchange=e=>{aiView.finding=e.target.value;renderInlineAI()};
 }const reset=$('#ai-reset').onclick;$('#ai-reset').onclick=()=>{aiView.reportType=aiView.finding='all';reset()};};
renderAI=renderInlineAI;
document.addEventListener('click',e=>{const b=e.target.closest('[data-report-type]');if(!b)return;aiView.reportType=b.dataset.reportType;renderInlineAI();$(`[data-report-type="${aiView.reportType}"]`).focus({preventScroll:true})});
const openAIRecordBeforeReports=openAIRecord;
openAIRecord=function(id){const r=aiRecords.find(r=>r.id===id);openAIRecordBeforeReports(id);if(!r?.report)return;
 $('#dialogbody .ai-detail-hero .tag').outerHTML=deviationTag(r);
 $('#dialogbody .ai-context-grid').insertAdjacentHTML('afterend',`<div class="deviation-source-detail"><div class="titlegroup"><span class="tag">${deviationSources.find(([k])=>k===r.report.type)[1]}</span><h3>${esc(r.report.title)}</h3></div><p class="note">提交人：${esc(r.report.author)} · 提交日期：${r.date} · ${esc(r.source)}</p><p class="note">记录范围：${esc(r.report.period)}</p><dl><dt>工作计划</dt><dd>${esc(r.report.plan)}</dd><dt>实际进展</dt><dd>${esc(r.report.actual)}</dd><dt>下一步安排</dt><dd>${esc(r.report.next)}</dd><dt>AI 判断依据</dt><dd>${esc(r.report.basis)}</dd><dt>对照结果</dt><dd>${esc(r.report.comparison)}</dd></dl></div>`);
};