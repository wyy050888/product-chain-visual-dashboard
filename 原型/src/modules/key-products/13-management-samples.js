// 工作承诺演示资料：日期、措施与验收记录来自固定样例；不作为AI新拟目标。
const kpmCycleSamples=[
 {id:'lift-001',spuId:'SPU-SOURCE-001',kind:'upgrade',start:'2026-03-01',due:'2026-09-01',department:'产品中心',assignee:'林悦',title:'完成吸尘器渠道成本改善及提利评审',source:'产品经营月度评审',status:'working',note:'采购已提交报价，渠道供价传导及退出成本尚待复核。'},
 {id:'lift-002',spuId:'SPU-SOURCE-002',kind:'upgrade',start:'2026-04-01',due:'2026-10-01',department:'产品中心',assignee:'林悦',title:'复核俯仰取暖器提利方案及持续投入条件',source:'产品经营月度评审',status:'working',note:'成本改善方案尚未形成可恢复盈利的结论。'},
 {id:'lift-018',spuId:'SPU-SOURCE-018',kind:'upgrade',start:'2026-04-20',due:'2026-10-20',department:'采购部',assignee:'唐琪',title:'核实壁炉式取暖器报价传导与提利结果',source:'采购周报',status:'pending',note:'按现有订单确认降价条件及渠道成本生效日期。'},
 {id:'rescue-030',spuId:'SPU-SOURCE-030',kind:'rescue',start:'2026-07-01',due:'2026-10-01',department:'产品中心',assignee:'林悦',title:'提交成人圆款眼镜一次挽救评审及退出安排',source:'一次挽救评审纪要',reviewDate:'2026-10-05',review:'未通过',status:'working',note:'评审确认采购成本及库存去化未达到已批准方案要求，需提交退出安排。'},
 {id:'rescue-042',spuId:'SPU-SOURCE-042',kind:'rescue',start:'2026-08-01',due:'2026-11-01',department:'项目部',assignee:'沈舟',title:'跟踪剃须刀一次挽救的验证交付',source:'项目周报',status:'working',note:'补齐成本及售后验证结果后提交挽救评审。'},
 {id:'bom-033',spuId:'SPU-SOURCE-033',kind:'bom',start:'2026-01-01',due:'2026-12-31',department:'采购部',assignee:'唐琪',title:'推进壁挂风扇年度BOM降本',source:'年度降本项目周报',reportDate:'2026-10-08',actual:3.6,status:'working',note:'已确认降本3.6%，继续验证备选物料；年度目标5%—8%，不按月份平均拆分。'},
 {id:'bom-015',spuId:'SPU-SOURCE-015',kind:'bom',start:'2026-01-01',due:'2026-12-31',department:'采购部',assignee:'唐琪',title:'复核双杆除螨仪年度BOM降本结果',source:'年度降本验收记录',reportDate:'2026-10-08',actual:5.2,status:'done',note:'年度BOM降本5.2%已验证，持续跟踪品质及供给稳定性。'}
];
// 历史期间只读取当时已产生的评审、验收结果。
function kpmFollowupWork(record,end){
 const stamp=record.reviewDate||record.reportDate;if(!stamp||stamp<=end)return record;
 return {...record,note:'',review:undefined,actual:undefined,status:record.status==='done'?'working':record.status};
}
function kpmCycleTaskId(record){return 'grade-cycle|'+record.id}
function kpmCycleTask(record,product){
 const saved=upTodos[kpmCycleTaskId(record)];if(saved)return saved;
 record=kpmFollowupWork(record,upWindow().end);
 const stamp=record.start+'T09:00:00+08:00',done=record.status==='done';
 return {id:kpmCycleTaskId(record),spuId:product.spuId,objectName:product.name,platform:'all',start:record.start,end:record.due,
  title:record.title,description:record.source+'：'+(record.note||record.title),plan:'针对'+product.name+'，'+record.note+' 提交关联报价、成本复核或验证记录，由产品中心确认后续投入安排。',
  department:record.department,assignee:record.assignee,due:record.due,priority:done?'green':'yellow',taskType:record.kind==='bom'?'cost-reduction':'business-improvement',
  status:record.status,source:'grade-management-demo',assignedBy:'周铭',assignedAt:stamp,createdAt:stamp,completedAt:done?record.reportDate+'T17:00:00+08:00':'',
  evidence:done?record.note:'',basis:[record.source],logs:[{at:stamp,actor:'周铭',action:'assign',from:'suggested',to:record.status,note:record.source}]};
}
