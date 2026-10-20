import assert from 'node:assert/strict';
import {verifyKeyProductChart} from './key-products-chart.mjs';
export async function verifyKeyProductScope(page){
 const root=page.locator('#matrix'),control=root.locator('[data-kpm-scope-switch]'),snapshot=()=>page.evaluate(()=>window.dashboardKeyProductsSnapshot());
 const reset=()=>root.locator('[data-kpm-reset]').click();
 assert.deepEqual(await control.locator('button').allTextContents(),['公司整体','一类电商','兴趣电商']);
 const company=await snapshot();assert.equal(company.scope,'all');
 const groups={},platforms={retail:['天猫','京东','拼多多'],interest:['抖音','快手','视频号']};
 for(const key of ['retail','interest']){
  await control.locator('[data-kpm-scope="'+key+'"]').click();const data=await snapshot();groups[key]=data;
  assert.equal(data.scope,key);assert.equal(data.page,1);assert.deepEqual(data.platforms,platforms[key]);
  assert.equal(await control.locator('[aria-pressed="true"]').count(),1);assert.equal(await control.locator('[data-kpm-scope="'+key+'"]').getAttribute('aria-pressed'),'true');
  assert(data.rows.some(p=>p.facts.gsvCents!==company.rows.find(r=>r.spuId===p.spuId).facts.gsvCents),'真实切换经营数据');
  for(const row of data.rows){
   const base=company.rows.find(r=>r.spuId===row.spuId);assert.deepEqual(row.stock,base.stock,'库存继续使用公司快照');
   const a=row.assessment.current,g=a.gsvCents/1000000,p=a.profitRate;
   const expected=a.sales>0&&Number.isFinite(p)?g>600&&p>12?'S':g>300&&p<12?'A':g>60&&g<300&&p>15?'B':g<60&&p<12?'C':null:null;
   assert.equal(row.level,expected,'按业务范围重算，阈值未改');assert.equal(row.returnRate,row.facts.returnRate??0,'预警采用相同范围退货率');
  }
  for(const path of ['C-B','C-A','C-S','B-A','B-S','A-S','S-A','S-B','S-C','A-B','A-C','B-C'])assert(data.rows.some(p=>p.assessment.previous.level+'-'+p.level===path),'业务范围包含完整演示路径 '+key+'/'+path);
  await verifyKeyProductChart(page);
  const id=data.visible[0].spuId,history=await page.evaluate(id=>window.dashboardKeyProductGradeHistory(id),id);
  assert.deepEqual(history[0],data.rows.find(p=>p.spuId===id).assessment,'历史与当前分级使用相同范围');
  await root.locator('#matrixtable [data-kpm-history]').first().click();assert.equal(await page.locator('.kpm-grade-history tbody tr').count(),6);await page.locator('#close').click();
  const value=await root.locator('#matrixtable [data-kpm-metric="gsv"] strong').first().innerText();
  await root.locator('#matrixtable [data-kpm-detail]').first().click();await page.locator('.up-detail').waitFor();
  assert.equal(await page.locator('#up-platform').inputValue(),'selected');assert.equal(await page.locator('[data-up-metric="gsv"] strong').innerText(),value,'详情继承所选平台组');
  assert.equal(await page.locator('.up-grade-trend').count(),0,'平台组不是全平台，详情不展示全平台评级曲线');
  await page.locator('#close').click();assert.equal((await snapshot()).scope,key,'返回保留业务范围');
 }
 // 两组渠道互斥且覆盖当前六平台，金额、销量和两期评级事实相加等于公司。
 for(const row of company.rows){
  const a=groups.retail.rows.find(p=>p.spuId===row.spuId),b=groups.interest.rows.find(p=>p.spuId===row.spuId);
  for(const key of ['gmvCents','refundCents','gsvCents','profitCents','sales'])assert.equal(a.facts[key]+b.facts[key],row.facts[key],'公司金额/销量守恒 '+key);
  for(const side of ['current','previous'])for(const key of ['gsvCents','profitCents','sales'])assert.equal(a.assessment[side][key]+b.assessment[side][key],row.assessment[side][key],'两期分级事实守恒');
  if(row.facts.gsvCents)assert(Math.abs((a.facts.profitCents+b.facts.profitCents)/row.facts.gsvCents*100-row.facts.profitRate)<1e-8,'利润率使用汇总利润/GSV');
 }
 await root.locator('#matrix-product-pager [aria-label="第2页"]').click();await control.locator('[data-kpm-scope="retail"]').click();assert.equal((await snapshot()).page,1);
 const sample=company.rows[0];await root.locator('[data-kpm-search]').fill(sample.spuCode);await control.locator('[data-kpm-scope="interest"]').click();assert.equal((await snapshot()).filters.query,sample.spuCode);
 assert.deepEqual((await snapshot()).visible.map(r=>r.spuId),[sample.spuId]);await reset();assert.equal((await snapshot()).scope,'interest','筛选重置保留标题业务范围');
 await root.locator('[data-time-mode="month"]').click();await root.locator('[data-time-value]').selectOption('9');assert.equal((await snapshot()).scope,'interest');
 await root.locator('[data-time-mode="recent30"]').click();
 for(const width of [1920,1440,1100,768,390]){
  await page.setViewportSize({width,height:1080});
  const box=await control.boundingBox();assert(box.x>=0&&box.x+box.width<=width,'业务切换不撑破页面 '+width);
  if(width>=1100){const title=await root.locator('.sectionhead .titlegroup').boundingBox();assert(title.x+title.width<=box.x&&Math.abs(title.y-box.y)<20,'标题右侧同排 '+width)}
 }
 await page.setViewportSize({width:1920,height:1080});
 await control.locator('[data-kpm-scope="interest"]').focus();await page.keyboard.press('Home');assert.equal((await snapshot()).scope,'all');
 await page.keyboard.press('ArrowRight');assert.equal((await snapshot()).scope,'retail');
 await page.locator('.head .nav button').nth(1).evaluate(e=>e.click());assert.equal(await page.locator('#department-view [data-kpm-scope-switch]').count(),0,'部门不复制总看板范围切换');
 await page.locator('.head .nav button').nth(5).evaluate(e=>e.click());assert.equal(await page.locator('#department-view [data-kpm-scope-switch]').count(),0,'采购不复制总看板范围切换');
 await page.locator('.head .nav button').nth(0).evaluate(e=>e.click());assert.equal((await snapshot()).scope,'retail','部门返回保留总看板业务范围');
 await control.locator('[data-kpm-scope="all"]').click();await reset();assert.deepEqual((await snapshot()).rows,company.rows,'恢复公司原始经营、评级与库存');
 console.log('通过：公司/一类/兴趣范围、经营守恒、评级历史、详情继承、键盘与部门隔离');
}
