import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import vm from 'node:vm';
export async function projectAnalysis(page){
 const ctx=vm.createContext({});for(const file of ['01-model','08-analysis-model'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/project-panorama/'+file+'.js',import.meta.url),'utf8'),ctx);
 const fixture=[{id:1,status:'绿灯',ledger:[{id:'a',light:'红灯',department:['产品部','研发部']},{id:'a',light:'红灯',department:['产品部','研发部']},{id:'b',light:'黄灯',department:'产品部'},{id:'c',light:'红灯',department:'产品部',status:'已闭环'},{id:'d',light:'红灯',department:'采购部'}]}];
 const share=ctx.ppAnalysisRiskShare(fixture,'产品部');assert.equal(share.count,1);assert.equal(share.total,2);assert.equal(share.rate,'50.0%');assert.equal(ctx.ppAnalysisRiskShare([],'产品部').rate,'—');
 await page.locator('a[href="#projects"]').click();await page.locator('[data-pp-reset]').click();
 const audit=await page.evaluate(()=>projectPanoramaAudit()),rows=audit.scope;
 const cards=page.locator('#pp-ai .pp-ai-grid>article');assert.equal(await cards.count(),4);
 const help=page.locator('#pp-ai .pp-ai-heading .metric-help');assert.equal(await help.count(),1);
 await help.scrollIntoViewIfNeeded();await help.hover();await page.locator('#metric-tooltip').waitFor({state:'visible'});
 assert.match(await page.locator('#metric-tooltip').innerText(),/红灯项目[\s\S]*高危项目[\s\S]*＞15天[\s\S]*红灯风险占比[\s\S]*红灯风险单总数/);
 assert.equal(await page.locator('#metric-tooltip .pp-analysis-tip-metric').count(),3);
 assert.doesNotMatch(await page.locator('#metric-tooltip').innerText(),/按项目去重/);
 assert.deepEqual(await page.locator('#metric-tooltip .pp-analysis-tip-fraction>span').allTextContents(),['该部门红灯风险单数','红灯风险单总数']);
 assert.match(await page.locator('#metric-tooltip .pp-analysis-tip-formula').innerText(),/× 100%/);
 assert.equal(await page.locator('#metric-tooltip').evaluate(e=>getComputedStyle(e).borderTopWidth),'0px');
 assert.doesNotMatch(await page.locator('#metric-tooltip').innerText(),/产品部/);await page.keyboard.press('Escape');
 await help.focus();assert(await page.locator('#metric-tooltip').isVisible());await page.keyboard.press('Escape');await help.evaluate(e=>e.blur());
 assert.doesNotMatch(await page.locator('#pp-ai').innerText(),/演示|原型|规则汇总|未调用|样例/);
 for(const department of ['产品部','研发部','采购部','品质部']){
  const card=page.locator(`[data-analysis-department="${department}"]`);
  const red=rows.filter(p=>p.status==='红灯'&&p.ledger.some(r=>r.status!=='已闭环'&&(Array.isArray(r.department)?r.department:[r.department]).includes(department))),high=red.filter(p=>p.delay>15);
  const evidence=red.flatMap(p=>p.ledger.filter(r=>r.status!=='已闭环'&&(Array.isArray(r.department)?r.department:[r.department]).includes(department)));
  assert.deepEqual(await card.locator('.pp-analysis-metrics strong').allTextContents(),[String(red.length),String(high.length),ctx.ppAnalysisRiskShare(rows,department).rate]);
  assert.doesNotMatch(await card.innerText(),/负责 \d+ 个项目|红灯项目占比/);
  for(const [mode,expected] of [['red',evidence.length],['high',evidence.filter(r=>high.some(p=>p.ledger.some(x=>x.id===r.id))).length],['all',evidence.length]]){
   await card.locator(`[data-mode="${mode}"]`).click();
   assert.equal(await page.locator('#dialogtitle').innerText(),department+'风险台账明细');
   assert.equal(await page.locator('.pp-analysis-table tbody tr').count(),Math.min(expected,20)||1);
   if(mode==='all'&&expected){assert((await page.locator('.pp-analysis-table th').allTextContents()).includes('项目任务'));assert.equal(await page.locator('.pp-analysis-table .pp-task-name').count(),await page.evaluate(()=>projectRiskDetailAudit().records.slice(0,20).reduce((n,e)=>n+e.risk.taskNames.length,0)),'多个任务不增加风险单行数');}
   if(mode==='high'&&expected){const delays=await page.locator('.pp-analysis-table tbody tr td[data-field=delay]').allTextContents();assert(delays.every(d=>parseInt(d)>15));}
   await page.locator('#close').click();
  }
  const rootButtons=card.locator('.pp-root-item');assert((await rootButtons.count())<=3);
  let last=Infinity;
  for(let i=0;i<await rootButtons.count();i++){
   const button=rootButtons.nth(i),label=await button.locator('small').innerText(),count=Number(label.match(/(\d+) 条风险/)[1]);assert(count<=last);last=count;
   await button.click();assert.equal(await page.locator('#dialogtitle').innerText(),department+'风险台账明细');assert.equal(await page.locator('.pp-analysis-table tbody tr').count(),Math.min(count,20));
   assert.equal(await page.locator('.pp-analysis-conclusion h3').innerText(),await button.locator('b').innerText());
   if(await button.getAttribute('data-mode')==='decision'){
    const source=await page.locator('.pp-analysis-table tbody').innerText();assert.match(source,/关键需求尚未达成一致/);assert.match(source,/需求确认节点滞后/);
   }
   await page.locator('#close').click();
  }
 }
 await cards.first().locator('[data-mode="red"]').click();
 const title=await page.locator('#dialogtitle').innerText(),contents=await page.locator('#dialogbody').innerText();
 await page.locator('[data-pp-analysis-view]').first().click();
 assert.equal(await page.locator('#toast').innerText(),'点击跳转项目详情页-风险管理');
 assert.equal(await page.locator('#dialogtitle').innerText(),title);
 assert.equal(await page.locator('#dialogbody').innerText(),contents);
 assert(await page.locator('.pp-analysis-detail').isVisible());await page.locator('#close').click();
 assert(await page.locator('#overlay').isHidden(),'未压入项目详情抽屉');
 const before=await cards.locator('.pp-analysis-metrics').allTextContents();
 await page.locator('[data-pp-link="light"][data-value="红灯"]').click();assert.deepEqual(await cards.locator('.pp-analysis-metrics').allTextContents(),before);
 await page.locator('[data-pp-reset]').click();
 await page.locator('[data-pp-search]').fill('没有匹配的项目');assert.equal(await page.locator('.pp-analysis-empty').count(),4);
 assert((await cards.locator('.pp-analysis-metrics strong').allTextContents()).every(v=>['0','—'].includes(v)));
 await cards.first().locator('[data-mode="all"]').click();assert.match(await page.locator('.pp-analysis-detail').innerText(),/暂无相关记录/);await page.locator('#close').click();
 await page.locator('[data-pp-reset]').click();
 for(const width of [1920,1440,900,600]){
  await page.setViewportSize({width,height:1080});
  assert(await cards.evaluateAll(els=>els.every(e=>e.scrollWidth<=e.clientWidth+1)));
  assert(await page.locator('#pp-ai').evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1));
  await help.scrollIntoViewIfNeeded();await help.click();await page.locator('#metric-tooltip').waitFor({state:'visible'});
  assert(await page.locator('#metric-tooltip').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=8&&r.right<=innerWidth-8&&r.top>=8&&r.bottom<=innerHeight-8&&e.scrollWidth<=e.clientWidth}));
  await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1920,height:1080});await page.locator('#pp-ai').scrollIntoViewIfNeeded();
 await help.click();await page.locator('#metric-tooltip').waitFor({state:'visible'});
 await page.locator('#metric-tooltip').screenshot({path:fileURLToPath(new URL('../../outputs/project-analysis-tip-styled.png',import.meta.url))});
 await page.keyboard.press('Escape');
 const ordinaryHelp=page.locator('#projects .metric-help:not(.pp-analysis-help):visible').first();
 await ordinaryHelp.click();assert.equal(await page.locator('#metric-tooltip.metric-tooltip-project-analysis').count(),0);await page.keyboard.press('Escape');
 await page.locator('#pp-ai').screenshot({path:fileURLToPath(new URL('../../outputs/project-analysis.png',import.meta.url))});
}
