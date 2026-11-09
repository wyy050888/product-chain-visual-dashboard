// 只用已发生的节点和已回收的验证数据判色；待办完成不充当经营改善证据。
function kpmStrategyMetric(label,before,after,unit='percent'){return {label,before,after,unit}}
function kpmStrategyRate(n,d){return Number.isFinite(n)&&d>0?n/d*100:null}
function kpmStrategyActivity(record,product,end){
 const r=record,launch=r.category==='iteration'&&r.newSpuId?newLaunchSamples.get(r.newSpuId)?.actualLaunch:null;
 const actual=launch||r.effective,effective=actual&&actual<=end?actual:null;
 const verified=effective&&r.verifiedAt&&r.verifiedAt<=end&&(!r.observation||r.observation.end<=end),before=r.before||{},after=verified?r.after||{}:{};
 let metrics=[],good=false,complete=!!verified;
 if(r.category==='cost'){
  for(const [key,label] of [['cost','成本'],['freight','运费'],['margin','利润率']])if(Number.isFinite(before[key]))metrics.push(kpmStrategyMetric(label,before[key],after[key]??null,key==='margin'?'percent':'money'));
  good=metrics.some(m=>m.unit==='money'&&Number.isFinite(m.after)&&m.after<m.before)&&Number.isFinite(after.margin)&&after.margin>before.margin;
  complete=complete&&Number.isFinite(after.margin);
 }else if(r.category==='quality'){
  metrics=[kpmStrategyMetric('批次退货率',kpmStrategyRate(before.returned,before.orders),kpmStrategyRate(after.returned,after.orders)),kpmStrategyMetric('批次利润率',kpmStrategyRate(before.profit,before.gsv),kpmStrategyRate(after.profit,after.gsv))];
  complete=complete&&metrics.every(m=>Number.isFinite(m.before)&&Number.isFinite(m.after));good=complete&&metrics[0].after<metrics[0].before&&metrics[1].after>metrics[1].before;
 }else if(r.category==='service'){
  metrics=[kpmStrategyMetric('进线率',kpmStrategyRate(before.contacts,before.orders),kpmStrategyRate(after.contacts,after.orders)),kpmStrategyMetric('差评率',kpmStrategyRate(before.badReviews,before.reviews),kpmStrategyRate(after.badReviews,after.reviews))];
  complete=complete&&metrics.every(m=>Number.isFinite(m.before)&&Number.isFinite(m.after));good=complete&&metrics.every(m=>m.after<=m.before)&&metrics.some(m=>m.after<m.before);
 }else if(r.category==='iteration'){
  if(verified&&r.observation&&r.newSpuId&&r.newSpuId!==r.spuId){
   const from=r.observation.start,to=r.observation.end,length=aiFlowDayDiff(from,to)+1,start=shiftDate(actual,-length),oldEnd=shiftDate(actual,-1);
   const old=upSummary(upSpus.get(r.spuId),start,oldEnd,kpmBusinessPlatforms()),next=upSummary(upSpus.get(r.newSpuId),from,to,kpmBusinessPlatforms());
   metrics=[kpmStrategyMetric('利润率',old.profitRate,next.profitRate),kpmStrategyMetric('利润额',old.profitCents,next.profitCents,'money')];
   complete=old.sales>0&&next.sales>0;good=complete&&next.profitRate>=old.profitRate&&next.profitCents>=old.profitCents&&next.profitRate>=0;
  }else complete=false;
 }else if(r.category==='clearance'){
  const reported=r.inventory?.at<=end?r.inventory:null;
  // 当前清仓余额与公共库存台账共读；历史仅使用当时已经记录的余额。
  const stock=end===DATA_CUTOFF&&product.stock?{initial:reported?.initial,remaining:product.stock.totalUnits,value:product.stock.goodsValueCents}:reported;
  if(stock)metrics=[kpmStrategyMetric('剩余库存',stock.initial,stock.remaining,'units'),kpmStrategyMetric('剩余货值',null,stock.value,'money')];
  complete=!!(r.delistedAt&&r.delistedAt<=end&&stock);good=complete&&stock.remaining===0;
 }
 // 批次及单据样例没有渠道拆分，切换业务范围时不把全公司结果冒充所选渠道效果。
 if(kpmBusinessScope!=='all'&&!['iteration','clearance'].includes(r.category)){metrics=metrics.map(m=>({...m,after:null}));complete=false}
 metrics=metrics.filter(m=>Number.isFinite(m.before)||Number.isFinite(m.after));
 const late=!effective&&r.planned&&r.planned<end,stage=late?'red':complete?(good?'green':'red'):'yellow';
 const note=actual&&actual>end?(r.category==='iteration'?'等待新品上线':'等待计划节点完成'):r.category==='clearance'&&complete&&!good?'下市记录已报完成，公共库存仍有余额，需核对清仓及库存状态。':complete||!r.verifiedAt?r.note:'验证记录待回收';
 return {record:r,effective,verified:complete,late:!!late,stage,metrics,note};
}
function kpmStrategyAdvice(item){
 const category=item.strategyCategory,decision=item.stage==='unlinked'?'关联现有事项':item.stage==='red'?'复核节点与经营效果':item.stage==='green'?'保持并跟踪效果':item.activities.some(a=>a.effective)?'回收经营结果':'推进现有事项';
 const actions={cost:[['采购部','核对成本及运费生效情况'],['产品中心','验证实际利润变化']],quality:[['品质中心','跟踪整改批次出货及退货回收'],['产品中心','核对批次利润及后续投入']],service:[['产品中心','关联售后任务及进线、差评原因'],['品质中心','复核指引或品质措施的改善结果']],iteration:[['研发中心','跟踪升级项目及新SPU交付'],['产品中心','验证上线后利润与产品表现']],clearance:[['产品中心','沿用一次挽救结论，落实清仓下市'],['项目部','跟踪库存去化与下市结果']]};
 return {decision,reason:item.activities.map(a=>a.note).join('；')||'尚未关联执行或验证记录',actions:actions[category],department:actions[category][0][0],type:{cost:'cost-reduction',quality:'quality-improvement',service:'business-improvement',iteration:'development-improvement',clearance:'business-improvement'}[category],issue:kpmStrategyIssue(item.product,category)};
}
function kpmStrategyDecisionEvidence(item){
 const evidence=item.activities.map(a=>({source:a.record.source,text:a.note}));
 if(item.task?.responsibilities)for(const r of item.task.responsibilities.filter(r=>r.feedback))evidence.push({source:r.assignee||r.department,text:r.feedback});
 if(!evidence.length)evidence.push({source:'关联记录',text:'尚未关联项目、单据或执行记录'});
 const pending={cost:'成本及运费是否已生效，利润变化是否已验证',quality:'批次与订单是否对应，退货及利润回收是否完整',service:'前后进线、评价样本及统计周期是否一致',iteration:'原产品、新SPU及上线时间是否对应，经营窗口是否可比',clearance:'挽救结论、库存去化及下市状态是否齐全'};
 return {evidence,pending:pending[item.strategyCategory],advice:item.advice.actions.map(a=>a[1]).join('；')};
}

// 列表结论只引用可用节点与前后指标；任务完成不作为经营改善依据。
function kpmStrategyPrimary(item){return item.activities.find(a=>a.stage===item.stage)||item.activities[0]}
function kpmStrategyActivityConclusion(activity){
 const {record:r,effective,verified,late,metrics}=activity;
 const event={cost:'降本措施',quality:'新批次',service:'售后措施',iteration:'新品',clearance:'下市'}[r.category];
 if(late)return {cost:'成本或运费生效已逾期',quality:'新批次出货已逾期',service:'售后措施生效已逾期',iteration:'新品上线已逾期',clearance:'计划下市已逾期'}[r.category];
 if(r.category==='clearance'&&verified)return metrics.find(m=>m.label==='剩余库存')?.after===0?'库存已清零，已完成下市':'下市已登记，库存仍未清零';
 if(!effective)return r.category==='clearance'?'挽救未通过，清仓进行中':event+{cost:'待生效',quality:'待出货',service:'待生效',iteration:'待上线'}[r.category];
 if(!verified)return {cost:'措施已生效，利润待验证',quality:'新批次已出货，效果待验证',service:'措施已生效，售后效果待验证',iteration:'新品已上线，利润待验证',clearance:'下市结果待核实'}[r.category];
 const metric=label=>metrics.find(m=>m.label===label),down=m=>m&&m.after<m.before,up=m=>m&&m.after>m.before;
 if(r.category==='cost'){
  const reduced=metrics.filter(m=>m.unit==='money'&&down(m)).map(m=>m.label),margin=metric('利润率');
  if(!margin||!Number.isFinite(margin.before)||!Number.isFinite(margin.after))return '费用已调整，利润对比待核实';
  return reduced.length?reduced.join('、')+'下降，'+(up(margin)?'利润率回升':down(margin)?'利润率仍下滑':'利润率未改善'):'费用未下降，需复核降本效果';
 }
 if(r.category==='quality'){
  const returns=down(metric('批次退货率')),profit=up(metric('批次利润率'));
  return returns?(profit?'退货率下降，批次利润改善':'退货率下降，批次利润未改善'):profit?'批次利润回升，退货率未改善':'退货率与批次利润未改善';
 }
 if(r.category==='service')return ['进线率','差评率'].map(label=>{const m=metric(label);return label+(down(m)?'下降':up(m)?'上升':'持平')}).join('，');
 if(r.category==='iteration'){
  const margin=metric('利润率'),profit=metric('利润额');
  return margin.after<0?'迭代新品仍亏损':down(margin)?'新品利润率低于原产品':down(profit)?'新品利润额低于原产品':up(margin)||up(profit)?'新品利润表现改善':'新品利润表现与原产品持平';
 }
 return metric('剩余库存')?.after===0?'库存已清零，已完成下市':'下市已登记，库存仍未清零';
}
function kpmStrategyConclusion(item){
 if(!item.activities.length)return item.stage==='unlinked'?'未关联执行事项':'已有待办，执行结果待回收';
 if(item.strategyCategory==='quality'&&item.activities.length>1){
  const counts=new Map();
  for(const a of item.activities){const label=a.late?'批出货逾期':a.verified?(a.stage==='green'?'批已改善':'批未改善'):a.effective?'批待验证':'批待出货';counts.set(label,(counts.get(label)||0)+1)}
  return [...counts].map(([label,n])=>n+label).join('，');
 }
 return kpmStrategyActivityConclusion(kpmStrategyPrimary(item));
}
