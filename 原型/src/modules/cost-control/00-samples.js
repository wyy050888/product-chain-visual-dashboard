// 默认部门及指标引用用户截图；金额和日期为固定交互样例，后续由后台指标目录维护。
const ccDepartments=[
 {id:'research',name:'研发中心',annual:750,ratio:.96,metrics:[
  '工艺降本','产品迭代降本','设计方案降本（含物料降本）','关键器件替代料降本（含塑胶原料降本）']},
 {id:'purchase',name:'采购部（去计划）',annual:2100,ratio:.82,metrics:['产品降本']},
 {id:'warehouse',name:'仓储部',annual:320,ratio:.94,metrics:[
  '运费谈价','平台罚款','费用减免','包材降本','快递罚款']},
 {id:'risk',name:'风控中心',annual:180,ratio:.88,metrics:[
  '资产','重大事务处理成本优化金额','打假诉讼等渠道案件回款金额','反舞弊及审计内控降本金额','知识产权及事务所等供应商比价价格优惠金额','严格处理各渠道违规处罚回款金额','严格管控部门预算减少的成本支出金额']},
 {id:'shipping',name:'发货部（去仓储）',annual:240,ratio:.97,metrics:['快递降价','仓储费用减免']},
 {id:'planning',name:'计划部',annual:160,ratio:1.04,metrics:['物流费']},
 {id:'quality',name:'品质中心',annual:250,ratio:.91,metrics:['技术改善降本','谈判收益','质量罚款']},
 {id:'user',name:'用户中心',annual:160,ratio:.95,metrics:['平台赔付追回','质量问题千五罚款']},
 {id:'product',name:'产品中心',annual:340,ratio:1.02,metrics:['工艺降本','产品迭代降本','设计方案降本（含物料降本）','关键器件替代料降本（含塑胶原料降本）']}
];
const ccAllocate=(total,weights)=>{const sum=weights.reduce((a,b)=>a+b,0),values=weights.map(w=>Math.floor(total*w/sum));for(let i=0,n=total-values.reduce((a,b)=>a+b,0);i<n;i++)values[i%values.length]++;return values};
const ccMetrics=ccDepartments.flatMap(dept=>{
 // 研发原有两项沿用身份和金额；新增两项待后台填报，不重新分摊历史金额。
 const indices=dept.id==='research'?[0,2,1,3]:dept.metrics.map((_,i)=>i),weights=dept.id==='research'?[4,0,5,0]:dept.metrics.map((_,i)=>4+i%3),goals=ccAllocate(dept.annual*1000000,weights);
 return dept.metrics.map((name,index)=>({id:dept.id+'-'+indices[index],department:dept.id,metricIndex:indices[index],name,annualCents:goals[index],ratio:dept.ratio}));
});
// 指标ID与名称分开，后台改名或扩展指标不改变已保存金额的归属。
const ccItems=ccMetrics.map(metric=>({...metric,metric:metric.name,owner:''}));
// 目标按自然月保存；实际仅从已到确认日期的事件汇总，不能用目标乘期间天数代替实际。
const ccLedger=ccMetrics.filter(metric=>metric.annualCents>0).flatMap((metric,ii)=>[2025,2026].flatMap(year=>{
 const targets=ccAllocate(Math.round(metric.annualCents*(year===2025?.9:1)),[8,7,9,8,8,9,8,8,9,9,9,8]);
 return targets.map((target,mi)=>{
  const month=String(mi+1).padStart(2,'0'),actual=Math.round(target*metric.ratio*(.96+(mi%3)*.04)*(year===2025?.92:1)),amounts=ccAllocate(actual,[4,3,3]);
  return {id:'CB-'+year+'-'+month+'-'+metric.id,itemId:metric.id,month:year+'-'+month,targetCents:target,
   confirmations:[7,17,27].map((day,i)=>({id:'CF-'+year+'-'+month+'-'+ii+'-'+i,date:year+'-'+month+'-'+String(day).padStart(2,'0'),cents:amounts[i]}))};
 });
}));
