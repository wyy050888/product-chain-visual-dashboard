import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
export function riskBoardDatesModel(){
 const shift=(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
 const context={DATA_CUTOFF:'2026-10-28',dashboardSyncDate:()=> '2026-10-28',shiftDate:shift,
  dateRangeMonthShift:(month,step)=>{const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m-1+step,1)).toISOString().slice(0,7)},periodKey:()=>''};
 vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-board-period/01-model.js',import.meta.url),'utf8'),context);
 const period=(mode,value,date='2026-10-28')=>JSON.parse(JSON.stringify(context.rpReturnPeriod(mode,value,date)));
 const week=period('week','2026-10-28');
 assert.deepEqual([week.start,week.end,week.previousStart,week.previousEnd],['2026-10-06','2026-10-12','2026-09-29','2026-10-05']);
 const month=period('month','2026-10');assert.deepEqual([month.start,month.end,month.previousStart,month.previousEnd],['2026-10-01','2026-10-12','2026-09-01','2026-09-30']);
 for(const [day,expected] of [['01','2026-08'],['15','2026-08'],['16','2026-09'],['20','2026-09'],['21','2026-10'],['28','2026-10']]){
  const date='2026-10-'+day,latest=context.rpLatestReturnMonth(date);assert.equal(latest,expected);
  const current=period('month',latest,date);assert(current.end<=shift(date,-16));assert(current.previousEnd<=shift(date,-16));
 }
 const early=period('month','2026-10','2026-10-15');assert.equal(early.start,'2026-08-01','不能选未成熟的当月或上月');
 const leap=period('month','2028-03','2028-03-21');assert.equal(leap.previousEnd,'2028-02-29');assert.equal(leap.end,'2028-03-05');
 const jan=period('week','2027-01-02','2027-01-02');assert.equal(jan.start,'2026-12-11');assert.equal(jan.previousStart,'2026-12-04');
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/shop-scoring/00-score-history.js',import.meta.url),'utf8'),context);
 const shop={score:4.7,scoreHistory:[{date:'2026-09-30',score:4.1,productScore:4.2},{date:'2026-10-10',score:4.6,productScore:4.9},{date:'2026-10-29',score:5,productScore:5}]};
 assert.equal(context.sbShopScoreAt(shop,'2026-10-28').productScore,4.9);assert.equal(context.sbShopScoreAt(shop,'2026-10-01').score,4.1);assert.equal(context.sbShopScoreAt(shop,'2026-09-01').score,null);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/period/00-rate-growth.js',import.meta.url),'utf8'),context);
 context.fmt=(value,digits)=>value.toFixed(digits);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/01-quality.js',import.meta.url),'utf8'),context);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/01-return.js',import.meta.url),'utf8'),context);
 assert.equal(context.rpReturnPeriodComparison(14,10).target,'环比 ↑ 40.0%');
 assert.equal(context.rpReturnPeriodComparison(3,0).target,'环比 —','上期为零没有可比基数');
 assert.equal(context.rpReturnPeriodComparison(10,14).targetTone,'rp-quality-green');
 assert.equal(context.rpReturnPeriodComparison(10,10.001).target,'环比 持平');
 assert.equal(context.rpReturnPeriodComparison(10,null).target,'环比 —');
 console.log('通过：T−16边界、滚动周、成熟月开放/回退、大小月/闰年/跨年及评分截止日快照。');
}
