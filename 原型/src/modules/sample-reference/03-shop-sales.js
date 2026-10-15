// 店铺专用演示商品，不并入截图来源的50条SPU主数据，也不冒充真实型号。
const sampleShopDemoSpus=[
 {spuId:'SHOP-DEMO-SUPOR-01',spuCode:'DEMO-SUPOR-CLEAN-01',name:'苏泊尔洗地机（演示款A）',model:'DEMO-CLEAN-A',brand:'苏泊尔',chain:0,source:'demo'},
 {spuId:'SHOP-DEMO-SUPOR-02',spuCode:'DEMO-SUPOR-CLEAN-02',name:'苏泊尔吸尘器（演示款B）',model:'DEMO-CLEAN-B',brand:'苏泊尔',chain:0,source:'demo'},
 {spuId:'SHOP-DEMO-SUPOR-03',spuCode:'DEMO-SUPOR-LIFE-01',name:'苏泊尔生活电器（演示款A）',model:'DEMO-LIFE-A',brand:'苏泊尔',chain:1,source:'demo'},
 {spuId:'SHOP-DEMO-SUPOR-04',spuCode:'DEMO-SUPOR-LIFE-02',name:'苏泊尔生活电器（演示款B）',model:'DEMO-LIFE-B',brand:'苏泊尔',chain:1,source:'demo'}
];
function sampleShopProducts(shop){
 const brandProducts=[...sampleSpus,...sampleShopDemoSpus].filter(p=>p.brand===shop.brand);
 const categoryProducts=brandProducts.filter(p=>p.chain===shop.chain);
 return categoryProducts.length?categoryProducts:brandProducts;
}
// 日销量和退货整数分摊至SPU，主营排序与店铺净销量共用这些明细。
function sampleShopDailySales(shop,date){
 return date>DATA_CUTOFF?0:Math.round((35+shop.id*4)*riskDailyWeight(date,shop.id));
}
function sampleShopSpuSales(shop,start,end){
 const products=sampleShopProducts(shop);
 if(!products.length)return [];
 const rows=products.map(product=>({product,sales:0,returned:0,source:'demo'}));
 for(let date=start;date<=end&&date<=DATA_CUTOFF;date=shiftDate(date,1)){
  const day=Math.floor(Date.parse(date)/86400000),sales=sampleShopDailySales(shop,date);
  const weights=products.map((p,i)=>1+((shop.id*7+i*11)%9)+8*(1+Math.sin(day*.19+i*1.7+shop.id)));
  const total=weights.reduce((sum,n)=>sum+n,0);const returned=Math.round(sales*.095);let cumulative=0,allocated=0,returnedAllocated=0;
  rows.forEach((row,i)=>{
   cumulative+=weights[i];const next=i===rows.length-1?sales:Math.floor(sales*cumulative/total);
   const nextReturned=sales?Math.floor(returned*next/sales):0;
   row.sales+=next-allocated;row.returned+=nextReturned-returnedAllocated;
   allocated=next;returnedAllocated=nextReturned;
  });
 }
 return rows;
}
