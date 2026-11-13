// 六榜各自持有期间；库存始终使用最新快照，退货使用成熟区间及显式对照期。
const rpTimedBoards=[0,6,8,1,2],rpBoardPeriods={};
function rpLatestReturnMonth(reference=dashboardSyncDate()){
 const month=reference.slice(0,7);if(Number(reference.slice(8))>=21)return month;
 const stableEnd=shiftDate(reference,-16),stableMonth=stableEnd.slice(0,7),monthEnd=shiftDate(dateRangeMonthShift(stableMonth,1)+'-01',-1);
 return monthEnd<=stableEnd?stableMonth:dateRangeMonthShift(stableMonth,-1);
}
function rpReturnPeriod(mode='week',value=dashboardSyncDate(),reference=dashboardSyncDate()){
 if(mode==='month'){
  const latest=rpLatestReturnMonth(reference),month=value>latest?latest:value;
  const previousMonth=dateRangeMonthShift(month,-1),start=month+'-01';
  const monthEnd=shiftDate(dateRangeMonthShift(month,1)+'-01',-1),stableEnd=shiftDate(reference,-16);
  const end=month===reference.slice(0,7)?(stableEnd<monthEnd?stableEnd:monthEnd):monthEnd;
  return {mode:'day',year:+month.slice(0,4),value:+month.slice(5,7),start,end,comparisonMode:'month',reference,
   previousStart:previousMonth+'-01',previousEnd:shiftDate(start,-1),stableEnd};
 }
 const anchor=value;
 return {mode:'day',year:+anchor.slice(0,4),value:+anchor.slice(5,7),start:shiftDate(anchor,-22),end:shiftDate(anchor,-16),
  comparisonMode:'week',reference:anchor,previousStart:shiftDate(anchor,-29),previousEnd:shiftDate(anchor,-23),stableEnd:shiftDate(anchor,-16)};
}
function rpDefaultBoardPeriod(kind,date=dashboardSyncDate()){
 return [6,8].includes(kind)?rpReturnPeriod('week',date,date):{mode:'day',year:+date.slice(0,4),value:+date.slice(5,7),start:shiftDate(date,-29),end:date};
}
for(const kind of rpTimedBoards)rpBoardPeriods[kind]=rpDefaultBoardPeriod(kind,DATA_CUTOFF);
function rpUsesBoardPeriods(){return wfDirector()&&(typeof pcIsActive!=='function'||!pcIsActive())}
function rpBoardPeriod(kind){return !rpUsesBoardPeriods()?periodFor('risk'):[3,4].includes(kind)?rpDefaultBoardPeriod(kind):rpBoardPeriods[kind]||rpDefaultBoardPeriod(kind)}
function rpWithBoardPeriod(kind,read,period=rpBoardPeriod(kind)){return drawerWithPeriod(period,read)}
function rpDetailPeriod(kind){
 const body=$('#dialogbody'),saved=!$('#overlay').hidden&&body.dataset.riskRankingKind===String(kind)?body.dataset.rankingPeriod:null;
 return saved?JSON.parse(saved):{...rpBoardPeriod(kind)};
}
function rpBoardRangeText(kind){
 const p=periodFor('risk');if(kind===6&&p.comparisonMode)return p.start+' ~ '+p.end+' vs '+p.previousStart+' ~ '+p.previousEnd;
 if(kind===8&&p.comparisonMode)return p.start+' ~ '+p.end;
 return [3,4].includes(kind)?'实时快照 '+DATA_CUTOFF:riskRangeText();
}
// 日期区间与对比标记独立呈现，纯文本口径继续供其他入口复用。
function rpBoardRangeMarkup(kind){
 const period=periodFor('risk');
 if(kind!==6||!period.comparisonMode)return esc(rpBoardRangeText(kind));
 const range=(start,end)=>'<span class="rp-date-period">'+esc(start+' ~ '+end)+'</span>';
 return range(period.start,period.end)+' <span class="rp-date-versus">vs</span> '+range(period.previousStart,period.previousEnd);
}
function rpBoardControlSlot(kind){return rpUsesBoardPeriods()&&rpTimedBoards.includes(kind)?`<div class="rp-board-period" data-rp-board-date="${kind}"></div>`:''}
function rpClearSharedDateControls(){
 const section=$('#risk');section.classList.toggle('rp-independent-dates',rpUsesBoardPeriods());
 if(rpUsesBoardPeriods()){section.querySelector('#time-risk')?.replaceChildren();section.querySelector('#time-note-risk')?.replaceChildren()}
}

// 成熟月对照期可长于当期，缓存身份必须包含两段日期。
const rpBoardOriginalPeriodKey=periodKey;
periodKey=function(p=periodFor()){return rpBoardOriginalPeriodKey(p)+(p.comparisonMode?'|'+p.comparisonMode+'|'+p.previousStart+'|'+p.previousEnd:'')};
