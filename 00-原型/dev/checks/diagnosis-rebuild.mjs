import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// 只验证现用四区入口与只读依据，不再断言已撤销的卡片和评分界面。
export async function diagnosisRebuild(page){
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit());
 assert.deepEqual(await root.locator('#aigrid h3').allTextContents(),['重点工作清单','工作偏差预警','部门诊断','任务清单']);
 const taskIds=(await audit()).tasks.map(row=>row.task.id).sort();
 for(const part of ['coordination','resource','execution','tasks']){
  await root.locator('[data-gd-part="'+part+'"]').click();
  assert.equal(await root.locator('[data-gd-action="evidence"]').count(),0,'不恢复旧独立依据入口');
  assert.equal(await root.locator('[data-gd-part="closure"]').count(),0);
 }
 await root.locator('[data-gd-part="execution"]').click();
 assert(await root.getByRole('table',{name:'部门周报下载表'}).isVisible());
 const data=await audit();
 const inventoryEvidence=await page.evaluate(()=>{
  const required=['warehouse','transit','factoryAvailable','unproducedOrders','unrefurbishedUnits'];
  const rows=inventoryRiskAudit().all;
  const products=dashboardKeyProductsSnapshot().rows.filter(row=>Number.isFinite(row.stock?.totalCoverage15));
  const management=dashboardKeyProductManagementSnapshot();
  return {
   totalMatches:rows.length>0&&rows.every(row=>row.totalUnits===required.reduce((sum,key)=>sum+row[key],0)),
   shortageMatches:globalDiagnosisRiskSnapshot().sources.filter(row=>row.kind===3).some(row=>row.metrics.some(metric=>metric.name==='总可售天数')),
   keyProductsMatch:products.length>0&&products.every(({stock,stockRisks})=>
    stock.totalUnits===required.reduce((sum,key)=>sum+stock[key],0)&&stockRisks.includes('shortage')===(stock.totalCoverage15<30)),
   wordingClean:!/(工厂待检库存|工厂不良品库存)/.test(JSON.stringify(management.followups))
  };
 });
 assert.deepEqual(inventoryEvidence,{totalMatches:true,shortageMatches:true,keyProductsMatch:true,wordingClean:true});
 const stock={spuId:'DEMO',name:'演示产品',unproducedOrders:42};
 const context=vm.createContext({DATA_CUTOFF:'2026-11-14',shiftDate:()=> '2026-11-11',upSpus:new Map([[stock.spuId,stock]]),upProduct:p=>p,fmt:String});
 vm.runInContext(readFileSync(new URL('../../src/modules/global-diagnosis/03-omission-samples.js',import.meta.url),'utf8'),context);
 const [sample]=context.gdOmissionSamples({by:()=>({rows:[stock]})},[]);
 assert.equal(sample.sources[0].content,'未产订单：42件');
 assert.deepEqual(data.reports,[],'部门周报入口停用旧报告诊断结果');
 assert.equal(await root.locator('.gd-score,.gd-score-summary,[data-gd-rubric]').count(),0);
 assert.deepEqual(data.tasks.map(row=>row.task.id).sort(),taskIds,'查看周报下载表不新增任务');
 console.log('通过：现用四区、部门周报下载表、库存来源依据、只读查看不建任务');
}
