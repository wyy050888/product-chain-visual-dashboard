import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
export async function projectAnalysis(page){
 await page.locator('a[href="#projects"]').click();await page.locator('[data-pp-reset]').click();
 const audit=await page.evaluate(()=>projectPanoramaAudit()),rows=audit.scope;
 const cards=page.locator('#pp-ai .pp-ai-grid>article');assert.equal(await cards.count(),4);
 assert.doesNotMatch(await page.locator('#pp-ai').innerText(),/演示|原型|规则汇总|未调用|样例/);
 for(const department of ['产品部','研发部','采购部','品质部']){
  const card=page.locator(`[data-analysis-department="${department}"]`);
  const red=rows.filter(p=>p.status==='红灯'&&p.ledger.some(r=>r.status!=='已闭环'&&(Array.isArray(r.department)?r.department:[r.department]).includes(department))),high=red.filter(p=>p.delay>15);
  const evidence=red.flatMap(p=>p.ledger.filter(r=>r.status!=='已闭环'&&(Array.isArray(r.department)?r.department:[r.department]).includes(department)));
  assert.deepEqual(await card.locator('.pp-analysis-metrics strong').allTextContents(),[String(red.length),String(high.length)]);
  assert.doesNotMatch(await card.innerText(),/负责 \d+ 个项目|红灯项目占比/);
  for(const [mode,expected] of [['red',red.length],['high',high.length],['all',evidence.length]]){
   await card.locator(`[data-mode="${mode}"]`).click();
   assert.equal(await page.locator('.pp-analysis-table tbody tr').count(),expected||1);
   if(mode==='all'&&expected){assert((await page.locator('.pp-analysis-table th').allTextContents()).includes('任务名称'));assert.equal(await page.locator('.pp-analysis-table .pp-task-name').count(),evidence.reduce((n,r)=>n+r.taskNames.length,0),'多个任务不增加风险单行数');}
   if(mode==='high'&&expected){const delays=await page.locator('.pp-analysis-table tbody tr td:nth-child(3)').allTextContents();assert(delays.every(d=>parseInt(d)>15));}
   await page.locator('#modalclose').click();
  }
  const rootButtons=card.locator('.pp-root-item');assert((await rootButtons.count())<=3);
  let last=Infinity;
  for(let i=0;i<await rootButtons.count();i++){
   const button=rootButtons.nth(i),label=await button.locator('small').innerText(),count=Number(label.match(/(\d+) 条风险/)[1]);assert(count<=last);last=count;
   await button.click();assert.equal(await page.locator('.pp-analysis-table tbody tr').count(),count);
   assert.equal(await page.locator('.pp-analysis-conclusion h3').innerText(),await button.locator('b').innerText());
   if(await button.getAttribute('data-mode')==='decision'){
    const source=await page.locator('.pp-analysis-table tbody').innerText();assert.match(source,/关键需求尚未达成一致/);assert.match(source,/需求确认节点滞后/);
   }
   await page.locator('#modalclose').click();
  }
 }
 await cards.first().locator('[data-mode="red"]').click();
 const title=await page.locator('#dialogtitle').innerText(),contents=await page.locator('#dialogbody').innerText();
 await page.locator('[data-pp-analysis-view]').first().click();
 assert.equal(await page.locator('#toast').innerText(),'跳转项目详情');
 assert.equal(await page.locator('#dialogtitle').innerText(),title);
 assert.equal(await page.locator('#dialogbody').innerText(),contents);
 assert(await page.locator('.pp-analysis-detail').isVisible());await page.locator('#modalclose').click();
 assert(await page.locator('#overlay').isHidden(),'未压入项目详情抽屉');
 const before=await cards.locator('.pp-analysis-metrics').allTextContents();
 await page.locator('[data-pp-link="light"][data-value="红灯"]').click();assert.deepEqual(await cards.locator('.pp-analysis-metrics').allTextContents(),before);
 await page.locator('[data-pp-reset]').click();
 await page.locator('[data-pp-search]').fill('没有匹配的项目');assert.equal(await page.locator('.pp-analysis-empty').count(),4);
 assert((await cards.locator('.pp-analysis-metrics strong').allTextContents()).every(v=>['0','—'].includes(v)));
 await cards.first().locator('[data-mode="all"]').click();assert.match(await page.locator('.pp-analysis-detail').innerText(),/暂无相关记录/);await page.locator('#modalclose').click();
 await page.locator('[data-pp-reset]').click();
 for(const width of [1920,1440,900,600]){
  await page.setViewportSize({width,height:1080});
  assert(await cards.evaluateAll(els=>els.every(e=>e.scrollWidth<=e.clientWidth+1)));
  assert(await page.locator('#pp-ai').evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1));
 }
 await page.setViewportSize({width:1920,height:1080});await page.locator('#pp-ai').scrollIntoViewIfNeeded();
 await page.locator('#pp-ai').screenshot({path:fileURLToPath(new URL('../../outputs/project-analysis.png',import.meta.url))});
}
