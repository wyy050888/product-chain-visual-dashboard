// 产品详情与风险建议共用的业务边界；不改动其他模块的历史评级算法。
function upAiClassify(gsvCents,margin){
 if(!Number.isFinite(gsvCents)||!Number.isFinite(margin))return {grade:null,note:'GSV或页面利润率缺失，评级待确认'};
 const wan=gsvCents/1000000;
 if(wan>600&&margin>12)return {grade:'S',note:'月GSV＞600万元且页面利润率＞12%'};
 if(wan>300&&margin<12)return {grade:'A',note:'月GSV＞300万元且页面利润率＜12%'};
 if(wan>60&&wan<300&&margin>15)return {grade:'B',note:'B级突破300万元后升级A级的规则存在冲突，待确认'};
 if(wan<60&&margin<12)return {grade:'C',note:'一次挽救记录、3个月改善标准及计时起点待核实'};
 return {grade:null,note:'现有规则未覆盖或端点归属未明确，评级待确认'};
}
function upAiAssessment(m,state,demo){
 if(demo){const r=demo.rating;if(r.end>aiToday())return {grade:null,month:r.month,facts:r.facts,note:'考核月尚未结束，评级待确认'};return r.facts.sales>0?{...upAiClassify(r.facts.gsvCents,r.facts.profitRate),month:r.month,facts:r.facts}:{grade:null,month:r.month,facts:r.facts,note:'该考核月无有效销量，评级待确认'}}
 const month=state.start.slice(0,7),last=new Date(Date.UTC(+month.slice(0,4),+month.slice(5,7),0)).toISOString().slice(0,10);
 if(state.start!==month+'-01'||state.end!==last||state.end>aiToday())return {grade:null,month:null,note:'所选期间不是已结束的完整考核月，评级待确认'};
 if(!(m.company.sales>0))return {grade:null,month,note:'缺少有效销售及利润数据，评级待确认'};
 return {...upAiClassify(m.company.gsvCents,m.company.profitRate),month};
}
function upAiObject(m){
 return m.product.name+(m.product.spuCode?'（SPU：'+m.product.spuCode+'）':'');
}
function upAiActionText(a){
 const target=[...a.rows].filter(r=>r.gap>0).sort((x,y)=>y.returned-x.returned)[0]?.platform||'相关平台';
 return {
  profit:'采购部向现有供应商确认降价幅度、适用订单及追加采购条件；财务复算渠道供价和利润率，超出需求的追加采购不予采纳。',
  returns:'用户中心归类'+target+'退货订单、差评及样品；品质中心复现主要问题并提交原因结论；研发中心据此评估指引修订，确认技术问题后再提交设计调整及费用。',
  stock:'计划部对照可售库存、未交采购及排产交期核定缺口，调整同款补货请购；采购部确认订单可变更数量与费用，发货部核实可售及待检数量。',
  violations:'产品中心逐单核对处罚原因及状态，品质或发货部按原因提交处理证据。',
  efficiency:'产品中心比较近期需求和用户反馈；采购部取得供应商书面降价条件，财务核算渠道成本及利润改善幅度。',
  progress:'计划部按确认的需求、未交采购及排产交期调整请购，采购部确认分期交付数量和日期。',
  grade:'产品中心核对考核月及历史等级，按已确认规则提交保留、改进或退出方案。',
  review:'产品中心验证需求及用户认可的产品优势；计划部核定库存、未交采购和补货缺口，采购部落实供应商降本条件。'
 };
}
function upAiFollowup(a){
 if(!a.direction.hasSales)return '产品中心核对在售状态及订单，按需求验证结果决定是否继续投入。';
 if(a.assessment.grade==='C')return '产品中心核实一次挽救及3个月条件；期限或改善标准缺失标记待确认，不自动判定到期。';
 if(a.direction.overallLoss)return '产品中心比较降本、整改与退出成本；无法恢复盈利时提交下市评估，项目部跟进已有任务。';
 if(a.assessment.grade==='A')return '产品中心测算升级S差距；半年预警按确认起点核对，缺失标记待确认。';
 if(a.assessment.grade==='B')return '验证需求与售后后决定增量投入；突破300万元后的升级规则待确认。';
 if(a.direction.hasReturns)return '原因确认后再决定是否迭代，项目部关联已有待办，避免重复立项。';
 return '产品中心依据利润、需求及交付验证决定新增投入，未核实条件不推算补货量。';
}
