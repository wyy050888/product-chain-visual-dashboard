// 月度事实以品链为主；平台仅用于演示下钻分配，数量使用整数守恒分配。
function lifeChainMonthFacts(stage,month,p=periodFor()){
 const facts=lifecycleMonthlyFacts[p.year]||lifecycleMonthlyFacts[2024],future=`${p.year}-${String(month).padStart(2,'0')}-01`>lifecycleFactCutoff;
 return facts[stage][month-1].map(([target,actual])=>({target,actual:future?0:actual}));
}
function lifePlatformChainMonth(stage,platform,month,p=periodFor()){
 return lifeChainMonthFacts(stage,month,p).map((row,chain)=>{
  const weights=channels.map((_,i)=>channels.length-i+3+(stage+chain+i)%3);
  return {target:splitTarget(row.target,weights)[platform],actual:splitTarget(row.actual,weights)[platform]};
 });
}
function lifeChannelMonth(stage,channel,month,p=periodFor()){
 const rows=lifePlatformChainMonth(stage,channel,month,p);return{target:targetSum(rows.map(row=>row.target)),actual:targetSum(rows.map(row=>row.actual))};
}
