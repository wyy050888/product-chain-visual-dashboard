// 固定经营样例，不写入用户目标配置。金额单位万元，数量单位件。
// 品牌/渠道是同一份公司数据的两种演示切分，渠道分配不构成平台归属关系，金额和目标利润都先分配再汇总。
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
function msSampleChannels(cells){
 return salesPlatformAllocation(cells,['sku','sale','target','annual','ytd','gross','targetGross','expense','netSales','salesUnits']);
}
