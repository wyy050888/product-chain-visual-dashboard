// 新品成功演示：固定日期与逐日业绩，不直接指定成功状态，不随查询日期移动。
// 003/006/009在Q4首次成功，043在Q3成功；实际结果仍由当前业务规则计算。
const upNewSuccessSamples=Object.freeze({
 'SPU-SOURCE-003':{from:'2026-10-01',to:'2026-12-31',dailyGsvWan:35,profitRate:19.6,returnRate:.075},
 'SPU-SOURCE-006':{from:'2026-10-02',to:'2026-12-31',dailyGsvWan:28,profitRate:17.8,returnRate:.095},
 'SPU-SOURCE-009':{from:'2026-10-04',to:'2026-12-31',dailyGsvWan:32,profitRate:22.3,returnRate:.065},
 'SPU-SOURCE-043':{from:'2026-08-18',to:'2026-12-31',dailyGsvWan:26,profitRate:16.9,returnRate:.085}
});
// 高GSV演示产品补齐六平台上线记录；沿用公司日GSV按权重分配，不复制各平台金额。
// 其余新品继续保留单平台/多平台组合，上市前仍没有经营数据。
for(const [spuId,profile]of Object.entries(upNewSuccessSamples)){
 const launch=newLaunchSamples.get(spuId);if(!launch)continue;
 for(const platform of qrPlatforms)if(!launch.platformStarts[platform])launch.platformStarts[platform]=profile.from;
}
function upNewSuccessSampleDay(p,day,priceCents,channelIndex){
 const profile=upNewSuccessSamples[p.spuId];
 if(!profile||day.date<profile.from||day.date>profile.to)return null;
 const starts=newLaunchSamples.get(p.spuId)?.platformStarts,weights=[32,13,8,20,15,12];
 const activeWeight=qrPlatforms.reduce((sum,name,i)=>sum+(starts?.[name]&&starts[name]<=day.date?weights[i]:0),0);
 if(!activeWeight)return null;
 const dayIndex=Math.floor(Date.parse(day.date)/86400000);
 const wave=1+.035*Math.sin(dayIndex/5+p.sourceRow);
 const returnRate=profile.returnRate+.004*Math.sin(dayIndex/7+channelIndex);
 // 当日已销售平台分配公司业绩；整数销量、退货及分金额由共用台账累计。
 const sales=Math.max(1,Math.round(profile.dailyGsvWan*1000000*weights[channelIndex]/activeWeight*wave/priceCents/(1-returnRate)));
 const returned=Math.round(sales*returnRate),contacts=Math.round(sales*(.026+(p.sourceRow%3)*.002));
 const qualityContacts=Math.round(contacts*.7),reviews=Math.round(sales*.42);
 return {profitRate:profile.profitRate+.5*Math.sin(dayIndex/11+p.sourceRow),point:{...day,
  sales,returned,received:Math.round(returned*(.66+channelIndex*.025)),orders:Math.round(sales*.88),
  contacts,qualityContacts,experienceContacts:contacts-qualityContacts,reviews,bad:Math.round(reviews*(.012+channelIndex*.002))
 }};
}
