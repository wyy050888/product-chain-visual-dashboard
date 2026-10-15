// 新品成功率独立于上线及时率；累计经营数据复用全渠道台账。
function nspSuccessPeriod(period=periodFor('new')){
 const range=bounds(period),year=Number(range.end.slice(0,4)),quarter=Math.ceil(Number(range.end.slice(5,7))/3);
 const annual=period.mode==='year',month=annual?1:(quarter-1)*3+1;
 return {annual,start:`${year}-${String(month).padStart(2,'0')}-01`,end:range.cutoff,
  label:annual?`${String(year).slice(-2)}年`:`Q${quarter}`,target:66};
}
function nspSuccessPass(facts,season,annual){
 const targetWan=season==='四季品'?(annual?2000:500):750;
 return facts.gsvCents>=targetWan*1000000&&facts.profitRate>=12
  &&Number.isFinite(facts.returnRate)&&facts.returnRate<=60;
}
function nspSuccessFact(product,period){
 const identity=upIdentity(product),season=pfIdentity(product).attribute;
 const cumulative=upSummary(identity,product.actualLaunch,period.end,'all');
 const carried=product.actualLaunch<period.start;
 // 历史季度一旦成功，后续下滑也不重新进入季度考核；年度独立复核。
 const previouslySucceeded=!period.annual&&carried&&nspSuccessfulQuarters(product,shiftDate(period.start,-1)).length>0;
 const included=period.start<=period.end&&product.actualLaunch<=period.end
  &&!previouslySucceeded;
 return {included,carried:included&&carried,
  success:included&&nspSuccessPass(cumulative,season,period.annual)};
}
function nspSuccessSummary(rows,period=nspSuccessPeriod()){
 const pool=[...new Map(rows.filter(p=>p.successAssessment.included).map(p=>[p.spuId,p])).values()];
 const success=pool.filter(p=>p.salesSuccess).length,total=pool.length;
 return {...period,success,total,carried:pool.filter(p=>p.successAssessment.carried).length,
  rate:total?success/total*100:null};
}
// 按各季度当时的截止日判定，年度复核失败也不覆盖历史成功季度。
function nspSuccessfulQuarters(product,cutoff=DATA_CUTOFF){
 const quarters=[];
 for(let year=Number(product.actualLaunch.slice(0,4));year<=Number(cutoff.slice(0,4));year++)for(let quarter=1;quarter<=4;quarter++){
  const period=nspSuccessPeriod({mode:'quarter',year,value:quarter});
  if(period.end>cutoff)period.end=cutoff;
  if(period.start>period.end||product.actualLaunch>period.end)continue;
  const facts=upSummary(upIdentity(product),product.actualLaunch,period.end,'all');
  if(nspSuccessPass(facts,pfIdentity(product).attribute,false))return [`${year}-Q${quarter}`];
 }
 return quarters;
}
// 年份仅与上线日期筛选比较；未筛选上线日期时始终展示年份。
function nspSuccessQuarterLabel(key){
 const [year,quarter]=key.split('-');
 return nspLaunchSelection&&String(nspLaunchSelection.year)===year?quarter:`${year.slice(-2)}年${quarter}`;
}
// 列表出池独立于季度考核退出；以所选统计截止日回看当时的在池状态。
function nspPoolExitDate(successQuarters){
 const first=[...successQuarters].sort()[0];if(!first)return null;
 const [year,quarter]=first.split('-Q').map(Number);
 const quarterEnd=new Date(Date.UTC(year,quarter*3,0)).toISOString().slice(0,10);
 return shiftDate(quarterEnd,30);
}
function nspIsInPool(exitDate,cutoff){return !exitDate||cutoff<exitDate}
