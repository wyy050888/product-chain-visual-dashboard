// 原型SKU经营样例：独立分配件数与分金额，SKU合计与同期间SPU台账一致。
// 正式取数使用SKU经营字段；演示利润额按SKU分配并保持同期间SPU合计不变。
const upSkuOperatingCache=boundedCache(3200);
function upSkuOperatingRows(product,start,end){
 const p=upIdentity(product),key=upFactsKey(p,'sku-demo',start,end),cached=upSkuOperatingCache.get(key);
 if(cached)return cached;
 const summary=upSummary(p,start,end,'all'),weights=[50,30,20,0];
 const net=splitTarget(summary.sales-summary.returned,weights),returned=splitTarget(summary.returned,weights);
 const values=splitTarget(summary.gsvCents,net.some(value=>value>0)?net:weights);
 const profits=upSkuProfitSamples(p,summary,values,end);
 const rows=upStockSkus(p).map((sku,index)=>({...sku,start,end,sales:net[index]+returned[index],returned:returned[index],netSales:net[index],gsvCents:values[index],
  profitCents:profits[index],profitRate:values[index]>0&&Number.isFinite(profits[index])?profits[index]/values[index]*100:null,source:'demo'}));
 upSkuOperatingCache.set(key,rows);return rows;
}

// SKU演示成本差异按月份稳定轮换，覆盖不同颜色的盈亏与环比；分金额修正保证汇总守恒。
function upSkuProfitSamples(product,summary,values,end){
 if(!Number.isFinite(summary.profitCents)||!(summary.gsvCents>0))return values.map(()=>null);
 const profiles=[[-8,10,5,0],[-2,10,-10,0],[-8,0,20,0]];
 const phase=((Number(end.slice(0,4))*12+Number(end.slice(5,7))+(product.sourceRow||0))||0)%profiles.length;
 const shifts=values.map((value,index)=>Math.round(value*profiles[phase][index]/100)),base=splitTarget(summary.profitCents,values);
 const first=values.findIndex(value=>value>0),correction=shifts.reduce((sum,value)=>sum+value,0);
 return base.map((value,index)=>value+shifts[index]-(index===first?correction:0));
}
