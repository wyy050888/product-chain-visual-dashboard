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
function gdStatusValue(row){return row.kind==='report'?(row.missing?'missing':row.incomplete?'incomplete':row.late?'late':'submitted'):row.task.status}
function gdStatusOptions(part=gdState.part,tab=gdState.tabs[part]){
 if(part==='closure')return []; // 任务状态统一由Tab筛选。
 if(part==='execution'&&tab==='reports')return Object.entries(gdLogStatuses);
 return Object.entries(upTodoStatuses).map(([key,label])=>[key,key==='suggested'&&part==='execution'?'待核实':label]);
}
