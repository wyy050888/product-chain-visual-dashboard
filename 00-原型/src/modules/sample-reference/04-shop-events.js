// 非品质店铺处罚样例：仅用于全部原因统计，不改变高危店铺入榜规则。
function sampleShopNonQualityEvents(shop,start,end){
 const events=[],definitions=[['fine','logistics','发货超时',11,800],['frozen','operations','交易风控',13,2000],['offShelf','listing','商品信息不规范',16,0],['drop','operations','营销活动违规',20,0],['limited','logistics','履约异常',24,0]];
 for(let month=start.slice(0,7);month<=end.slice(0,7);month=riskMonthShift(month,1)){
  for(const [type,reasonType,reason,day,base] of definitions){
   const date=month+'-'+String(day).padStart(2,'0');
   if(date<start||date>end||date>DATA_CUTOFF)continue;
   events.push({type,date,amount:base?base+(shop.id%5)*100:0,reasonType,reason,source:'demo'});
  }
 }
 return events;
}
