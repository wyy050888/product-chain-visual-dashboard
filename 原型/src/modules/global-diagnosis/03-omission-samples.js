// 遗漏按不同风险选例；业务余额是事实，未见工作提及仅限本次扫描材料。
function gdOmissionSamples(context,records){
 const mentioned=new Set(records.map(r=>r.objectKey));
 const candidates=context.by('inventory').rows.filter(r=>upSpus.has(r.spuId)&&!mentioned.has('product|'+r.spuId));
 const stale=candidates.filter(r=>r.staleValueCents>0).sort((a,b)=>b.staleValueCents-a.staleValueCents)[0];
 const inspection=candidates.filter(r=>r.factoryInspection>0&&r.spuId!==stale?.spuId).sort((a,b)=>b.factoryInspection-a.factoryInspection)[0];
 const previousActions=['核实库存处置是否已有安排，补齐处置数量、工厂承接方式及完成日期。','确认库存产品的渠道去化安排，反馈可售范围与处置计划。'];
 return [[stale,'clearance'],[inspection,'inspection']].flatMap(([r,kind])=>{
  if(!r)return [];
  const product=upProduct(upSpus.get(r.spuId)),isStale=kind==='clearance',start=shiftDate(DATA_CUTOFF,-3);
  const risk=isStale?'呆滞库存金额：'+gdMoney(r.staleValueCents):'工厂待检库存：'+fmt(r.factoryInspection)+'件';
  return [{id:'work-omission-'+r.spuId,kind:'omission',department:'采购部',priority:'P2',
   object:{key:'product|'+r.spuId,name:product.name,type:'product',spuId:r.spuId},
   title:isStale?'核实呆滞品清仓去化安排':'核实待检库存验货与放行安排',
   problem:isStale?`呆滞库存金额达 ${gdMoney(r.staleValueCents)}，已收集的会议及日周月报中未见积压库存的销售或退厂处理安排，资金占用可能继续延长。`:
    `工厂有 ${fmt(r.factoryInspection)} 件待检库存，已收集材料中未见验货及放行事项；这批货尚未转为可售，渠道补货可用量无法确认。`,
   summary:isStale?'核实清仓去化覆盖':'核实验货放行覆盖',samplePreviousActions:previousActions,
   problemSource:{sourceId:'coverage-'+kind,quote:'按业务对象匹配，未找到该产品的工作提及。'},
   rolePlans:isStale?[
    ['唐琪','核实呆滞品退厂、返工或清仓承接条件，记录数量及处置日期。','已关联现有处置记录；无记录时已确认承接方式、数量和日期。'],
    ['林悦','核实尾货适销渠道与清仓节奏，反馈价格底线和去化安排。','渠道范围、价格底线及去化节点已确认。']
   ]:[
    ['唐琪','核实工厂待检批次和验货安排，协调品质反馈放行条件及日期。','已关联验货记录，待检批次、放行条件及日期已核实。'],
    ['林悦','将待检批次与渠道补货计划对照，核实放行前后的可承诺数量。','已记录待检货与可售货的区分及渠道补货承诺。']
   ],
   sources:[{id:'stock-risk-'+kind,date:DATA_CUTOFF,source:'库存管控\n'+product.name+'\n'+DATA_CUTOFF,content:risk},
    {id:'coverage-'+kind,date:DATA_CUTOFF,source:'来源扫描清单\n'+start+' — '+DATA_CUTOFF,content:`已收集 ${records.length} 条会议及日周月报记录；按业务对象匹配，未找到该产品的工作提及。`}],
   coverage:{checked:records.length,mentions:0,start,end:DATA_CUTOFF}}];
 });
}
