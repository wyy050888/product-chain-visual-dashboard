// 图表区域和产品等级共用图片规则；缺失等级数据的产品保留并在矩阵中显示灰色。
const kpmGradeOrder=['S','A','B','C'];
const kpmGradeRules=brcGradeRules('recent30');
const kpmChanges={up:'等级上升',down:'等级下降',same:'等级保持',new:'首次分级',pending:'无等级数据',uncompared:'上期无等级数据'};
let kpmSelectedChange='up';
function kpmMatchesChange(assessment,change='all'){
 return change==='all'||(change==='changed'?['up','down'].includes(assessment.change):assessment.change===change);
}
function kpmClassifyGrade(salesWan,profit,units=1,mode='recent30'){
 return units>0?brcProductGrade(salesWan,profit,mode):null;
}
function kpmGradeWindow(end,mode='recent30'){
 if(mode==='recent30')return {start:shiftDate(end,-29),end};
 const year=Number(end.slice(0,4)),month=Number(end.slice(5,7))-1;
 const start=new Date(Date.UTC(year,mode==='year'?0:mode==='quarter'?month-month%3:month,1)).toISOString().slice(0,10);
 return {start,end};
}
function kpmGradeAssessment(identity,end,platform='all',mode='recent30',start=null){
 start=start||kpmGradeWindow(end,mode).start;const facts=upSummary(identity,start,end,platform);
 const level=kpmClassifyGrade(facts.gsvCents/1000000,facts.profitRate,facts.sales,mode);
 return {start,end,mode,level,gsvCents:facts.gsvCents,profitRate:facts.profitRate,sales:facts.sales,profitCents:facts.profitCents,returnRate:facts.returnRate,receivedRate:facts.receivedRate};
}
function kpmGradeChange(current,previous){
 if(!current.level)return 'pending';
 if(!previous.level)return 'uncompared';
 const diff=kpmGradeOrder.indexOf(previous.level)-kpmGradeOrder.indexOf(current.level);
 return diff>0?'up':diff<0?'down':'same';
}
function kpmGradeComparison(identity,end,platform='all',mode='recent30',start=null){
 const current=kpmGradeAssessment(identity,end,platform,mode,start),previousStart=mode==='day'?shiftDate(current.start,-(aiFlowDayDiff(current.start,current.end)+1)):null,previous=kpmGradeAssessment(identity,shiftDate(current.start,-1),platform,mode,previousStart);
 const change=current.level&&!previous.level&&upProduct(identity).actualLaunch>previous.end?'new':kpmGradeChange(current,previous);
 return {current,previous,change};
}
function kpmGradeHistory(identity,end,platform='all'){
 // 历史来自同一逐日台账，每条是独立的30天窗口；上架前数据不伪造等级。
 return Array.from({length:6},(_,i)=>kpmGradeComparison(identity,shiftDate(end,-30*i),platform));
}
window.dashboardKeyProductGradeHistory=spuId=>withPeriod('matrix',()=>{
 const p=upSpus.get(spuId);return p?kpmGradeHistory(p,upWindow().end,kpmBusinessPlatforms()):[];
});
