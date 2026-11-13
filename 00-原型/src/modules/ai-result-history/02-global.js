// 先生成完整范围快照，再按视图日期筛选。筛选和翻页绝不参与状态归档。
let gdHistoryShowHandled=false;
function gdHistoryReport(row){
 const id=row.id+'|'+row.date;
 return {...row,id,sources:(row.sources||[]).map(s=>({...s,id:s.id+'|'+row.date})),historyKey:'report|'+row.owner+'|'+row.type+'|'+row.date};
}
function gdHistoryRows(snapshot){return [...snapshot.work,...snapshot.deviations,...snapshot.reports]}
function gdHistoryIdentity(row){return row.historyKey||row.eventKey||row.workKey||row.id}
function gdHistoryObserve(row,current){
 const next=gdHistoryRows(current).find(r=>gdHistoryIdentity(r)===gdHistoryIdentity(row));
 if(next)return {kind:next.missing?(next.latestSubmittedAt?'resolved':'active'):'active',complete:true,evidence:(next.sources||[]).map(s=>s.id),reason:next.latestSubmittedAt?'原日报已补交':'本轮仍有对应诊断依据'};
 if(row.kind==='key-work'&&row.keyType==='project'){
  const p=current.sources.find(s=>s.id==='projects')?.rows.find(p=>String(p.id)===String(row.projectId));
  const evidence=p?['project|'+p.id+'|'+DATA_CUTOFF]:[];
  const stages=p&&(p.stageData||projectControlModel(p).stageData)||[],stage=stages.find(s=>String(s.id)===String(row.projectStageId)||s.tasks?.some(t=>String(t.id)===String(row.projectTaskId))),task=stage?.tasks?.find(t=>String(t.id)===String(row.projectTaskId));
  if(task?.done)return {kind:'resolved',complete:true,evidence,reason:'原项目任务已完成，保留首次发现和完成记录'};
  if(task&&gdProjectTaskLinked(p,stage,task,gdProjectDispatchRows()))return {kind:'transferred',complete:true,evidence,reason:'原任务已关联风险台账或执行单，承接原单继续跟进'};
  if(p&&gdHasExecution(row))return {kind:'transferred',complete:true,evidence,reason:'已关联执行单，转入原业务台账继续跟进'};
  if(p&&p.projectState==='已完成')return {kind:'resolved',complete:true,evidence,reason:'项目源状态已完成，保留原始卡点及处理历史'};
  if(p&&['已关闭','已取消'].includes(p.projectState))return {kind:'not_hit',complete:true,evidence,reason:'项目已关闭或取消，原卡点退出；未据此认定原任务已验收完成'};
  if(p&&p.status!=='红灯')return {kind:'not_hit',complete:true,evidence,reason:'本轮项目有效灯色不再满足原卡点条件，未据此宣称业务问题已解决'};
  if(task&&(stage.light!=='红灯'||task.light!=='红灯'))return {kind:'not_hit',complete:true,evidence,reason:'阶段或任务有效灯色不再满足原条件，保留原问题记录'};
 }
 return {complete:false,reason:'本轮未再次命中，缺少可确认闭环的状态证据'};
}
function gdHistoryDataset(){
 const selected=gdRange(),period=gdState.period;
 let current;
 try{gdState.period=drawerPeriodFromRange({start:aiCoverageStart,end:DATA_CUTOFF});current=gdBuildDiagnosis()}
 catch(error){
  const old=aiHistoryFail('global',error.message||error);if(!old)throw error;
  const base={sources:[],context:null,improvements:[],mismatch:[],focus:[],origins:[],meetings:[],records:[],classifications:[],tasks:Object.values(upTodos).filter(t=>t.gdLedger&&!t.deletedAt&&gdTaskDatesMatch(t)).map(gdLedgerRow)};
  const retained=new Map(),revisions=aiHistoryStream('global').revisions.filter(r=>r.date<=shiftDate(selected.end,1)),followIndex=gdFollowIndex(revisions);
  for(const revision of revisions)for(const row of gdHistoryRows(revision.payload))if(row.date>=selected.start&&row.date<=selected.end){const key=gdHistoryIdentity(row);retained.set(key,{...row,historyKey:key,followUp:followIndex.get(key),lifecycle:{...(revision.payload.findingStates?.[key]||row.lifecycle||{}),verificationPending:true,reason:'更新失败，沿用原处理状态、原日期和原始依据'}})}
  const rows=[...retained.values()];
  return {...base,work:rows.filter(r=>r.kind==='key-work'),deviations:rows.filter(r=>['omission','blocker','solution','focus-shift'].includes(r.kind)),reports:rows.filter(r=>r.kind==='report-analysis'),historyStatus:aiHistoryStatus('global')};
 }
 finally{gdState.period=period}
 const normalized={work:current.work,deviations:current.deviations.map(row=>({...row,date:row.date||(row.sources||[]).reduce((date,s)=>date>s.date?date:s.date,'')})),reports:current.reports.map(gdHistoryReport)};
 const prior=aiHistoryStream('global').revisions.at(-1)?.payload.findingStates||{},known=new Map();
 for(const revision of aiHistoryStream('global').revisions)for(const row of [...revision.payload.work,...revision.payload.deviations])known.set(gdHistoryIdentity(row),row);
 for(const row of [...normalized.work,...normalized.deviations])known.set(gdHistoryIdentity(row),row);
 normalized.findingStates=Object.fromEntries([...known].map(([key,row])=>[key,aiFindingTransition(prior[key],gdHistoryObserve(row,{...current,...normalized}))]));
 const revision=aiHistoryPublish('global',{date:DATA_CUTOFF,payload:normalized});
 const all=aiHistoryStream('global').revisions.length?aiHistoryStream('global').revisions:[revision];
 const merged=new Map();
 const historyCutoff=selected.end<DATA_CUTOFF?shiftDate(selected.end,1):DATA_CUTOFF;
 for(const r of all.filter(r=>r.date<=historyCutoff))for(const row of gdHistoryRows(r.payload)){
  const key=gdHistoryIdentity(row),bucket=key+'|'+row.date,prior=merged.get(bucket);
  merged.set(bucket,{...row,historyKey:key,firstDetectedAt:prior?.firstDetectedAt||r.knownAt,firstBusinessDate:prior?.firstBusinessDate||row.date,historyRevision:r.id,historyKnownAt:r.knownAt});
 }
 const activeKeys=new Set(gdHistoryRows(normalized).map(gdHistoryIdentity));
 const asOf=new Map();
 for(const row of merged.values())if(row.date<=selected.end){const old=asOf.get(row.historyKey);if(!old||row.date>=old.date)asOf.set(row.historyKey,row)}
 const followIndex=gdFollowIndex(all.filter(r=>r.date<=historyCutoff));
 const dated=[...asOf.values()].filter(row=>row.date>=selected.start).map(row=>{
  const historicalReport=row.kind==='report-analysis';
  const transition=historicalReport?{status:row.missing?(row.latestSubmittedAt?'已补交':'未提交'):'已诊断',reason:'原报告日期与原文快照保留'}:normalized.findingStates[row.historyKey];
  const project=selected.end>=DATA_CUTOFF&&row.keyType==='project'?current.sources.find(s=>s.id==='projects')?.rows.find(p=>String(p.id)===String(row.projectId)):null;
  const projectLight=project?ppProjectDisplayLight(project):ppNormalizeProjectLight(row.projectLight||row.light);
  return {...row,...(row.keyType==='project'?{projectLight}:{}),lifecycle:transition,followUp:followIndex.get(row.historyKey),isCurrent:activeKeys.has(gdHistoryIdentity(row))};
 });
 const visible=[...dated,...gdFollowDemoRows(selected)];
 const tasks=Object.values(upTodos).filter(t=>t.gdLedger&&!t.deletedAt&&gdTaskDatesMatch(t)).map(gdLedgerRow);
 return {...current,work:visible.filter(r=>r.kind==='key-work'),deviations:visible.filter(r=>['omission','blocker','solution','focus-shift'].includes(r.kind)),reports:visible.filter(r=>r.kind==='report-analysis'),tasks,historyStatus:aiHistoryStatus('global'),historyRows:dated};
}
function gdHistoryBadge(row){return ''}
function gdHistoryEvidence(row){
 if(!row.historyKey&&row.kind!=='report-analysis')return '';
 if(row.followUp)return gdWorkFollowEvidence(row);
 const versions=row.historyKey?aiHistoryStream('global').revisions.flatMap(r=>gdHistoryRows(r.payload).filter(x=>gdHistoryIdentity(x)===row.historyKey).map(x=>({revision:r,row:x,state:r.payload.findingStates?.[row.historyKey]}))):[];
 const changes=[];let previous='';
 for(const version of versions){const x=version.row,fingerprint=JSON.stringify([version.state?.status,x.problem,x.findings,x.suggestion,x.participants,(x.sources||[]).map(s=>[s.sourceName,s.date,s.content])]);if(fingerprint!==previous)changes.push(version);previous=fingerprint}
 // 无历史的报告也保留本次来源；旧记录始终读取当次快照，不借用最新原文。
 if(!changes.length)changes.push({revision:{knownAt:row.historyKnownAt||row.firstDetectedAt||'',date:''},row});
 const records=changes.map(({revision:r,row:x,state},index)=>{
  const id='gd-report-follow-evidence-'+index,sources=(x.sources||[]).length?gdAnalysisSourceTable(x.sources):'<p class="muted">暂无来源依据</p>';
  const empty='<span class="muted">暂无</span>',problem=Array.isArray(x.findings)?gdReportFindingsContent(x):gdReadableMarkup(gdProblemText(x));
  const handling=index===0?empty:gdReadableMarkup(state?.reason||'')||empty;
  return `<tr class="gd-follow-record" data-gd-report-follow-record="${index}"><td data-label="核对日期">${esc(gdSourceDate(r.knownAt)||r.date||'未记录')}${index===0?'<span class="gd-first-diagnosis">首次诊断</span>':''}</td><td data-label="本次问题与判断">${problem||empty}</td><td data-label="处理情况">${handling}</td><td data-label="操作"><button type="button" class="link" data-gd-follow-evidence="${id}" aria-expanded="false" aria-controls="${id}">查看依据</button></td></tr><tr id="${id}" class="gd-follow-evidence-row" hidden><td colspan="4"><div class="gd-follow-evidence-shell">${sources}</div></td></tr>`;
 }).reverse().join('');
 const history=`<div class="gd-follow-table-wrap" data-gd-follow-scroll><table class="gd-report-follow-table" aria-label="报告诊断跟进记录"><colgroup><col style="width:130px"><col style="width:440px"><col style="width:410px"><col style="width:100px"></colgroup><thead><tr><th>核对日期</th><th>本次问题与判断</th><th>处理情况</th><th>操作</th></tr></thead><tbody>${records}</tbody></table></div>`;
 return `<section class="gd-detail-section gd-report-follow" data-ai-finding-history data-gd-report-pane="sources"><h5>来源依据与跟进</h5>${history}</section>`;
}
document.addEventListener('click',event=>{
 const toggle=event.target.closest('[data-ai-include-handled]');if(!toggle)return;
 gdHistoryShowHandled=!gdHistoryShowHandled;gdRefreshFilters(true);
});
