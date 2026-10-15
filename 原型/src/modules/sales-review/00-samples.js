// 固定经营样例，不写入用户目标配置。金额单位万元，数量单位件。
// 品牌/平台是同一份公司数据的两种切分，金额和目标利润都先分配再汇总。
function msSampleCells(){
 return salesCrossData().map((row,c)=>row.map((cell,b)=>{
  const targetMargin=[14.8,10.0,13.8,12.2][c]+[-.8,.4,-.5,1.2,-1,.7,-.3,.9,.2,-.6][b%10];
  const feeRate=2.4+(c+b%4)*.45;
  const salesUnits=Math.round(cell.sale*10000/(260+c*95+b*27));
  return {...cell,salesUnits,targetGross:cell.target*targetMargin/100,expense:+(cell.sale*feeRate/100).toFixed(2),netSales:Math.round(cell.sale*10000/(260+c*95+b*27)*(.9+b%3*.015))};
 }));
}
function msSum(cells,name){
 return {...sumSalesCells(cells,name),...Object.fromEntries(['targetGross','expense','netSales','salesUnits'].map(key=>[key,cells.reduce((n,r)=>n+r[key],0)]))};
}
function msSamplePlatforms(cells){
 const actual=[22,11,6,7,10,18,12,8,6],goals=[19,12,8,6,11,17,11,10,6];
 const grossMix=actual.map((w,i)=>w*[.94,.9,.98,1.1,1.04,1.13,1.08,.84,.96][i]);
 const targetMix=goals.map((w,i)=>w*[1.05,.95,1.1,.9,1.06,.98,1.08,.94,1.02][i]);
 const rows=msPlatforms.map(name=>({name,sku:0,sale:0,target:0,annual:0,ytd:0,gross:0,targetGross:0,expense:0,netSales:0,salesUnits:0}));
 for(const cell of cells)for(const key of ['sku','sale','target','annual','ytd','gross','targetGross','expense','netSales','salesUnits']){
  const weights=key==='gross'?grossMix:key==='targetGross'?targetMix:['target','annual'].includes(key)?goals:actual;
  // 利润保留精度；金额按分配后的整数0.01万元汇总，避免分项尾差。
  const precise=['gross','targetGross'].includes(key),scale=['sku','netSales'].includes(key)?1:100;
  const parts=key==='salesUnits'?splitTarget(cell.netSales,weights).map((v,i)=>v+splitTarget(cell.salesUnits-cell.netSales,weights)[i]):precise?weights.map(w=>cell[key]*w/targetSum(weights)):splitTarget(Math.round(cell[key]*scale),weights).map(v=>v/scale);
  parts.forEach((v,i)=>rows[i][key]+=v);
 }
 return rows.map(r=>({...r,profit:r.sale?r.gross/r.sale*100:0}));
}
