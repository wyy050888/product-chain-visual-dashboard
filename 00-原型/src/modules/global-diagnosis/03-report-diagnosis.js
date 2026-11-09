// 按岗位诊断维度组织报告原文；问题与对应证据明确关联。
function gdReportSamples(context){
 const date=offset=>shiftDate(DATA_CUTOFF,offset);
 const specs=[
  ['产品中心','林悦','product-manager','产品经理'],['项目部','沈舟','project-manager'],['品质中心','刘畅','laboratory-engineer'],['研发中心','王磊','hardware-engineer'],['采购部','唐琪','procurement-specialist']
 ];
 return specs.flatMap(([department,owner,role,subject=''],index)=>['日报','周报','月报'].map((type,t)=>{
  // 演示人员的岗位在夹具中显式指定；不从姓名、部门或报告内容猜测。
  const profile=gdReportProfile(department,'employee',role);
  if(!profile)throw new Error('报告岗位未匹配诊断标准：'+department+'/'+role);
  const monthStart=DATA_CUTOFF.slice(0,7)+'-01',workDate=t===0?date(-1):t===1?date(-6):shiftDate(monthStart,-1),deadline=gdReportDeadline(workDate,type);
  // 报告名作为来源元数据保存；仅使用样例明确给出的主题，不按部门推断人员岗位。
  const reportName=owner+'的'+subject+type+gdSourceDate(workDate);
  const missing=(index===1&&t===0)||(index===4&&t===1)||(index===3&&t===2);
  const caseKey=department+'/'+type,issues=missing?[]:[gdReportIssueSamples[caseKey],...(gdReportLowScoreSamples[caseKey]||[])].filter(Boolean),full=gdReportCompleteContent(context,department,workDate);
  const byKey=new Map(issues.map(issue=>[issue.key,issue]));
  if(byKey.size!==issues.length)throw new Error('报告样例包含重复诊断项：'+caseKey);
  const checks=profile.rows.map(row=>{const issue=byKey.get(row[0]);return gdDiagnoseReportCheck(profile,row,issue?issue.excerpt:full[row[0]],issue?issue.deductions:[])});
  // 报告以提交人、类型和工作日期识别；具体对象属于原文中的工作条目，不是整份报告的归属。
  const id='diagnosis-report-'+index+'-'+t,content=missing?'':checks.map(check=>check.label+'：'+check.excerpt).join('\n');
  return {id,kind:'report-analysis',reportName,type,owner,department,level:'employee',role,position:profile.label,date:workDate,deadline,missing,submissionStatus:missing?'unsubmitted':'submitted',syncComplete:true,
   submitted:missing?'':workDate+'T18:00:00+08:00',latestSubmittedAt:missing&&t===2?deadline.replace('T09:00:00','T09:30:00'):'',checks:missing?[]:checks,
   problem:issues.map(issue=>issue.problem).join('；'),findings:missing?[]:checks.filter(c=>!c.passed).map(c=>({label:c.label,problem:byKey.get(c.key).problem,excerpt:c.excerpt})),
   sources:[{id,date:workDate,capturedDate:DATA_CUTOFF,owner,department,sourceName:reportName,source:`钉钉${type}\n${owner} · ${department}\n${workDate}`,content:missing?`应交时间：${deadline.replace('T',' ')}\n提交台账：未提交\n同步状态：截至 ${DATA_CUTOFF} 10:30:00 已完整同步`:content}].map(diagnosisNormalizeSource),content};
 }));
}
