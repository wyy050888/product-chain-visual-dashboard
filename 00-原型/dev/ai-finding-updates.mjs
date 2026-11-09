// Apply verified model deltas to diagnosis records. This never writes source systems or manual tasks.
const statuses=new Set(['未开始','跟进中','已暂停','已完成']);
const editable=new Set(['subject','category','priority','status','problem','actions','person_ids','report_ids']);
const clone=value=>structuredClone(value);
function canonical(value){return JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v)}
function meaning(finding,exitReason){
 const {evidence_ids,...problem}=finding.problem||{};
 const actions=(finding.actions||[]).map(({evidence_ids,...action})=>action);
 return canonical({subject:finding.subject,category:finding.category,priority:finding.priority,status:finding.status,problem,actions,person_ids:finding.person_ids,exitReason});
}
export function applyAiFindingUpdates(records,updates,checkedAt){
 const byId=new Map(records.map(record=>[record.finding_id,record])),seen=new Set();
 for(const update of updates){
  const before=byId.get(update.finding_id);
  if(!before||seen.has(update.finding_id))throw Error('未知或重复诊断ID');seen.add(update.finding_id);
  if(before.manual_task||before.rule_owned||before.source==='manual')throw Error('不能续更手工任务或规则记录');
  const changes=update.changes||{};
  for(const field of Object.keys(changes))if(!editable.has(field))throw Error('不能修改诊断身份或未声明字段');
  const next={...clone(before.finding),...clone(changes)},exitReason=update.exit_reason||'';
  if(next.status!==''&&!statuses.has(next.status))throw Error('跟进状态必须使用四种业务状态，首次无法确认可留空');
  if((Object.keys(changes).length||exitReason)&&!update.evidence_ids?.length)throw Error('变化或退出缺少依据');
  if(exitReason&&changes.status==='已完成')throw Error('撤回不代表业务完成');
  const changed=meaning(before.finding,before.exitReason||'')!==meaning(next,exitReason);
  // 报告关联和核对依据可增加；单纯核对不刷新实质更新日。
  next.report_ids=[...new Set([...(before.finding.report_ids||[]),...(changes.report_ids||[])])];
  const after={...clone(before),finding:next,exitReason,lastCheckedAt:checkedAt,lastCheckEvidenceIds:clone(update.evidence_ids||[]),lastCheckReason:update.reason,lastUpdatedAt:changed?checkedAt:before.lastUpdatedAt};
  if(changed)after.history=[...(before.history||[]),{at:checkedAt,previous:clone(before.finding),current:clone(next),exitReason,reason:update.reason,evidence_ids:clone(update.evidence_ids)}];
  byId.set(update.finding_id,after);
 }
 if(seen.size!==records.length)throw Error('原诊断事项未全部回应');
 return records.map(record=>byId.get(record.finding_id));
}
