const pcPeopleRatingState={week:'',page:1};

// 以周报可复核的记录评分。条目计入一次，缺少可评估样本的维度按其余权重折算。
const pcPeopleScoreRules=[
 {label:'重点工作交付',weight:35,rule:'已完成或已交付 ÷ 有明确结果的重点工作',records:person=>person.work.filter(item=>item.done!==undefined),passes:item=>item.done},
 {label:'关键产品成果',weight:25,rule:'有可追溯资料、系统记录或量化结果 ÷ 周重点工作',records:person=>person.work,passes:item=>item.proof},
 {label:'下周计划质量',weight:15,rule:'有明确截止日和交付结果 ÷ 下周计划',records:person=>person.plans,passes:item=>item.due&&item.deliverable},
 {label:'跨部门协同',weight:15,rule:'已确认完成 ÷ 有明确结果的跨部门交接',records:person=>[...person.work,...(person.deviations||[])].filter(item=>item.handoff!==undefined),passes:item=>item.handoff},
 {label:'偏差管理',weight:10,rule:'有跟进动作和明确节点 ÷ 已记录偏差',records:person=>person.deviations||[],passes:item=>item.followed}
];

function pcPeopleScore(person){
 const details=pcPeopleScoreRules.map(({label,weight,rule,records,passes})=>{
  const entries=records(person).map(item=>({text:item.text,pass:!!passes(item)}));
  const numerator=entries.filter(item=>item.pass).length,denominator=entries.length;
  return {label,weight,rule,entries,numerator,denominator,points:denominator?weight*numerator/denominator:null};
 });
 const applicable=details.filter(item=>item.points!==null);
 const weight=applicable.reduce((sum,item)=>sum+item.weight,0);
 const points=applicable.reduce((sum,item)=>sum+item.points,0);
 const score=details[0].denominator&&applicable.length>=3?Math.round(1000*points/weight)/10:null;
 return {details,score};
}

function pcPeopleScoreLight(score){
 return score===null?null:score>=80?'绿灯':score>=60?'黄灯':'红灯';
}

function pcPeopleRatingSummary(people){
 const lights={红灯:0,黄灯:0,绿灯:0};
 const rated=people.filter(person=>person.score!==null);
 for(const {score} of rated)lights[pcPeopleScoreLight(score)]++;
 const deviations=people.flatMap(person=>person.deviations||[]);
 const deviationStats=gdTabs.resource.map(([kind,label])=>[label,deviations.filter(item=>item.kind===kind).length]);
 return {
  average:rated.length?rated.reduce((sum,person)=>sum+person.score,0)/rated.length:null,
  rated:rated.length,reported:people.length,lights,
  deviations:deviations.length,deviationStats
 };
}

function pcDailyReportSummary(week,chain,snapshot=pcDailyReportWeeks[week]){
 if(!snapshot)return null;
 const {capturedBySubmissionDay,ledger,demoCounts}=snapshot;
 const captured=chain===null&&capturedBySubmissionDay?capturedBySubmissionDay.reduce((sum,count)=>sum+count,0):null;
 // 只有同步完整的应交名册及提交明细可按人员、工作日期分类。
 if(!ledger?.complete)return {captured,counts:null,demoCounts:chain===null?demoCounts:null};
 const {asOf,expected,submissions}=ledger,end=shiftDate(week,6),cutoff=Date.parse(asOf);
 if(!Number.isFinite(cutoff)||chain!==null&&expected.some(row=>!Array.isArray(row.chains)))return {captured,counts:null};
 const keyOf=row=>JSON.stringify([row.personId,row.workDate]);
 const firstSubmissions=new Map();
 for(const row of submissions){
  const submitted=Date.parse(row.submittedAt),key=keyOf(row);
  if(submitted<=cutoff&&submitted<(firstSubmissions.get(key)??Infinity))firstSubmissions.set(key,submitted);
 }
 const due=new Map();
 for(const row of expected){
  if(row.exempt||row.workDate<week||row.workDate>end||chain!==null&&!row.chains.includes(chains[chain]))continue;
  const deadline=Date.parse(gdReportDeadline(row.workDate));
  if(deadline<=cutoff)due.set(keyOf(row),deadline);
 }
 const counts={expected:due.size,submitted:0,onTime:0,late:0,missing:0};
 for(const [key,deadline] of due){
  const submitted=firstSubmissions.get(key);
  if(submitted===undefined)counts.missing++;
  else{
   counts.submitted++;
   counts[submitted<=deadline?'onTime':'late']++;
  }
 }
 return {captured,counts};
}

function pcPeopleRatingData(){
 const reports=gdWeeklyReportRows();
 const week=pcPeopleRatingState.week||reports.find(row=>row.reports.product&&pcPeopleWeeklyReports[row.monday])?.monday||dateRangePreset('week',DATA_CUTOFF)[0];
 const report=reports.find(row=>row.monday===week);
 const chain=pcChain();
 const people=(report?.reports.product?pcPeopleWeeklyReports[week]||[]:[]).filter(person=>chain===null||person.chains?.includes(chains[chain]));
 return {week,report,people:people.map(person=>({...person,...pcPeopleScore(person)}))};
}
