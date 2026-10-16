import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
export async function projectRiskEvents(page){
 const ctx=vm.createContext({window:{}});
 for(const file of ['01-model','10-risk-events-model'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/project-panorama/'+file+'.js',import.meta.url),'utf8'),ctx);
 const rows=[{id:1,ledger:[{id:'a',light:'红灯',recordedAt:'2026-10-01',closedAt:'2026-10-10'},{id:'a',light:'红灯',recordedAt:'2026-10-01'},{id:'b',light:'黄灯',recordedAt:'2026-09-30',closedAt:'2026-10-01'},{id:'c',light:'红灯',deadline:'2026-10-05'},{id:'d',light:'绿灯',recordedAt:'2026-10-01'}]}];
 const facts=ctx.ppRiskEvents(rows,{start:'2026-10-01',end:'2026-10-10'});
 assert.equal(facts.filter(e=>e.kind==='new').length,1);assert.equal(facts.filter(e=>e.kind==='closed').length,2);
 await page.locator('a[href="#projects"]').click();
 const audit=()=>page.evaluate(()=>projectRiskEventsAudit());
 let data=await audit();assert(data.groups.some(g=>g.new.length));assert(data.groups.some(g=>g.closed.length));
 const verify=async()=>{
  const d=await audit();
  for(const g of d.groups)for(const kind of ['new','closed']){
   const button=page.locator(`[data-pp-event-group="${g.key}"][data-kind="${kind}"]`);
   const dateKey=kind==='new'?'recordedAt':'closedAt';
   const records=d.rows.filter(p=>p[d.state.dimension]===g.key).flatMap(p=>p.ledger).filter(r=>['红灯','黄灯'].includes(r.light)&&r[dateKey]>=d.range.start&&r[dateKey]<=d.range.end);
   assert.equal(g[kind].length,records.length);
   assert.deepEqual(await button.locator('b').allTextContents(),['红灯','黄灯'].map(light=>String(records.filter(r=>r.light===light).length)));
  }
 };
 await verify();
 for(const kind of ['new','closed']){
  data=await audit();const group=data.groups.find(g=>g[kind].length);
  await page.locator(`[data-pp-event-group="${group.key}"][data-kind="${kind}"]`).click();
  assert.equal(await page.locator('.pp-analysis-table tbody tr').count(),group[kind].length);
  assert((await page.locator('.pp-analysis-table th').allTextContents()).includes('闭环日期'));
  await page.locator('#modalclose').click();
 }
 await page.locator('[data-pp-event-dimension="category"]').click();await verify();
 await page.locator('[data-pp-event-period]').click();await page.locator('[data-pp-event-preset="7"]').click();await page.locator('#pp-event-period-form button[type="submit"]').click();
 data=await audit();assert.equal((Date.parse(data.range.end)-Date.parse(data.range.start))/86400000,6);await verify();
 await page.locator('[data-pp-event-period]').click();await page.locator('#pp-event-period-form [name="start"]').fill('2026-10-10');await page.locator('#pp-event-period-form [name="end"]').fill('2026-10-01');await page.locator('#pp-event-period-form button[type="submit"]').click();assert(await page.locator('.pp-event-error').innerText());
 await page.locator('#pp-event-period-form [name="start"]').fill('2020-01-01');await page.locator('#pp-event-period-form [name="end"]').fill('2020-01-02');await page.locator('#pp-event-period-form button[type="submit"]').click();
 assert((await audit()).groups.every(g=>!g.new.length&&!g.closed.length));
 await page.locator('[data-pp-event-group]').first().click();assert.match(await page.locator('.pp-analysis-detail').innerText(),/暂无风险记录/);await page.locator('#modalclose').click();
 await page.locator('[data-pp-event-period]').click();await page.locator('[data-pp-event-preset="30"]').click();await page.locator('#pp-event-period-form button[type="submit"]').click();
 const categoryMenu=page.locator('#pp-scope .pf-multi').filter({has:page.locator('#pp-filter-category')});await categoryMenu.locator('summary').click();await categoryMenu.locator('input[value="清洁类"]').check();await page.keyboard.press('Escape');assert((await audit()).rows.every(p=>p.category==='清洁类'));await verify();
 await categoryMenu.locator('summary').click();await categoryMenu.locator('input[value="all"]').check();await page.keyboard.press('Escape');
 for(const width of [1920,1440,900,600]){await page.setViewportSize({width,height:1080});assert(await page.locator('#pp-overview').evaluate(e=>e.scrollWidth<=e.clientWidth+1));assert(await page.locator('.pp-events').evaluate(e=>e.scrollWidth<=e.clientWidth+1));}
 await page.setViewportSize({width:1920,height:1080});
 await page.locator('#pp-overview').screenshot({path:fileURLToPath(new URL('../../outputs/project-risk-events.png',import.meta.url))});
}
