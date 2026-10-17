import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
export async function verifyKeyProductGrades(page,initial){
 const context=vm.createContext({window:{}});vm.runInContext(readFileSync(new URL('../../src/modules/key-products/07-grade-model.js',import.meta.url),'utf8'),context);
 const classify=context.kpmClassifyGrade;
 for(const [amount,rate,expected] of [[601,12.1,'S'],[600,12.1,null],[601,12,null],[600,11.9,'A'],[300.1,11.9,'A'],[300,11.9,null],[299,15.1,'B'],[60.1,15.1,'B'],[60,15.1,null],[100,15,null],[59.9,11.9,'C'],[59.9,12,null],[500,20,null],[100,10,null],[50,20,null]])assert.equal(classify(amount,rate),expected,'图片分级边界 '+amount+'/'+rate);
 assert.equal(classify(700,20,0),null,'零销量不伪造等级');
 const root=page.locator('#matrix'),snapshot=()=>page.evaluate(()=>window.dashboardKeyProductsSnapshot());
 assert.equal(await root.locator('#kpm-count,.kpm-chart-note,.kpm-note,.kpm-chart-actions>span,.mk-heading>span').count(),0,'删除用户红框中的说明文字');
 assert.equal(await root.locator('#matrixtable th').nth(2).innerText(),'等级变动','变动入口与等级相邻');
 for(const key of ['up','down','same','pending','new','uncompared']){
  const button=root.locator('[data-kpm-change="'+key+'"]');if(!await button.count())continue;
  await button.click();const current=await snapshot();assert(current.visible.every(p=>p.assessment.change===key));
  assert.equal(await root.locator('#matrixchart circle').count(),current.visible.filter(p=>p.facts.sales>0).length,'变动筛选联动图表');
  assert.equal(await root.locator('.mk-light strong').evaluateAll(es=>es.reduce((n,e)=>n+parseInt(e.textContent),0)),current.visible.filter(p=>p.facts.sales>0).length,'预警卡片同步范围');
  await root.locator('[data-kpm-reset]').click();
 }
 await root.locator('[data-kpm-grade="unrated"]').click();let data=await snapshot();assert(data.visible.every(p=>!p.level));assert(await root.locator('#matrixchart circle').count()>0,'待分级且有经营数据的产品仍显示图点');await root.locator('[data-kpm-reset]').click();
 // 既有台账已包含升降样例，不为演示改写计算结果。
 const candidates=await page.evaluate(()=>window.dashboardKeyProductsSnapshot().rows.map(p=>({id:p.spuId,history:window.dashboardKeyProductGradeHistory(p.spuId)})));
 const candidate=candidates.find(p=>p.history.some(r=>r.change==='up')&&p.history.some(r=>r.change==='down'));assert(candidate,'历史台账包含上升和下滑场景');
 await root.locator('[data-kpm-search]').fill(initial.rows.find(p=>p.spuId===candidate.id).spuCode);
 await root.locator('#matrixtable [data-kpm-history]').first().click();const history=page.locator('.kpm-grade-history');await history.waitFor();
 assert.equal(await history.locator('tbody tr').count(),6);assert.equal(await history.locator('.metric-help').count(),0,'不添加多余字段说明');
 const expected=candidate.history[0];assert.equal(expected.current.start,initial.range.start);assert.equal(expected.current.end,initial.range.end);assert.equal(Date.parse(expected.current.start)-Date.parse(expected.previous.end),86400000);
 const select=history.locator('[data-kpm-history-filter]');await select.selectOption('changed');assert.equal(await history.locator('tbody tr').count(),candidate.history.filter(r=>['up','down'].includes(r.change)).length);
 const pick=history.locator('[data-kpm-history-pick]').last();const selectedIndex=Number(await pick.getAttribute('data-kpm-history-pick'));await pick.click();
 assert.equal(await history.getAttribute('data-grade-start'),candidate.history[selectedIndex].current.start,'选择历史记录更新两期对照');
 await page.setViewportSize({width:390,height:900});assert.equal(await page.locator('#dialogbody').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,'历史抽屉窄屏不撑破正文');await page.setViewportSize({width:1920,height:1080});
 await history.locator('[data-kpm-history-product]').first().click();await page.locator('.up-detail').waitFor();assert.equal(await page.locator('.up-detail').getAttribute('data-up-start'),candidate.history[selectedIndex].current.start,'产品详情继承所查看的历史周期');assert.equal(await page.locator('#dialog').getAttribute('data-drawer-depth'),'1');await page.locator('#close').click();await history.waitFor();assert.equal(await select.inputValue(),'changed','从产品返回保留记录筛选');
 await page.locator('#close').click();assert.equal(await root.locator('[data-kpm-search]').inputValue(),initial.rows.find(p=>p.spuId===candidate.id).spuCode,'返回保留主表搜索');
 await root.locator('[data-kpm-reset]').click();
 await root.locator('[data-time-mode="month"]').click();await root.locator('[data-time-value]').selectOption('9');
 const september=await snapshot();assert(september.rows.some(p=>['up','down'].includes(p.assessment.change)),'历史月份可直接演示有升降的主表');
 for(const key of ['up','down']){
  if(!september.rows.some(p=>p.assessment.change===key))continue;
  await root.locator('[data-kpm-change="'+key+'"]').click();assert((await snapshot()).visible.length>0);assert((await snapshot()).visible.every(p=>p.assessment.change===key));await root.locator('[data-kpm-reset]').click();
 }
 await root.locator('[data-time-mode="recent30"]').click();await root.locator('[data-kpm-reset]').click();
}
