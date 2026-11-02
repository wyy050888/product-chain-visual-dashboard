// 销售达成：同周期实际/完整周期目标，偏差按实际比率减目标比率计算，页面统一使用%符号，不借用新品目标。
const msChannels=filterCatalog.platforms;
const msVisibleBrands=filterCatalog.dashboardBrands;
let msScope=-1;
function msPeriodText(p=periodFor('sales')){return periodShortText(p)}
function msProgress(p=periodFor('sales')){
 const b=bounds(p),days=aiFlowDayDiff(b.start,b.end)+1,elapsed=b.cutoff<b.start?0:Math.min(days,aiFlowDayDiff(b.start,b.cutoff)+1);
 return elapsed/days*100;
}
function msRatio(actual,target){return !Number.isFinite(actual)||!Number.isFinite(target)||target===0?null:actual/target*100}
// 达成按业务展示规则最高100%；利润率、费率等普通比率不封顶。
function msAchievementRatio(actual,target){const rate=msRatio(actual,target);return rate===null?null:Math.min(100,rate)}
function msTone(n){return !Number.isFinite(n)?'muted':n< -10?'red':n<0?'orange':'green'}
function msPercent(n){return Number.isFinite(n)?fmt(n,1)+'%':'--'}
function msDeviation(n){return Number.isFinite(n)?(n>0?'+':'')+fmt(n,1)+'%':'--'}
function msMoney(n,signed=false){return Number.isFinite(n)?pfMoneyYuan(n*10000,signed):'--'}
function msGoal(name,p=periodFor('sales')){
 const value=salesTargetStore.years[p.year]?.profitRates?.[name];
 return typeof value==='number'&&Number.isFinite(value)?value:null;
}
function msFacts(r,p=periodFor('sales')){
 const progress=msProgress(p),targetMargin=msGoal(r.name,p)??msRatio(r.targetGross,r.target),gsvRate=msAchievementRatio(r.sale,r.target);
 const actualMargin=Number.isFinite(r.sale)&&r.sale>0?(Number.isFinite(r.gross)?r.gross/r.sale*100:r.profit):null;
 const scaleRate=msAchievementRatio(Number.isFinite(r.sale)&&Number.isFinite(actualMargin)?r.sale*actualMargin:null,Number.isFinite(r.target)&&Number.isFinite(targetMargin)?r.target*targetMargin:null);
 return {...r,feeRate:msRatio(r.expense,r.sale),actualMargin,targetMargin,progress,gsvRate,gsvDeviation:gsvRate===null?null:gsvRate-progress,marginGap:actualMargin===null||targetMargin===null?null:actualMargin-targetMargin,scaleRate,scaleDeviation:scaleRate===null?null:scaleRate-progress,gap:Number.isFinite(r.target)&&Number.isFinite(r.sale)?r.target-r.sale:null};
}
function msSort(rows){return rows.map(r=>msFacts(r)).sort((a,b)=>Number.isFinite(b.scaleRate)-Number.isFinite(a.scaleRate)||(Number.isFinite(a.scaleRate)&&Number.isFinite(b.scaleRate)?b.scaleRate-a.scaleRate:0))}
function msBreakdown(index,view,cells=msSampleCells()){
 if(view==='brand')return brands.map((name,b)=>index<0?msSum(cells.map(row=>row[b]),name):{...cells[index][b],name});
 return msSampleChannels(index<0?cells.flat():cells[index]);
}
function msSalesSections(){
 const cells=msSampleCells(),summaries=[msSum(cells.flat(),'公司整体'),...cells.map((row,index)=>msSum(row,chains[index]))];
 return summaries.map((row,ordinal)=>{const index=ordinal-1;return {index,summary:msFacts(row),brand:msBreakdown(index,'brand',cells).map(row=>msFacts(row)),platform:msBreakdown(index,'platform',cells).map(row=>msFacts(row))}});
}
function msRulesText(){return 'GSV达成＝实际GSV÷完整周期目标GSV；GSV偏差＝GSV达成－时间进度。利润率差额＝实际利润率－目标利润率。规模达成＝（实际GSV×实际利润率）÷（目标GSV×目标利润率）；规模偏差＝规模达成－时间进度。GSV与规模达成率最高100%，偏差使用封顶后的达成率减时间进度。偏差/差额按百分比直接相减，不计算相对增长率；＜−10%红，−10%≤值＜0%黄，≥0%绿。时间进度按所选周期已过自然日÷周期总自然日；截止日按样例数据日期封顶，正式截止口径待接入。经营数据、利润率目标、费率、消耗、去退后销量均为固定原型样例；六平台按独立样例权重分配，同范围合计与公司/链群一致；固定展示5个品牌，其他品牌仍计入汇总，利润率按汇总利润÷GSV重算。已配置的利润率目标优先于默认样例。'}
window.dashboardSalesReviewSnapshot=()=>withPeriod('sales',()=>({period:copyPeriod(periodFor()),progress:msProgress(),sections:msSalesSections(),company:msFacts(msSum(msSampleCells().flat(),'公司整体')),chains:msSampleCells().map((row,i)=>msFacts(msSum(row,chains[i]))),brands:msSort(msBreakdown(-1,'brand')),channels:msBreakdown(-1,'platform').map(row=>msFacts(row)),breakdown:{index:msScope,view:siView,rows:msBreakdown(msScope,siView).map(row=>msFacts(row))}}));
