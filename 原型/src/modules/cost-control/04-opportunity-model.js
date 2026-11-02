// 机会清单固定读取最新近30天公司口径，不把所选月份伪装成近30天。
// 按同一方案内的可比SKU报价加权；负差额抵扣后再归零，不累加互斥方案。
function ccEstimateUnitSaving(quotes){
 if(!Array.isArray(quotes)||!quotes.length)return null;
 let weighted=0,units=0;
 for(const quote of quotes){
  const {sku,currentCents,proposedCents,applicableUnits}=quote||{};
  if(!sku||!Number.isSafeInteger(currentCents)||currentCents<=0||!Number.isSafeInteger(proposedCents)||proposedCents<0||!Number.isSafeInteger(applicableUnits)||applicableUnits<=0)return null;
  weighted+=(currentCents-proposedCents)*applicableUnits;units+=applicableUnits;
  if(!Number.isSafeInteger(weighted)||!Number.isSafeInteger(units))return null;
 }
 return Math.max(0,Math.round(weighted/units));
}
function ccCostQuotes(product){
 // 复用产品AI资料中的工厂供价、方案降幅及报价适用数量，不新增固定6/8元样例。
 const full=upAiFullContext(product),source=upAiDemoContext(full.model,full.state),cost=source.cost;
 if(!cost||!Number.isSafeInteger(cost.factory)||cost.factory<=0||!Number.isSafeInteger(cost.discount))return [];
 return [{sku:source.sku,currentCents:cost.factory,proposedCents:cost.factory-cost.discount,applicableUnits:source.supply.offerQty,
  costRef:source.ids.cost,quoteRef:source.ids.report,additionalPurchase:source.supply.extra,approval:'pending'}];
}
function ccUnitSavingText(cents){return Number.isFinite(cents)?fmt(cents/100,2)+'元/台':'—'}
let ccOpportunityCache=null;
function ccOpportunityRows(){
 const key=[DATA_CUTOFF,config.high,config.profit].join('|');if(ccOpportunityCache?.key===key)return ccOpportunityCache.rows;
 const start=shiftDate(DATA_CUTOFF,-29),end=DATA_CUTOFF;
 const rows=[...upSpus.values()].map(product=>{
  const p=upProduct(product),facts=upSummary(product,start,end,'all');return {spuId:p.spuId,product:p,category:pfCategory(p),brand:p.brand,gsvCents:facts.gsvCents,profitRate:facts.profitRate,start,end};
 }).filter(row=>Number.isFinite(row.profitRate)&&row.gsvCents/1000000>=config.high&&row.profitRate<config.profit).sort((a,b)=>b.gsvCents-a.gsvCents||a.spuId.localeCompare(b.spuId));
 pfWithCompanyStockBatch(()=>rows.forEach(row=>{
  row.costQuotes=ccCostQuotes(row.product);row.unitCents=ccEstimateUnitSaving(row.costQuotes);
  row.direction=['核心物料议价、装配工艺优化','BOM方案优化、关键器件替代','电机及结构件议价、装配效率优化','器件替代验证、包材优化'][row.product.chain];
  // 使用全产品分析期间作为待办身份，跨页面筛选不会产生重复建议。
  row.taskId='cost-reduction|'+row.spuId+'|'+DATA_CUTOFF;
 }));
 ccOpportunityCache={key,rows};return rows;
}
function ccCostProposal(row){
 const full=upAiFullContext(row.product),state=full.state;
 return {id:row.taskId,spuId:row.spuId,objectName:row.product.name,platform:'all',start:state.start,end:state.end,
  suggestionKey:'cost-reduction',taskType:'cost-reduction',department:'采购部',title:'评估'+row.product.name+'降本方案',
  description:'事实依据：\n近30天GSV '+ccMoney(row.gsvCents)+'w；近30天利润率 '+ccRate(row.profitRate)+'\n预计单台降本空间 '+ccUnitSavingText(row.unitCents)+(row.costQuotes.length?'\n关联报价SKU '+row.costQuotes.map(quote=>quote.sku).join('、'):'')+'\n\n判断理由：\n高销低利产品优先核对报价、物料及工艺成本；预计空间按工厂报价差额测算，适用数量、追加采购条件及一次性费用须经方案评估确认\n\n统计期间：'+row.start+' — '+row.end,
  plan:row.direction+'；取得适用SKU的书面报价，联合产品、研发及品质核对性能、费用和交付影响，提交单台降本测算及验证结论',
  status:'suggested',priority:row.profitRate<0?'red':'yellow',assignee:'',due:'',completedAt:'',assignedBy:'',assignedAt:'',evidence:'',logs:[],basis:[],descriptionVersion:3,source:'rule-suggestion'};
}
function ccAppendCostProposal(items,product){const row=ccOpportunityRows().find(row=>row.spuId===product.spuId);if(row&&!ccSavedOpportunityTask(row))items.push(ccCostProposal(row))}
// 清单同步关联降本任务的执行状态；普通采购任务不会占用降本状态。
function ccSavedOpportunityTask(row){
 const matches=Object.values(upTodos).filter(task=>task.spuId===row.spuId&&upTodoType(task)==='cost-reduction'&&task.status!=='suggested');
 return matches.find(task=>task.id===row.taskId)||matches.filter(task=>!task.deletedAt).sort((a,b)=>String(b.assignedAt||'').localeCompare(String(a.assignedAt||'')))[0]||matches[0];
}
function ccOpportunityTask(row){return ccSavedOpportunityTask(row)||ccCostProposal(row)}

window.costSavingAudit=()=>ccOpportunityRows().map(row=>({spuId:row.spuId,unitCents:row.unitCents,quotes:row.costQuotes.map(quote=>({...quote}))}));
