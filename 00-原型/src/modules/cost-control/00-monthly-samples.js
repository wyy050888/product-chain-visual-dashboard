// 8—10月为固定交互样例，不属于00-monthly-reference中的截图实绩；金额单位万元。
// 仅补齐原本缺失的月度实际，保留原目标、1—7月截图值及用户后续保存的数据。
const ccMonthlySamples={
 purchase:[124.8,188.6,246.3],
 warehouse:[11.4,10.8,17.1],
 risk:[27.6,38.2,21.3],
 shipping:[9.6,27.4,0],
 planning:[2.8,3.2,3.1],
 quality:[21.6,26.3,18.9],
 user:[32.4,42.8,39.6]
};
for(const [department,amounts] of Object.entries(ccMonthlySamples)){
 const items=ccItems.filter(item=>item.department===department),weights=items.map(item=>item.annualCents);
 amounts.forEach((amount,index)=>{
  const month='2026-'+String(index+8).padStart(2,'0');if(month>DATA_CUTOFF.slice(0,7))return;
  const allocations=ccAllocate(Math.round(amount*1000000),weights);
  const dates=[month+'-07',month+'-17',month===DATA_CUTOFF.slice(0,7)?DATA_CUTOFF:month+'-27'];
  items.forEach((item,itemIndex)=>{
   const row=ccLedger.find(record=>record.itemId===item.id&&record.month===month);if(!row?.actualMissing)return;
   // 明确填报0也生成确认事件，不能与未填报混同；分摊始终守恒到分。
   const parts=ccAllocate(allocations[itemIndex],[4,3,3]);
   row.actualMissing=false;
   row.confirmations=dates.map((date,eventIndex)=>({id:'DEMO-SUPPLEMENT-'+month+'-'+item.id+'-'+eventIndex,date,cents:parts[eventIndex]}));
  });
 });
}
