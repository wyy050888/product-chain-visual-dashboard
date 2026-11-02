import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
export async function verifyCostSaving(page){
 const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('../../src/modules/cost-control/04-opportunity-model.js',import.meta.url),'utf8').replace('window.costSavingAudit=','costSavingAudit='),sandbox);
 const calc=sandbox.ccEstimateUnitSaving,quote=(sku,currentCents,proposedCents,applicableUnits)=>({sku,currentCents,proposedCents,applicableUnits});
 assert.equal(calc([quote('A',10000,9600,100)]),400);
 assert.equal(calc([quote('A',10000,9000,10),quote('B',20000,16000,30)]),3250);
 assert.equal(calc([quote('A',10000,12000,10),quote('B',20000,14000,10)]),2000,'单项涨价须抵扣，不能逐项截零高估');
 assert.equal(calc([quote('A',10000,11000,10)]),0);assert.equal(calc([quote('A',10000,10000,10)]),0);
 assert.equal(calc([]),null);assert.equal(calc([quote('A',10000,null,10)]),null);assert.equal(calc([quote('A',10000,9000,0)]),null);assert.equal(calc([quote('A',10000,9000,1.5)]),null);
 assert.equal(calc([quote('A',Number.MAX_SAFE_INTEGER,0,2)]),null);
 const audit=await page.evaluate(()=>window.costSavingAudit());assert(audit.length>0);assert(new Set(audit.map(row=>row.unitCents)).size>1,'采用各产品关联报价而非固定值');
 for(const row of audit){const qty=row.quotes.reduce((n,q)=>n+q.applicableUnits,0),delta=row.quotes.reduce((n,q)=>n+(q.currentCents-q.proposedCents)*q.applicableUnits,0);assert.equal(row.unitCents,row.quotes.length?Math.max(0,Math.round(delta/qty)):null)}
 console.log('通过：共享降本模型报价加权、涨价抵扣及缺失/零值边界');
}
