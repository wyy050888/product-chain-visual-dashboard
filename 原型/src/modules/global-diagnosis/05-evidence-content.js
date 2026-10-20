// 四个模块各自组织依据内容，共用分区和只读字段组件。
function gdEvidenceBlock(key,title,content){return content?`<section class="gd-evidence-block" data-gd-evidence-block="${key}"><h4 class="gd-block-title">${title}</h4><div class="gd-block-content">${content}</div></section>`:''}
function gdEvidenceInfo(fields){return `<dl class="gd-source-info">${fields.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value??'—')}</dd></div>`).join('')}</dl>`}
function gdEvidenceOptions(options){return options?.length?`<div class="gd-excel-record">${options.map(([label,value])=>`<div><b>${esc(label)}</b><span>${esc(value)}</span></div>`).join('')}</div>`:''}
function gdOriginalEvidence(row,{focus,meeting,task}){
 if(focus)return gdFocusMarkup(focus)+gdFocusSourcesMarkup(focus);
 if(meeting)return gdMeetingMarkup(meeting);
 return gdTextSection('关联业务',row.sourceName)+gdTextSection('来源记录',task?.basis?.join('\n'));
}
function gdExecutionEvidence(row,{focus}){
 if(row.kind==='report')return gdEvidenceBlock('diagnosis','日志诊断',gdTextSection('日志状态',gdLogStatuses[gdStatusValue(row)]||row.status)+gdTextSection('异常情况',row.problem))+gdEvidenceBlock('source','钉钉日志',gdLogMarkup(row));
 return gdEvidenceBlock('comparison','工作重点对照',gdFocusMarkup(focus))+gdEvidenceBlock('action','建议动作',gdTextSection('核实与调整',row.action))+gdEvidenceBlock('source','原始依据',gdFocusSourcesMarkup(focus));
}
function gdTaskEvidence(row,context){
 const task=context.task;
 const basic=gdEvidenceInfo([['任务状态',upTodoStatuses[task.status]],['负责人',upTodoPersonLabel(task.assignee,task)],['截止日期',task.due||'—'],['下发人',task.assignedBy||'—'],['下发日期',upTodoDate(task.assignedAt)],['实际完成日期',upTodoDate(task.completedAt)]]);
 const progress=gdTextSection('问题描述',upTodoDescriptionText(task))+gdTextSection('处理要求',task.plan)+gdTextSection('处理结果',task.evidence?.trim());
 return gdEvidenceBlock('task','任务概况',basic)+gdEvidenceBlock('progress','执行情况',progress)+gdEvidenceBlock('source','原始依据',gdOriginalEvidence(row,context));
}
function gdCoordinationEvidence(row,context){
 const info=gdEvidenceInfo([['事项类别',row.kind==='decision'?'待决策项':'协同卡点'],['牵头人',row.owner],['期望日期',row.due],['参与部门',row.departments?.join('、')||'—']]);
 const issue=gdTextSection(row.kind==='decision'?'待决策问题':'协同卡点',row.problem)+gdTextSection('业务影响',row.impact);
 return gdEvidenceBlock('coordination','协同事项',info+issue)+gdEvidenceBlock('options','建议方案',gdEvidenceOptions(row.options)+gdTextSection('建议动作',row.action))+gdEvidenceBlock('source','会议依据',gdOriginalEvidence(row,context));
}
function gdResourceEvidence(row,context){
 const info=gdEvidenceInfo([['资源类型',row.resource],['问题类型',row.kind==='conflict'?'排期冲突':'资源缺口'],['跟进人',row.owner],['期望日期',row.due]]);
 const problem=gdTextSection('资源问题',row.problem)+gdTextSection('业务影响',row.impact)+gdTextSection('涉及部门',row.departments?.join('、'));
 const options=gdEvidenceOptions(row.options)+gdTextSection('建议动作',row.action);
 return gdEvidenceBlock('resource','资源分析',info+problem)+gdEvidenceBlock('options','建议方案',options)+gdEvidenceBlock('source','原始依据',gdOriginalEvidence(row,context));
}
function gdEvidenceContent(row,context){
 const module=row.kind==='report'||row.kind==='focus'?'execution':row.kind==='task'||row.kind==='meeting'?'closure':['block','decision'].includes(row.kind)?'coordination':'resource';
 const label=gdParts.find(([key])=>key===module)[1]+(module==='execution'?' · '+(row.kind==='report'?'日志诊断':'工作聚焦'):'');
 const render={execution:gdExecutionEvidence,closure:gdTaskEvidence,coordination:gdCoordinationEvidence,resource:gdResourceEvidence};
 return {module,label,body:render[module](row,context)};
}
