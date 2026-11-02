// 待办依据只读展示可定位原记录；按原事项和任务编号匹配，不借用同类事项的材料。
function gdTodoBasisOrigin(row,task){
 if(row.isWorkTask&&row.task?.id===task.id)return row;
 const data=gdRenderedData||gdDataset();
 if(task.gdIssue)return data.origins.find(item=>item.id===task.gdIssue&&(item.task||gdProposal(item)).id===task.id)||null;
 return null;
}
function gdTodoBasisStamp(value){return value?String(value).replace('T',' ').slice(0,19):'未记录'}
function gdTodoMeetingBasis(meeting){
 return {sourceType:'会议纪要',source:['钉钉文档 Excel',meeting.file,`${meeting.sheet} · 第${meeting.row}行`,meeting.date].filter(Boolean).join('\n'),date:meeting.date,sourceName:meeting.file,capturedAt:meeting.capturedAt,capturedDate:meeting.capturedDate,
  content:[['议题',meeting.subject],['讨论记录',meeting.discussion],['会议决议',meeting.decision]].filter(([,value])=>value).map(([label,value])=>label+'：'+value).join('\n')};
}
function gdTodoLogBasis(log){
 const person=log.logOwner||log.owner;
 const source=[log.missing?'钉钉日志抓取记录':'钉钉日志',[person,log.type].filter(Boolean).join(' · '),log.date].filter(Boolean).join('\n');
 const content=log.missing?`应交时间：${gdTodoBasisStamp(log.deadline)}\n抓取时间：${gdTodoBasisStamp(log.capturedAt)}\n抓取结果：未匹配到对应日志，需核实是否未提交或尚未同步。`:
  [['工作进展',log.progress],['当前问题',log.reportProblem??log.problem],['下一步安排',log.next]].map(([label,value])=>label+'：'+(String(value||'').trim()||'未填写')).join('\n')+`\n提交时间：${gdTodoBasisStamp(log.submitted)}\n抓取时间：${gdTodoBasisStamp(log.capturedAt)}`;
 return {source,content,sourceType:log.missing?'钉钉日志抓取记录':'钉钉'+(log.type||'日志'),sourceName:log.name,reportType:log.type,owner:person,department:log.department,date:log.date,capturedAt:log.capturedAt,capturedDate:log.capturedDate};
}
function gdTodoBasisSources(origin,task){
 if(upTodoHasOrigin(task))return task.originEvidence.sources.map(source=>({...source}));
 if(origin?.sources?.length&&origin.sources.every(source=>source&&typeof source==='object'&&source.content))return origin.sources.map(source=>({...source}));
 const focus=origin?.focusEvidence;
 if(focus){
  const sources=[gdTodoMeetingBasis(focus.meeting),...focus.logs.map(gdTodoLogBasis)];
  if(focus.coverage)sources.push({source:'钉钉日志抓取清单 · '+focus.coverage.owner,content:`抓取覆盖：${focus.coverage.start} — ${focus.coverage.end}\n覆盖状态：${focus.coverage.complete?'完整':'未确认完整'}`});
  if(focus.risk?.active)sources.push({source:'业务预警记录 · '+(origin.sourceName||'关联业务看板'),content:focus.risk.text+(focus.risk.range?'\n统计期间：'+focus.risk.range.start+' — '+focus.risk.range.end:'')});
  return sources;
 }
 if(origin?.kind==='report')return [gdTodoLogBasis(origin)];
 const meeting=origin&&gdMeetingReference(origin.id);if(meeting)return [gdTodoMeetingBasis(meeting)];
 if(origin)return [{source:[origin.sourceName||'业务分析',origin.objectName,'截止 '+(origin.date||DATA_CUTOFF)].filter(Boolean).join('\n'),sourceType:origin.sourceName||'业务分析',sourceName:origin.objectName,date:origin.date||DATA_CUTOFF,capturedDate:DATA_CUTOFF,content:origin.impact||origin.problem||task.description}];
 return [{source:'原待办保存记录（未保存具体来源定位）',content:task.description||task.basis?.join('\n')||'未保存原始内容'}];
}
// 已知原事项下发时保存对应材料；只按明确的任务身份补齐旧样例。
function gdTaskOriginEvidence(row,task){
 const sources=gdTodoBasisSources(row,{...task,originEvidence:null}).map((source,index)=>{
  const date=source.date||row.date||DATA_CUTOFF,stamp={...source,date,capturedAt:source.capturedAt||(!source.capturedDate?new Date().toISOString():undefined)},location=gdSourceLocation(stamp);
  const name=source.sourceName||(location.name==='未记录来源名称'?row.objectName+'相关记录':location.name),prefix=source.department+' · ';
  return Object.fromEntries(Object.entries(diagnosisNormalizeSource({...stamp,id:source.id||task.id+'|source|'+index,sourceName:source.department&&name.startsWith(prefix)?name.slice(prefix.length):name})).filter(([,value])=>value!==undefined));
 });
 return {version:1,mode:'records',originId:row.id,analysis:row.causalProblem||row.problem||task.gdProblem||task.description,sources};
}
function gdBindTaskOrigins(rows){
 const next={...upTodos};let changed=false;
 for(const row of rows){
  const task=next[row.workTaskId||gdProposal(row).id];
  if(!task||task.deletedAt||upTodoHasOrigin(task)&&task.originEvidence.mode==='records'&&(!row.isWorkTask||task.originEvidence.originId===row.id))continue;
  next[task.id]={...task,originEvidence:gdTaskOriginEvidence(row,task)};changed=true;
 }
 if(changed)upPersistTodos(next);
}
function gdTodoBasisMarkup(row,task){
 const bound=upTodoHasOrigin(task),origin=bound?null:gdTodoBasisOrigin(row,task),sources=gdTodoBasisSources(origin,task);
 const reason=bound?'<p>'+esc(task.originEvidence.analysis)+'</p>':origin?.isWorkTask?'<p>'+esc(origin.causalProblem||origin.problem)+'</p>':origin?(gdDiagnosisReasons(origin).length?gdActionEvidenceMarkup(origin):'<p>'+esc(task.gdProblem||gdActionRecipe(origin).problem)+'</p>'):'<p>未保存独立的AI判定说明。</p>';
 return '<div class="gd-todo-basis"><section data-todo-basis-reason><h5>'+(task.originEvidence?.analysisKind==='record'?'事项说明':'AI判定')+'</h5>'+reason+'</section><section data-todo-basis-sources><h5>任务依据</h5><div class="gd-todo-basis-table-wrap"><table class="gd-todo-basis-table" aria-label="待办依据来源与内容"><colgroup><col style="width:30%"><col></colgroup><thead><tr><th scope="col">来源</th><th scope="col">内容</th></tr></thead><tbody>'+sources.map(source=>'<tr data-todo-basis-source><td data-todo-basis-location>'+gdSourceLocationMarkup(source)+'</td><td data-todo-basis-content>'+esc(source.content)+'</td></tr>').join('')+'</tbody></table></div></section></div>';
}
