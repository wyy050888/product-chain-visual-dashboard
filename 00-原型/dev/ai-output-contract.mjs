// 校验不补写结果；归因、遗漏和建议质量必须另做语义复核。
export function checkAiBusinessContract(kind,input,output){
 const issues=[],fail=(path,problem)=>issues.push({path,problem});
 const evidence=new Set((input.evidence||[]).map(e=>e.id));
 const objects=new Map((input.objects||[]).map(o=>[String(o.id),o]));
 const people=new Set([...input.evidence||[],...input.personnel||[]].map(e=>e.person_id).filter(Boolean).map(String));
 for(const person of input.objects||[])if(['人员','person'].includes(person.type))people.add(String(person.id));
 // 人员关系也可能直接保存在原单/店铺负责人字段，不只在日报作者目录。
 function collectPeople(value){
  if(!value||typeof value!=='object')return;
  for(const [key,v] of Object.entries(value)){
   if(typeof v==='string'&&/^(?:manager(?:Strategy|Content|Promotion)?|person_id|userId|ownerId|assigneeId|projectManagerId|productManagerId)$/.test(key)&&v)people.add(v);
   else if(v&&typeof v==='object')collectPeople(v);
  }
 }
 for(const e of input.evidence||[]){try{collectPeople(JSON.parse(e.text))}catch{}}
 const reports=new Set((input.report_manifest||[]).map(r=>r.report_id));
 const types={product:'SPU',spu:'SPU',sku:'SKU',supplier:'供应商',person:'人员',shop:'店铺',project:'项目'};
 function walk(value,path='$'){
  if(Array.isArray(value)){value.forEach((v,i)=>walk(v,`${path}[${i}]`));return}
  if(!value||typeof value!=='object')return;
  for(const id of value.evidence_ids||[])if(!evidence.has(id))fail(path+'.evidence_ids','引用来源不在本次数据包');
  for(const id of value.person_ids||[])if(!people.has(id))fail(path+'.person_ids','参与人ID不在本次人员范围');
  for(const id of value.report_ids||[])if(!reports.has(id))fail(path+'.report_ids','引用报告不在本次资料范围');
  if(value.person_id&&!people.has(value.person_id))fail(path+'.person_id','建议负责人ID不在本次人员范围');
  if(value.archive_id){const found=objects.get(value.archive_id);if(!found)fail(path+'.archive_id','档案ID不存在');else if((types[found.type]||found.type)!==value.type)fail(path+'.type','正式档案类型与主体不一致')}
  if(value.summary&&value.task&&(/[【】\n]/.test(value.summary)||value.summary.length>30))fail(path+'.summary','行动总结须简短，分述独立保存');
  for(const [k,v] of Object.entries(value))walk(v,path+'.'+k);
 }
 walk(output);
 if(['product','shop'].includes(kind)&&output.subject!==input.meta.subject)fail('$.subject','诊断主体与请求不一致');
 if(kind==='total'){
  for(const key of ['project_blocks','new_high_risks','unsubmitted','rule_analyses'])if(key in output)fail('$.'+key,'不得重建规则清单；重点工作只按已有rule_item_id补充分析');
  const expected=(input.key_work_items||[]).map(r=>r.rule_item_id).sort(),actual=(output.key_work_analysis||[]).map(r=>r.rule_item_id).sort();
  if(JSON.stringify(expected)!==JSON.stringify(actual))fail('$.key_work_analysis','规则已选事项必须逐项对应，不得新增、漏项或重复');
  for(const [i,row] of (output.key_work_analysis||[]).entries()){
   if(!row.problem?.evidence_ids?.length)fail('$.key_work_analysis['+i+'].problem','问题描述需要本次来源依据');
   for(const action of row.actions||[])if(!action.evidence_ids?.length)fail('$.key_work_analysis['+i+'].actions','行动及建议负责人需要关系依据');
  }
  const keys=(output.findings||[]).map(f=>f.key);if(new Set(keys).size!==keys.length)fail('$.findings','问题键重复');
 }
 if(kind!=='root'){
  const expected=(input.prior_findings||[]).map(f=>f.finding_id).sort(),actual=(output.updates||[]).map(f=>f.finding_id).sort();
  if(JSON.stringify(expected)!==JSON.stringify(actual))fail('$.updates','上次未结事项必须逐条续更，不混入规则或手工任务');
  for(const [i,u] of (output.updates||[]).entries()){
   if(Object.keys(u.changes||{}).length&&!u.evidence_ids?.length)fail('$.updates['+i+'].evidence_ids','实质变更需要直接依据');
   if(u.exit_reason&&!u.evidence_ids?.length)fail('$.updates['+i+'].exit_reason','退出需要依据，缺数不能当误判或已解决');
   if(u.exit_reason&&u.changes?.status==='已完成')fail('$.updates['+i+'].changes.status','退出不等同业务完成');
   if(['product','shop'].includes(kind)&&u.changes?.subject?.archive_id&&u.changes.subject.archive_id!==input.meta.subject)fail('$.updates['+i+'].changes.subject','不能把另一个主体写入本品或本店的诊断');
  }
 }else{
  const expected=(input.root_risks||[]).map(r=>String(r.risk_id||r.id)).sort();
  const actual=[...(output.groups||[]).flatMap(g=>g.risk_ids),...(output.unassigned||[]).map(u=>u.risk_id)].sort();
  if(JSON.stringify(expected)!==JSON.stringify(actual))fail('$.groups','本次完整风险单必须各归组一次或说明待核');
 }
 return issues;
}
