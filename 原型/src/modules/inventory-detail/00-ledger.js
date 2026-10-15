// 库存按真实SPU身份分配演示金额；一个SPU一条，不以项目或品牌复制产品。
// 低动销SPU的演示库存及最早入库日期；数量、金额共用同一财务单价。
function inventorySlowSample(row){
  if(row.sourceRow%6!==0)return row;
  const index=row.sourceRow/6,price=row.num?row.amountCents/row.num:0;
  const num=2400+index*360,staleUnits=Math.round(num*(.45+index%4*.07));
  const scale=row.num?num/row.num:1,avg=row.avg*scale;
  return {...row,num,amountCents:Math.round(num*price),staleCents:Math.round(staleUnits*price),
    avg,turn:avg?row.cost/avg:null,
    // 最早呆滞批次的可售数量样例，是呆滞数量及仓内可售数量的子集。
    staleOldestSellableUnits:Math.round(staleUnits*(.18+index%4*.06)),
    staleOldestReceivedDate:shiftDate('2026-10-10',-(156+index*23))};
}
function inventorySpuLedgerRows(chainRows){
  return chainRows.flatMap((chain,ci)=>{
    const products=sampleSpus.filter(p=>p.chain===ci),weights=products.map(p=>18+p.sourceRow%6*3),den=targetSum(weights),parts={};
    const totals={num:chain.num,amountCents:Math.round(chain.amount*100),staleCents:Math.round(chain.stale*100),
      on:chain.on,late:chain.due-chain.on,refOn:chain.refOn,refLate:chain.refDue-chain.refOn};
    for(const [field,total] of Object.entries(totals))parts[field]=splitTarget(total,weights);
    return products.map((p,i)=>{
      const avg=chain.avg*weights[i]/den,cost=chain.cost*weights[i]/den,on=parts.on[i],due=on+parts.late[i],refOn=parts.refOn[i],refDue=refOn+parts.refLate[i];
      return inventorySlowSample({id:'INV-'+p.spuId,...sampleSpuFields(p),brand:brands.indexOf(p.brand),num:parts.num[i],
        amountCents:parts.amountCents[i],staleCents:parts.staleCents[i],avg,cost,on,due,refOn,refDue,
        turn:avg?cost/avg:null,delivery:due?on/due*100:null,refurb:refDue?refOn/refDue*100:null});
    });
  });
}
function inventorySpuGroups(chainRows){
  const records=inventorySpuLedgerRows(chainRows);
  return brands.map((name,index)=>{
    const rows=records.filter(r=>r.brand===index),sum=field=>rows.reduce((n,r)=>n+r[field],0);
    const avg=sum('avg'),cost=sum('cost'),due=sum('due'),on=sum('on'),refDue=sum('refDue'),refOn=sum('refOn');
    return {name,num:sum('num'),amount:sum('amountCents')/100,stale:sum('staleCents')/100,
      avg,cost,due,on,refDue,refOn,turn:avg?cost/avg:null,delivery:due?on/due*100:null,refurb:refDue?refOn/refDue*100:null};
  });
}
