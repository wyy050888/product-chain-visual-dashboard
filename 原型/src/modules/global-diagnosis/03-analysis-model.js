const gdCorePolicy={delayDays:14,productLevels:['S','A'],profitBelow:0};
const gdCoreCriteria=[
 {key:'safety',label:'安全合规红线',description:'触发安规不合格、强制认证失效或召回风险',test:f=>f.safetyNoncompliance===true},
 {key:'delivery',label:'交付持续延期',description:`进行中的红灯项目延期 ≥ ${gdCorePolicy.delayDays} 天`,test:f=>f.projectState==='进行中'&&f.status==='红灯'&&Number(f.delay)>=gdCorePolicy.delayDays},
 {key:'margin',label:'核心产品亏损',description:`${gdCorePolicy.productLevels.join(' / ')} 级产品的当前利润率 < ${gdCorePolicy.profitBelow}%`,test:f=>gdCorePolicy.productLevels.includes(f.level)&&Number.isFinite(f.profit)&&f.profit<gdCorePolicy.profitBelow}
];
const gdCoreStandards=gdCoreCriteria.map(r=>[r.label,r.description]);
function gdCoreCriterion(facts){return gdCoreCriteria.find(rule=>rule.test(facts))||null}
let gdTaskSamplesInitialized=false;
function gdInitializeTaskSamples(origins){
 if(gdTaskSamplesInitialized)return;gdTaskSamplesInitialized=true;gdEnsureTasks();
 if(Object.values(upTodos).some(t=>t.source==='global-diagnosis'))return;
 const selected=['coordinate-project','coordinate-margin','resource-s-core'].map(id=>origins.find(r=>r.id===id)).filter(Boolean);
 gdAutoAssign(selected);
 const next={...upTodos},now=new Date().toISOString();
 for(const [originId,status] of [['coordinate-margin','working'],['resource-s-core','done']]){
  const origin=selected.find(r=>r.id===originId);if(!origin)continue;const task=next[gdProposal(origin).id];
  const responsibilities=task.responsibilities.map((r,i)=>({...r,status:status==='done'?'done':i===0?'working':r.status,feedback:status==='done'?'已确认保供与迭代排期，责任人与交付节点已记录。':i===0?'已收到工厂阶梯报价，正在复核适用批次。':r.feedback,completedAt:status==='done'?now:''}));
  next[task.id]=upTodoAggregate({...task,responsibilities,updatedAt:now,logs:[...task.logs,{at:now,actor:'AI',action:'sample-progress',note:'演示任务的已确认进展'}]});
 }
 upPersistTodos(next);
}
function gdFocusGroups(records){
 const groups=new Map();
 for(const r of records){
  let group=groups.get(r.objectKey);if(!group){group={id:'focus|'+r.objectKey,kind:'focus-analysis',object:{key:r.objectKey,name:r.objectName,type:diagnosisObjectType(r.objectType)},objectName:r.objectName,objectKey:r.objectKey,date:r.date,topics:[],sources:[],people:[]};groups.set(r.objectKey,group)}
  group.sources.push(r);if(!group.people.includes(r.owner))group.people.push(r.owner);
  let topic=group.topics.find(t=>t.name===r.topic);if(!topic){topic={name:r.topic,people:[],sources:[]};group.topics.push(topic)}
  if(!topic.people.includes(r.owner))topic.people.push(r.owner);topic.sources.push(r);
  group.date=group.date>r.date?group.date:r.date;
 }
 return [...groups.values()].map(g=>({...g,categories:[...new Set(g.sources.flatMap(s=>s.categories||[]))],departments:[...new Set(g.sources.map(s=>s.department))]})).sort((a,b)=>b.people.length-a.people.length||a.id.localeCompare(b.id));
}
function gdBuildDiagnosis(){
 gdEnsureManualTasks();
 const sources=gdBusinessSources(),context=gdBusinessContext(sources),sample=gdAnalysisSamples(context),range=gdRange(),categoryIndex=gdCategoryIndex(sources);
 const inRange=row=>row.date>=range.start&&row.date<=range.end;
 const issues=gdIssues(context),meetings=gdMeetings(context),savedIssueIds=new Set(Object.values(upTodos).map(t=>t.gdIssue));
 const historical=[...gdReports(context,true),...issues.focus].filter(r=>savedIssueIds.has(r.id));
 const origins=[...issues.coordination,...issues.resource,...meetings,...sample.taskSamples,...historical];
 // 重点工作复用任务身份；报告诊断和工作聚焦始终保持只读分析。
 gdInitializeTaskSamples(origins);
 gdAutoAssign(sample.taskSamples);
 // 四类偏差保持只读诊断，工作排序冲突归入资源错配。
 const allWork=sample.work.map(r=>({...r,date:r.sources.reduce((date,s)=>date>s.date?date:s.date,'')})).filter(inRange);
 const deviations=[...gdDeviationRows(allWork.filter(r=>r.kind!=='core')),...gdFocusDeviationRows(sample.mismatches,range)];
 const prepared=allWork.filter(r=>r.kind==='core').map(r=>gdWorkTaskOrigin(r,origins,context));
 gdBindTaskOrigins([...origins,...prepared]);
 const work=gdBuildKeyWork(context,sample,origins,range);
 const workByTask=new Map([...prepared.filter(r=>upTodos[r.workTaskId]).map(r=>gdPresentWorkTask(r,upTodos[r.workTaskId]))].map(row=>[row.task.id,row]));
 const tasks=Object.values(upTodos).filter(t=>!t.deletedAt&&t.status!=='suggested'&&gdTaskDatesMatch(t,range)).map(t=>workByTask.has(t.id)?{...gdPresentWorkTask(workByTask.get(t.id),t),id:t.id,kind:'task'}:gdPresentAction(gdTaskRow(t,sources),origins));
 const mismatch=sample.mismatches.map(r=>({...r,date:r.sources.reduce((date,s)=>date>s.date?date:s.date,'')})).filter(inRange);
 const reports=gdReportSamples(context).filter(inRange),focus=gdFocusGroups(gdCategorizeRows(sample.focusRecords.filter(inRange),categoryIndex));
 const classifications=[...work,...deviations].map(r=>({id:r.id,module:r.kind==='key-work'?'coordination':'resource',kind:r.kind}));
 if(new Set(classifications.map(r=>r.id)).size!==classifications.length)throw new Error('诊断事项重复归类');
 // 保留空审计字段兼容历史读取，不再生成已撤下模块的数据。
 const categorized={work:gdCategorizeRows(work,categoryIndex),deviations:gdCategorizeRows(deviations,categoryIndex),improvements:[],mismatch:gdCategorizeRows(mismatch,categoryIndex),tasks:gdCategorizeRows(tasks,categoryIndex)};
 return {sources,context,...categorized,reports,focus,origins:[...origins,...prepared,...work],meetings,coordination:categorized.work,resource:categorized.deviations,records:sample.records.filter(inRange),classifications};
}
function gdAnalysisRows(data,part=gdState.part,tab=gdState.tabs[part]){
 if(part==='tasks')return data.tasks;
 if(part==='coordination')return data.work.filter(r=>r.keyType===tab);
 if(part==='resource')return data.deviations.filter(r=>r.kind===tab);
 return part==='execution'?data.reports.filter(r=>tab==='missing'?r.missing:!r.missing):[];
}

function gdAnalysisDepartments(row){return row.participants?gdRowDepartments(row):[...new Set([...(row.departments||[]),row.department,...(row.sources||[]).map(s=>s.department)].filter(Boolean))]}
function gdAnalysisMatches(row,filter,ignore=''){
 const category=row.kind==='report-analysis'||ignore==='category'||!filter.category||filter.category==='all'||(row.categories||[]).includes(filter.category);
 const department=ignore==='department'||filter.department==='all'||gdAnalysisDepartments(row).includes(filter.department);
 const priority=ignore==='priority'||filter.priority==='all'||upTodoPriorityKey(row.task?.priority||row.priority)===filter.priority;
 const status=!row.task||ignore==='status'||pfIncludes(filter.status,row.task.status);
 const type=ignore==='reportType'||filter.reportType==='all'||row.type===filter.reportType;
 const query=ignore==='query'?'':filter.query.trim().toLowerCase();
 const fields=[row.object?.name,row.objectName,row.title,row.problem,row.causalProblem,row.problem?gdProblemText(row):'',row.suggestion,row.content,row.owner,...(row.businessObjects||[]).map(o=>o.name),...(row.people||[]),...(row.topics||[]).map(t=>t.name),...(row.participants||[]).flatMap(r=>[r.assignee,r.action]),...(row.sources||[]).map(s=>s.content)];
 return category&&department&&priority&&status&&type&&(!query||fields.some(value=>String(value||'').toLowerCase().includes(query)));
}
function gdSectionRows(data,part=gdState.part,tab=gdState.tabs[part],filter=gdTableFilters(part,tab)){
 let rows=gdAnalysisRows(data,part,tab);

 return rows.filter(r=>gdAnalysisMatches(r,filter));
}
function gdCardCounts(data){
 return [
  {key:'coordination',count:data.work.length,stats:gdTabs.coordination.map(([key,label])=>[label,gdAnalysisRows(data,'coordination',key).length])},
  {key:'resource',count:data.deviations.length,stats:gdTabs.resource.map(([key,label])=>[label,gdAnalysisRows(data,'resource',key).length])},
  {key:'execution',count:data.reports.length,stats:gdTabs.execution.map(([key,label])=>[label,gdAnalysisRows(data,'execution',key).length])},
  {key:'tasks',count:data.tasks.length,stats:gdStatusOptions('tasks').map(([key,label])=>[label,data.tasks.filter(row=>row.task.status===key).length])}
 ];
}
