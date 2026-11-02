// 固定演示样例：等级由共用日台账汇总后计算，不直接写入评级结果。
// 常规样例交替变动；连续下滑样例按最近三个30天窗口分别配置，更早日期保留原台账。
const upGradeSampleProfiles={
 S:{gsvWan:1800,profitRate:20},A:{gsvWan:1000,profitRate:8},
 B:{gsvWan:180,profitRate:18},C:{gsvWan:36,profitRate:6}
};
const upGradeSamplePaths={
 // 004提供一条C→S增长样例，S级净增由共用日台账计算，卡片不写死变化数。
 'SPU-SOURCE-004':['C','S'],'SPU-SOURCE-005':['C','A'],'SPU-SOURCE-008':['C','S'],
 'SPU-SOURCE-010':['B','A'],'SPU-SOURCE-013':['B','S'],'SPU-SOURCE-016':['A','S'],
 'SPU-SOURCE-018':['S','A'],'SPU-SOURCE-020':['S','B'],'SPU-SOURCE-022':['S','C'],
 'SPU-SOURCE-024':['A','B'],'SPU-SOURCE-026':['A','C'],'SPU-SOURCE-028':['B','C']
};
// 从近到远：024为S→A→B，028为S→B→C；金额选在默认近30天等级门槛内部。
// 两条业务线各半后仍满足这些分级，使用真实整数销量/退货及分金额汇总。
const upGradeConsecutiveSamples={
 'SPU-SOURCE-024':[{gsvWan:60,profitRate:18},upGradeSampleProfiles.A,upGradeSampleProfiles.S],
 'SPU-SOURCE-028':[{gsvWan:12,profitRate:6},{gsvWan:60,profitRate:18},upGradeSampleProfiles.S]
};
function upGradeSampleDay(p,day,priceCents,channelIndex){
 const path=upGradeSamplePaths[p.spuId],age=aiFlowDayDiff(day.date,DATA_CUTOFF);
 if(!path||age<0||age>=90)return null;
 const stage=Math.floor(age/30),profile=upGradeConsecutiveSamples[p.spuId]?.[stage]||upGradeSampleProfiles[path[stage%2===0?1:0]];
 // 两条业务线各占50%；渠道金额相加守恒。
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
