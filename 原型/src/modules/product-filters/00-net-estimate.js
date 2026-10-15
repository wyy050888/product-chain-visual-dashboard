// 10pp净利测算：原型毛利台账的分母为GSV；正式源字段仍需映射。
function upNetEstimate(s){const deduction=Math.round(s.gsvCents*.1),profitCents=s.profitCents-deduction;return {profitCents,profitRate:s.gsvCents?profitCents/s.gsvCents*100:null,deductionCents:deduction,grossProfitCents:s.profitCents,grossProfitRate:s.profitRate}}
function rpLossRows(platform){
 const w=upWindow();return [...upSpus.values()].map(p=>{
  const s=upSummary(p,w.start,w.end,platform),n=upNetEstimate(s);
  return {...upProduct(p),metricPlatform:platform,lossPlatform:platform,loss:-n.profitCents/1000000,value:upMoney(n.profitCents)};
 }).filter(r=>r.loss>0).sort((a,b)=>b.loss-a.loss||a.spuId.localeCompare(b.spuId));
}

