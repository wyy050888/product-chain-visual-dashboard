// 店铺-SPU金额为稳定演示台账：逐日分摊店铺GSV，分摊后以分为单位守恒。
// 利润率使用明确的样例成本率，不拿全平台产品利润率冒充本店利润率。
function sdOperatingFacts(shop,start,end){
 const rows=new Map(sampleShopProducts(shop).map(product=>[product.spuId,{product,sales:0,returned:0,gsvCents:0,profitCents:0,source:'demo'}])),points=[];
 for(const day of riskShopPeriod(shop,riskRange(start,end)).points){
  if(day.date>DATA_CUTOFF)continue;
  const details=sampleShopSpuSales(shop,day.date,day.date),weights=details.map((r,i)=>(r.sales-r.returned)*(80+(shop.id*13+i*31)%170));
  const total=weights.reduce((a,b)=>a+b,0),gsvCents=total?Math.round(day.gsv*1000000):0;
  let accumulated=0,allocated=0,sales=0,returned=0;
  details.forEach((r,i)=>{
   accumulated+=weights[i];const next=total?(i===details.length-1?gsvCents:Math.round(gsvCents*accumulated/total)):0;
   const value=next-allocated,profit=Math.round(value*(7+((shop.id*3+i*7)%13))/100),row=rows.get(r.product.spuId);
   row.sales+=r.sales;row.returned+=r.returned;row.gsvCents+=value;row.profitCents+=profit;
   allocated=next;sales+=r.sales;returned+=r.returned;
  });
  points.push({date:day.date,gsvCents,sales,returned,netSales:sales-returned});
 }
 const products=[...rows.values()].map(r=>({...r,netSales:r.sales-r.returned,profitRate:r.gsvCents?r.profitCents/r.gsvCents*100:null})).sort((a,b)=>b.gsvCents-a.gsvCents||a.product.spuCode.localeCompare(b.product.spuCode));
 const sales=products.reduce((n,r)=>n+r.sales,0),returned=products.reduce((n,r)=>n+r.returned,0);
 return {products,points,sales,returned,returnRate:sales?returned/sales*100:null};
}
function sdTrendRows(points,mode){
 const buckets=new Map();
 for(const p of points){
  const key=mode==='year'?p.date.slice(0,7):mode==='quarter'?shiftDate(p.date,-((new Date(p.date+'T00:00:00Z').getUTCDay()+6)%7)):p.date;
  if(!buckets.has(key))buckets.set(key,{date:p.date,end:p.date,gsvCents:0,sales:0,returned:0});
  const b=buckets.get(key);b.end=p.date;for(const k of ['gsvCents','sales','returned'])b[k]+=p[k];
 }
 return [...buckets.values()].map(b=>({date:b.date===b.end?b.date:b.date+' — '+b.end,gsv:b.gsvCents/1000000,netSales:b.sales-b.returned,returnRate:b.sales?b.returned/b.sales*100:null}));
}

function sdTrendPoints(m,state){
 const mode={quarter:'week',year:'month'}[state.period?.mode];
 if(!mode)return m.points;
 const range=recentTrendRange(state.start,state.end,mode);
 return sdOperatingFacts(m.shop,range.start,range.end).points;
}
