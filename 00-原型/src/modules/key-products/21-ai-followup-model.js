// 原型的AI输出适配层：制度、经营事实、工作承诺与待办分开；真实模型接入可替换建议生成器。
const kpmFollowupPolicy={S:'年度BOM降本5%—8%，持续迭代并保障供应',A:'半年内升级S级，重点改善成本、品质与产品溢价',B:'降本、降低退货并提升产品力，半年争取达到A级月度GSV门槛',C:'仅一次挽救，3个月无改善下市'};
const kpmFollowupStages={urgent:['优先处理','red'],proposed:['待下发','yellow'],working:['执行中','yellow'],verify:['待验证效果','yellow'],effective:['已见效','green']};
function kpmFollowupAdvice(p,record){
 const margin=p.facts.profitRate,returns=p.facts.returnRate>p.returnTarget,failed=record?.review==='未通过',shortage=p.stockRisks.includes('shortage');
 let decision,reason,actions,alternatives,department='产品中心',type='business-improvement';
 if(failed){decision='评估退出';reason='一次挽救评审未通过';actions=[['产品中心','比较继续整改与退出成本，提交去留方案'],['计划部','核对现存库存、未交订单及追加采购量'],['用户中心','核对存量售后责任及备件需求']];alternatives=[['退出评估','优先','挽救未通过，先核定库存及售后处置成本'],['存量善后','并行','衔接库存去化、售后责任及备件保障']];}
 else if(record?.kind==='rescue'){decision='复核挽救效果';reason='已有一次挽救方案，当前页面利润率'+upPercent(margin);actions=[['产品中心','对照已批准方案核验效果，提交继续或退出结论'],['采购部','复核已承诺降本及订单变更条件是否兑现'],['计划部','核对库存去化与未交订单，衔接退出准备']];alternatives=[['完成现有挽救','优先','沿用原方案与起止时间，补齐经营验证'],['退出评估','备选','效果不足时核定退出成本，不重启挽救周期']];}
 else if(margin<0){decision='控制新增投入';reason='页面利润率'+upPercent(margin)+(returns?'，总退高于目标':'');actions=[['采购部','核对供应商报价、附加采购条件及渠道成本传导'],['产品中心','比较降本、改版与退出后的利润及新增投入'],['计划部','核对库存和未交订单，提交请购保留或调整建议']];alternatives=[['降本改善','优先','先验证报价能否传导到渠道成本'],['迭代或退出','备选','降本不足以恢复盈利时比较一次投入与退出成本']];}
 else if(record?.kind==='upgrade'){decision='继续提利验证';reason='已有关联提级方案，当前页面利润率'+upPercent(margin);actions=[['采购部','复核承诺降本及渠道成本生效情况'],['产品中心','对比改善前后利润与产品定位，判断是否调整方案'],['项目部','关联已有任务与评审记录，跟踪经营结果']];alternatives=[['落实现有改善','优先','先核实措施生效后的利润变化'],['调整产品方案','备选','现有措施不足时比较改版投入与收益']];}
 else if(record?.kind==='bom'){decision=record.status==='done'?'巩固降本成效':'推进BOM降本';reason=(Number.isFinite(record.actual)?(record.status==='done'?'已验证':'已确认')+'降本'+record.actual+'%':'现有降本任务执行中')+(shortage?'，同步核实供给缺口':'');department='采购部';type='cost-reduction';actions=[['采购部','核对已生效报价及BOM成本变化，补齐实现依据'],['品质中心','验证替代物料，复查降本后的品质与退货'],shortage?['计划部','核对可售、待检及在途数量，协调实际供给缺口']:['产品中心','复核降本成效及迭代收益，跟踪后续经营结果']];alternatives=[['现款降本','优先','先验证已生效报价及实际成本变化'],['更换物料','备选','品质及交付验证通过后再切换']];}
 else if(p.level==='S'&&shortage){decision='优先保供';reason='S级产品，当前库存命中缺货风险';department='采购部';type='supply-optimization';actions=[['计划部','按SKU核对请购、未交采购及工厂排产交期'],['采购部','逐供应商核实可交数量、交期及订单变更条件'],['品质中心','核对待检数量及放行状态，发货部衔接发运']];alternatives=[['协调现有供给','优先','先核实可售、待检和在途，确定实际缺口'],['追加采购','备选','以缺口、交期和品质验证为依据']];}
 else if(returns){decision='先整改再追加';reason='总退'+upPercent(p.facts.returnRate)+'，目标'+upPercent(p.returnTarget);department='品质中心';type='quality-improvement';actions=[['用户中心','归集该产品退货订单、差评和售后原因'],['品质中心','结合检验记录复现主要问题并提交原因结论'],['研发中心','确认技术原因后比较指引改进与设计迭代']];alternatives=[['定向整改','优先','按评价、售后与质检证据确定问题范围'],['整机迭代','备选','仅在设计问题确认后评估成本和周期']];}
 else if(p.level==='S'){decision='保供并推进降本';reason='利润支柱，页面利润率'+upPercent(margin);department='采购部';type='cost-reduction';actions=[['采购部','对照现用物料与供应商报价核对BOM降本进度'],['品质中心','验证替代物料，避免降本增加退货或供给风险'],['产品中心','评估下一代产品储备与现款迭代收益']];alternatives=[['现款降本','优先','保留稳定供给，核实已实现的成本变化'],['产品迭代','备选','结合用户反馈比较升级收益与新增投入']];}
 else if(p.level==='A'){decision='优先改善利润';reason='高销低利，页面利润率'+upPercent(margin);actions=[['采购部','拆分采购、包装及履约成本，核对供应商降价条件'],['产品中心','复算渠道成本，比较降本与参数升级收益'],['项目部','关联现有提利任务，跟踪措施生效后的利润']];alternatives=[['降本提利','优先','先验证现有供应链可实现的降本空间'],['参数升级','备选','以用户需求和增加成本后的利润为依据']];}
 else if(p.level==='C'){decision=record?.kind==='rescue'?'复核挽救效果':'评估一次挽救';reason='尾部产品，结合库存与整改收益判断去留';actions=[['产品中心','核对是否已使用一次挽救机会，比较挽救与退出'],['采购部','核实可落地降本条件及未交订单变更费用'],['计划部','核对库存数量和去化安排，发货部核实可售状态']];alternatives=[['一次挽救','建议','有改善依据后确认方案及起止时间'],['退出评估','备选','挽救收益不足时核定库存及售后处置']];}
 else if(p.level==='B'){decision='小量验证产品力';reason='潜力产品，页面利润率'+upPercent(margin);actions=[['产品中心','结合评价确认有效卖点及待改参数'],['研发中心','对主要参数改进提出验证方案'],['计划部','结合有效需求与库存提出小量补货安排']];alternatives=[['小量验证','优先','验证需求与利润后再扩大备货'],['直接扩量','备选','需有需求、交付及退货稳定的证据']];}
 else{decision='核定定位后投入';reason='当前组合未落入已确认SABC规则';actions=[['产品中心','核对经营口径及规则空档，比较继续经营与改进收益'],['采购部','核对现用成本与供货条件']];alternatives=[['核定定位','优先','保留原值，不自动补充分级规则'],['新增投入','备选','明确定位与收益条件后再评估']];}
 const issue=record?({upgrade:'profit',rescue:'rescue',bom:'cost'}[record.kind]):margin<0?'profit':p.level==='S'&&shortage?'supply':returns?'quality':({S:'cost',A:'profit',B:'growth',C:'rescue'}[p.level]||'position');
 if(record?.kind==='bom'){department='采购部';type='cost-reduction'}
 return {decision,reason,actions,alternatives,department,type,issue};
}
function kpmAiFollowups(rows){
 const end=upWindow().end,work=new Map(kpmManagementCycles(rows).map(c=>[c.product.spuId,c]));
 return rows.map(product=>{
  const item=work.get(product.spuId),record=item?kpmFollowupWork(item.record,end):null,advice=kpmFollowupAdvice(product,record),id='ai-business|'+product.spuId+'|'+advice.issue;
  const related=kpmFindRelatedTask(product,advice,record,id),task=related?kpmCollaborativeTask(related,advice):null;
  const reported=record?.reportDate&&record.reportDate<=end,reviewed=record?.reviewDate&&record.reviewDate<=end;
  const verified=record?.kind==='bom'?reported&&record.actual>=5:record?.kind==='upgrade'?item.company.level==='S':record?.kind==='rescue'?reviewed&&record.review==='通过':false;
  const failed=reviewed&&record.review==='未通过',overdue=record&&record.due<end&&task?.status!=='done'&&!verified;
  const stage=product.facts.profitRate<0||failed||overdue?'urgent':verified?'effective':task?.status==='done'?'verify':task&&!task.deletedAt?'working':'proposed';
  const progress=task?.deletedAt?'关联待办已删除':verified?(record.kind==='bom'?'已验证降本'+record.actual+'%':record.kind==='upgrade'?'经营结果已达到S级':'挽救评审通过'):task?.status==='done'?'任务已完成，经营效果待验证':failed?'挽救评审未通过':task?(upTodoStatuses[task.status]||'处理中')+(record?.due?' · 承诺'+record.due.slice(5):''):'待下发';
  return {product,record,task,advice,id,stage,progress,policy:kpmFollowupPolicy[product.level]||'',cutoff:end};
 });
}
// 跨模块以产品＋事项关联；不把同产品的无关任务当成当前事项。
function kpmFindRelatedTask(product,advice,record,id){
 const tasks=Object.values(upTodos).filter(t=>t.spuId===product.spuId&&t.status!=='suggested');
 const matched=tasks.find(t=>t.id===id||t.id===(record&&kpmCycleTaskId(record))||t.managementIssue===advice.issue);
 if(matched)return matched;
 if(record)return kpmCycleTask(record,product);
 const legacy=upTodos['ai-business|'+product.spuId];if(legacy&&legacy.taskType===advice.type)return legacy;
 // 仅使用明确的历史事项标识，不因部门或任务类型相同就合并。
 return tasks.find(t=>advice.issue==='cost'&&t.suggestionKey==='cost-reduction')||null;
}
function kpmFollowupTask(item){
 if(item.strategyCategory)return kpmBuildStrategyTask(item);
 const existing=kpmFindRelatedTask(item.product,item.advice,item.record,item.id);if(existing)return kpmCollaborativeTask(existing,item.advice);
 if(item.task)return kpmCollaborativeTask(item.task,item.advice);
 const a=item.advice,p=item.product,person=aiAssignees.find(([name])=>upTodoPersonDepartment(name)===a.department)?.[0]||upTodoCurrentUser,now=new Date().toISOString();
 const task={id:item.id,spuId:p.spuId,objectName:p.name,platform:'all',start:upWindow().start,end:item.cutoff,title:a.decision+'：'+p.name,description:a.reason,descriptionVersion:3,plan:a.actions.map(([dept,text])=>dept+'：'+text).join('；'),department:a.department,assignee:person,due:'',priority:item.stage==='urgent'?'red':'yellow',taskType:a.type,status:'pending',managementIssue:a.issue,managementObjective:({profit:'upgrade',growth:'upgrade',rescue:'rescue',cost:'bom',quality:'quality'}[a.issue]||''),managementBaseline:{cutoff:item.cutoff,profitRate:p.facts.profitRate,returnRate:p.facts.returnRate},source:'ai-business-followup',assignedBy:upTodoCurrentUser,assignedAt:now,createdAt:now,completedAt:'',evidence:'',basis:[a.reason,...(item.policy?['制度：'+item.policy]:[])],logs:[{at:now,actor:upTodoCurrentUser,action:'assign',to:'pending',note:'下发AI经营建议'}]};
 return kpmCollaborativeTask(task,a);
}
