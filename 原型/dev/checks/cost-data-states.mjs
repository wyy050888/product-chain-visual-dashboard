import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
export function verifyCostDataStates(){
 const ledger=[],sandbox={ccItems:[{id:'a'},{id:'b'}],ccLedger:ledger,DATA_CUTOFF:'2026-10-10',window:{},bounds:()=>({end:'2026-10-31'}),fmt:(v,d)=>v.toLocaleString('zh-CN',{minimumFractionDigits:d,maximumFractionDigits:d})};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('../../src/modules/cost-control/01-model.js',import.meta.url),'utf8'),sandbox);
 const totals=(mode='month')=>JSON.parse(JSON.stringify(sandbox.ccTotals([{id:'a'},{id:'b'}],{year:2026,mode:'month',value:10},mode))),empty={target:null,actual:null,gap:null,rate:null};
 const row=(target,actual,date='2026-10-10')=>({itemId:'a',month:'2026-10',targetCents:target,actualMissing:actual===null,confirmations:actual===null?[]:[{date,cents:actual}]});
 assert.deepEqual(totals(),empty,'没有记录不产生0');assert.equal(sandbox.ccMoney(null),'--');assert.equal(sandbox.ccRate(null),'--');assert.equal(sandbox.ccAmount(null),'--');
 ledger.push(row(10000,null));assert.deepEqual(totals(),{target:10000,actual:null,gap:null,rate:null});
 ledger.splice(0,ledger.length,row(10000,0));assert.deepEqual(totals(),{target:10000,actual:0,gap:-10000,rate:0},'明确填报0正常计算');assert.match(sandbox.ccAmount(0),/^0[.]00<span/);
 ledger.splice(0,ledger.length,row(-10000,0));assert.equal(sandbox.ccRate(totals().rate),'0.0%');assert.equal(Object.is(totals().rate,-0),false,'负目标不能产生负零达成');
 ledger.splice(0,ledger.length,row(null,5000));assert.deepEqual(totals(),{target:null,actual:5000,gap:null,rate:null},'缺少目标不计算差额');
 ledger.splice(0,ledger.length,row(0,0));assert.deepEqual(totals(),{target:0,actual:0,gap:0,rate:null},'目标为零保留金额但不除零');
 ledger.splice(0,ledger.length,row(10000,0,'2026-10-17'));assert.equal(totals().actual,null,'未到确认日期不当作已导入0');
 ledger.splice(0,ledger.length,row(10000,null),{...row(null,null),itemId:'b'});assert.deepEqual(totals('quarter'),{target:10000,actual:null,gap:null,rate:null});
 ledger[0]=row(10000,0);ledger.push({...row(20000,null),month:'2026-11'});assert.equal(totals('quarter').actual,0,'部分有明确零值的汇总保持0');ledger.pop();ledger[0]=row(10000,null);
 ledger.push({...row(20000,2500),month:'2026-09',confirmations:[{date:'2026-09-30',cents:2500}]});assert.equal(totals('year').actual,2500,'年汇总累计已知实际，不把空值混入计算');assert.equal(totals('quarter').actual,null,'季度无值独立显示缺失');
 console.log('通过：未导入/明确零/部分导入、零目标/负目标、确认日期与月季年汇总边界');
}
