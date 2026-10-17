// 图片规则逐条匹配，未覆盖区间及无销量保留待分级，不用四象限替代等级。
const kpmGradeOrder=['S','A','B','C'];
const kpmChanges={up:'等级上升',down:'等级下滑',same:'等级保持',new:'首次分级',pending:'待分级',uncompared:'上期待分级'};
let kpmSelectedChange='all';
function kpmClassifyGrade(salesWan,profit,units=1){
 if(!(units>0)||!Number.isFinite(salesWan)||!Number.isFinite(profit))return null;
 if(salesWan>600&&profit>12)return 'S';
 if(salesWan>300&&profit<12)return 'A';
 if(salesWan>60&&salesWan<300&&profit>15)return 'B';
 if(salesWan<60&&profit<12)return 'C';
 return null;
}
function kpmGradeAssessment(identity,end){
 const start=shiftDate(end,-29),facts=upSummary(identity,start,end,'all');
 const level=kpmClassifyGrade(facts.gsvCents/1000000,facts.profitRate,facts.sales);
 return {start,end,level,gsvCents:facts.gsvCents,profitRate:facts.profitRate,sales:facts.sales,profitCents:facts.profitCents};
}
function kpmGradeChange(current,previous){
 if(!current.level)return 'pending';
 if(!previous.level)return 'uncompared';
 const diff=kpmGradeOrder.indexOf(previous.level)-kpmGradeOrder.indexOf(current.level);
 return diff>0?'up':diff<0?'down':'same';
}
function kpmGradeComparison(identity,end){
 const current=kpmGradeAssessment(identity,end),previous=kpmGradeAssessment(identity,shiftDate(end,-30));
 const change=current.level&&!previous.level&&upProduct(identity).actualLaunch>previous.end?'new':kpmGradeChange(current,previous);
 return {current,previous,change};
}
function kpmGradeHistory(identity,end){
 // 历史来自同一逐日台账，每条是独立的30天窗口；上架前数据不伪造等级。
 return Array.from({length:6},(_,i)=>kpmGradeComparison(identity,shiftDate(end,-30*i)));
}
window.dashboardKeyProductGradeHistory=spuId=>withPeriod('matrix',()=>{
 const p=upSpus.get(spuId);return p?kpmGradeHistory(p,upWindow().end):[];
});
