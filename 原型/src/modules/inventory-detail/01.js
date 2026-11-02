// 同一SPU主表生成品类与品牌库存，金额及数量与品类汇总对齐。
function inventoryProductLedger(){
  const previous=invView;
  try{invView='chain';return inventorySpuLedgerRows(inventoryRows())}finally{invView=previous}
}
function inventoryProductSum(rows){const sum=field=>targetSum(rows.map(r=>r[field])),avg=sum('avg'),cost=sum('cost'),due=sum('due'),on=sum('on'),refDue=sum('refDue'),refOn=sum('refOn');return{num:sum('num'),amountCents:sum('amountCents'),staleCents:sum('staleCents'),avg,cost,due,on,refDue,refOn,turn:avg?cost/avg:null,delivery:due?on/due*100:null,refurb:refDue?refOn/refDue*100:null}}
