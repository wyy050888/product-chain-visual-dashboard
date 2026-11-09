// 非品质处罚演示台账：日期由SPU、平台与月份确定，切换区间不会重新随机。
// 仅供“全部原因”统计；不参与品质榜入榜、默认排序和品质风险判断。
function qrbNonQualityEvents(product,platform,start,end){
 const seed=product.id*13+qrPlatforms.indexOf(platform)*7,events=[];
 const definitions=[
  ['罚款','logistics','发货超时',4,500],
  ['资金冻结','operations','交易风控',8,1500],
  ['下架','listing','商品信息不规范',16,0],
  ['掉权','operations','营销活动违规',24,0]
 ];
 for(let month=start.slice(0,7);month<=end.slice(0,7);month=riskMonthShift(month,1)){
  definitions.forEach(([type,reasonType,reason,day,base],index)=>{
   if((seed+index)%4===0)return;
   const date=month+'-'+String(day).padStart(2,'0');
   if(date<start||date>end||date>DATA_CUTOFF||(product.actualLaunch&&date<product.actualLaunch))return;
   events.push({type,date,amount:base?base+(seed+Number(month.slice(5)))%5*100:0,reasonType,reason,source:'demo'});
  });
 }
 return events;
}

// 指定汇报产品的品质处罚样例：固定月份日期，不随筛选临时生成或补零。
function qrbProductQualitySamples(product,platform,start,end){
 const source=sampleSpus.find(p=>p.spuId===product.spuId);
 if(!source?.qualityEventSample)return [];
 const ci=qrPlatforms.indexOf(platform),events=[];
 const definitions=[['罚款',3,1200,'批次抽检不合格'],['资金冻结',6,3500,'品质售后争议待处理'],['下架',15,0,'商品品质投诉待整改'],['掉权',23,0,'品质投诉影响搜索曝光']];
 for(let month=start.slice(0,7);month<=end.slice(0,7);month=riskMonthShift(month,1)){
  for(const [type,day,base,reason] of definitions){
   const date=month+'-'+String(day).padStart(2,'0');
   if(date<start||date>end||date>DATA_CUTOFF||(product.actualLaunch&&date<product.actualLaunch))continue;
   events.push({type,date,amount:base?base+ci*200:0,reasonType:'quality',reason,source:'demo'});
  }
 }
 return events;
}
