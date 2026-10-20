// 唯一只读依据入口；四个模块的内容组织由05-evidence-content.js维护。
const gdPreviousDrawerProfile=drawerProfile;
drawerProfile=function(body,title){const root=body.querySelector(':scope>.gd-dialog');return root?{root,entries:[...root.children].map(node=>({node,key:'shared'})),tabs:[]}:gdPreviousDrawerProfile(body,title)};
function gdFind(id,data=gdDataset()){return [...data.reports,...data.focus,...data.coordination,...data.resource,...data.tasks,...data.meetings].find(r=>r.id===id)}
function gdTextSection(title,value){return value?`<section class="gd-detail-section gd-text-section"><h4>${title}</h4><p>${esc(value)}</p></section>`:''}
function gdLogMarkup(log){
 const stamp=value=>value?value.slice(0,16).replace('T',' '):'—';
 return `<div class="gd-log-content">${log.missing?'<p class="gd-source-note">本次抓取未匹配到对应日志，提交情况待核实。</p>':''}<dl class="gd-source-info">${[['日志类型',log.type],['提交人',log.owner],['工作日期',log.date],['提交时间',stamp(log.submitted)],['抓取时间',stamp(log.capturedAt)]].map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>${log.missing?'':`<div class="gd-excel-record">${[['工作进展',log.progress],['当前问题',log.reportProblem],['下一步',log.next||'未填写']].map(([label,value])=>`<div><b>${label}</b><span>${esc(value)}</span></div>`).join('')}</div>`}</div>`;
}
function gdFocusEvidence(row){
 if(row.focusEvidence)return row.focusEvidence;
 const id=row.task?.gdIssue||row.gdIssue;
 return id?.startsWith('focus-')?gdDataset().focus.find(r=>r.id===id&&r.task.id===(row.task?.id||row.id))?.focusEvidence:null;
}
function gdFocusMarkup(focus){
 const section=gdTextSection;
 const risk=focus.risk?.active?section('业务风险',focus.risk.text+'\n统计期间：'+focus.risk.range.start+' — '+focus.risk.range.end):'';
 return `<dl class="gd-source-info"><div><dt>观察范围</dt><dd>${focus.window.start} — ${focus.window.end}</dd></div><div><dt>本人日志抓取覆盖</dt><dd>${focus.coverage.start} — ${focus.coverage.end}</dd></div></dl>${section('当前应关注什么',focus.expected)}${section('抓取材料显示在做什么',focus.observed)}${section('发现的偏差',focus.deviation)}${risk}`;
}
function gdFocusSourcesMarkup(focus){return `${gdMeetingMarkup(focus.meeting)}<section class="gd-detail-section gd-log-sources"><h4>日志来源</h4><div class="gd-excel-record">${focus.logs.map(log=>`<div><b>${esc(log.owner)}<br>${log.date}</b><span>${esc(log.type)} · ${esc(log.logId)}<br>提交 ${esc(log.submitted.slice(0,16).replace('T',' '))} · 抓取 ${esc(log.capturedAt.slice(0,16).replace('T',' '))}</span></div>`).join('')}</div></section>`;}
function gdOpenEvidence(row){
 const issueId=row.kind==='task'?(row.task?.gdIssue||row.gdIssue):row.id,focus=gdFocusEvidence(row),meeting=focus?null:gdMeetingReference(issueId);
 const task=row.kind==='report'?null:row.task||gdProposal(row),content=gdEvidenceContent(row,{focus,meeting,task});
 openModal('诊断依据',`<article class="gd-dialog" data-gd-evidence="${esc(row.id)}" data-gd-evidence-module="${content.module}"><div class="gd-detail-head">${gdTag(content.label)}<h3>${esc(row.title)}</h3><div>${esc(row.sourceName)} · ${esc(row.objectName)} · ${esc(row.owner)} · ${esc(row.date)}</div></div>${content.body}</article>`);
 if(task&&!task.deletedAt)$('#dialogactions').insertAdjacentHTML('afterbegin',gdButton('task',row.id,task.status==='suggested'?'下发任务':'跟进任务',task.status));
}
