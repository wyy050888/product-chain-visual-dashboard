// 固定演示样例：12个已上市SPU覆盖六种上升、六种下滑，数字仍由日台账汇总后分级。
// 最近三个30天窗口交替采用两组销量/利润样例，历史可查看反向变动；更早日期保留原台账。
const upGradeSampleProfiles={
 S:{gsvWan:1800,profitRate:20},A:{gsvWan:1000,profitRate:8},
 B:{gsvWan:180,profitRate:18},C:{gsvWan:36,profitRate:6}
};
const upGradeSamplePaths={
 'SPU-SOURCE-004':['C','B'],'SPU-SOURCE-005':['C','A'],'SPU-SOURCE-008':['C','S'],
 'SPU-SOURCE-010':['B','A'],'SPU-SOURCE-013':['B','S'],'SPU-SOURCE-016':['A','S'],
 'SPU-SOURCE-018':['S','A'],'SPU-SOURCE-020':['S','B'],'SPU-SOURCE-022':['S','C'],
 'SPU-SOURCE-024':['A','B'],'SPU-SOURCE-026':['A','C'],'SPU-SOURCE-028':['B','C']
};
function upGradeSampleDay(p,day,priceCents,channelIndex){
 const path=upGradeSamplePaths[p.spuId],age=aiFlowDayDiff(day.date,DATA_CUTOFF);
 if(!path||age<0||age>=90)return null;
 const profile=upGradeSampleProfiles[path[Math.floor(age/30)%2===0?1:0]];
 // 两条业务线各占50%，确保三种范围均有可演示的十二条路径；渠道金额相加守恒。
 const weight=[.28,.14,.08,.22,.16,.12][channelIndex];
 const volume=1+(p.sourceRow%7-3)*.06;
 const profitRate=profile.profitRate+(p.sourceRow%11-5)*.35;
 const wave=1+.04*Math.sin(Date.parse(day.date)/86400000/5+p.sourceRow);
 const returnRate=day.sales?Math.min(.35,day.returned/day.sales):.08;
 const sales=Math.max(1,Math.round(profile.gsvWan*volume*1000000/30*weight*wave/priceCents/(1-returnRate)));
 const factor=day.sales?sales/day.sales:0,point={...day,sales};
 for(const key of upCountFields)if(key!=='sales')point[key]=Math.max(0,Math.round((day[key]||0)*factor));
 point.returned=Math.round(sales*returnRate);point.received=Math.min(point.returned,point.received);
 return {point,profitRate};
}
