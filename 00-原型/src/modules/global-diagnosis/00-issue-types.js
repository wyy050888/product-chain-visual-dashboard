// 工作聚焦偏差类型字典；日志按状态筛选，其余业务分类由各自Tab负责。
const gdIssueTypes={
 'focus-direction':{label:'工作方向疑似偏离',scope:'execution/focus'},
 'focus-risk-response':{label:'重大风险响应不足',scope:'execution/focus'},
 'focus-interruption':{label:'重点工作推进中断',scope:'execution/focus'},
};
function gdWithIssueType(row){
 let type=row.issueType;
 if(!gdIssueTypes[type])throw new Error('事项未配置诊断类型：'+row.id);
 return {...row,issueType:type};
}
function gdIssueTypeOptions(part=gdState.part,tab=gdState.tabs[part]){const scope=part==='execution'?part+'/'+tab:part;return Object.entries(gdIssueTypes).filter(([,type])=>type.scope===scope)}

// 状态筛选使用现有状态码，日志与待办分别定义，避免新增办理状态。
const gdLogStatuses={missing:'未抓取到',incomplete:'内容待补齐',late:'逾期补交'};
function gdStatusValue(row){return row.task?.status||'suggested'}
function gdStatusOptions(part=gdState.part,tab=gdState.tabs[part]){
 return Object.entries(upTodoStatuses).filter(([key])=>key!=='suggested');
}

// 原因取自抓取记录与已有聚焦证据，只补充展示，不改写任务或作出失职结论。
function gdDiagnosisReasons(row){
 const stamp=value=>value?String(value).replace('T',' ').slice(0,19):'—';
 if(row.kind==='report'){
  const reasons=[],log=`${row.logOwner||row.owner} · ${row.type} · ${row.date}`;
  if(row.missing)return [{key:'log-missing',label:'未匹配到日志',basis:`${log}；应交时间 ${stamp(row.deadline)}。截至 ${stamp(row.capturedAt)} 抓取未匹配，需核实是否已提交或尚未同步。`}];
  if(row.incomplete){
   const fields=[['progress','工作进展'],['reportProblem','当前问题'],['next','下一步安排']];
   for(const [key,label] of fields)if(!String(row[key]||'').trim())reasons.push({key:'log-empty-'+key,label:label+'未填写',basis:`${log}；已抓取到日志，但“${label}”为空，需补齐后复核。`});
  }
  if(row.late)reasons.push({key:'log-late',label:'日志晚交',basis:`${log}；应交 ${stamp(row.deadline)}，实际提交 ${stamp(row.submitted)}。`});
  return reasons;
 }
 const evidence=row.kind==='focus'?row.focusEvidence:null;if(!evidence)return [];
 const owner=evidence.meeting.owner,range=evidence.window,logs=evidence.logs||[];
 const own=logs.filter(log=>log.owner===owner&&log.date>=range.start&&log.date<=range.end),prior=logs.filter(log=>log.owner===owner&&log.date<range.start),peers=logs.filter(log=>log.owner!==owner&&log.date>=range.start&&log.date<=range.end);
 const window=`${range.start}—${range.end}，${owner}的${own.length}条已抓取日志`;
 const decision=String(evidence.meeting.decision||'').replace(/[。；;\s]+$/,''),risk=String(evidence.risk?.text||'关联业务预警仍存在').replace(/[。；;\s]+$/,'');
 const types={
  'focus-direction':{label:'重点动作未见记录',basis:`${evidence.meeting.date}会议分工：${decision}。${window}未见相关动作；同期有${peers.length}条协作记录涉及该重点，需核实实际推进情况。`},
  'focus-risk-response':{label:'风险复核未见记录',basis:`${risk}。${window}未见该产品复核或整改验证记录，需核实是否已开展但未记录。`},
  'focus-interruption':{label:'后续推进未见记录',basis:`${evidence.meeting.date}会议分工：${decision}。前期已有${prior.length}条推进记录；${window}未见后续推进，需核实是否中断或未记录。`}
 };
 return types[row.issueType]?[{key:row.issueType,...types[row.issueType]}]:[];
}
