// 经营建议依据同期间的组合表现提出评估方向，不复制单产品的应急处理任务。
function gdStrategyImprovementRows(context,range){
 const source=context.by('sales'),end=source.range.end||source.range.cutoff;
 if(end<range.start||end>range.end)return [];
 const brands=window.dashboardSalesReviewSnapshot().sections[0].brand.filter(r=>msVisibleBrands.includes(r.name)&&Number.isFinite(r.actualMargin)&&Number.isFinite(r.targetMargin)&&r.actualMargin<r.targetMargin&&r.scaleDeviation<0);
 if(brands.length<2)return [];
 const names=new Set(brands.map(r=>r.name)),products=[...upSpus.values()].map(upProduct).filter(p=>names.has(p.brand));
 const objects=products.map(p=>({key:'product|'+p.spuId,id:p.spuId,spuId:p.spuId,type:'product',name:p.name,category:pfCategory(p)}));
 if(!objects.length)return [];
 const people=[...new Set(products.map(p=>p.owner).filter(Boolean))];
 const sources=brands.map(row=>diagnosisNormalizeSource({id:'improve|brand-mix|'+row.name,source:'销售达成',sourceTypeKey:'sales-attainment',sourceName:row.name+' · 品牌经营',objectName:row.name,date:end,capturedDate:DATA_CUTOFF,
  content:'统计期间：'+source.range.start+' — '+end+'\n实际 / 目标GSV：'+msMoney(row.sale)+' / '+msMoney(row.target)+'\n实际 / 目标利润率：'+msPercent(row.actualMargin)+' / '+msPercent(row.targetMargin)+'\n规模达成率：'+msPercent(row.scaleRate)+'；偏差：'+msDeviation(row.scaleDeviation)}));
 return [{id:'improvement|brand-mix',kind:'improvement',improvementType:'strategy',title:'结合利润与规模差额评估品牌经营组合',object:objects[0],objectName:brands.map(r=>r.name).join('、'),businessObjects:objects,
  problem:brands.map(r=>r.name+'利润率 '+msPercent(r.actualMargin)+' / 目标 '+msPercent(r.targetMargin)+'，规模偏差 '+msDeviation(r.scaleDeviation)).join('；\n')+'。',
  suggestion:'将上述品牌进一步拆到产品与平台，对比当前组合和调整方案的利润贡献、退货及库存占用；结合供货与交付约束，确定下一周期的产品及渠道推进组合。',
  benefit:'让规模增长与利润目标共同约束经营安排；用调整后的利润贡献、规模偏差和库存变化核对效果。',people,departments:[...new Set(people.map(name=>upTodoPersonDepartment(name)).filter(Boolean))],date:end,sources}];
}
