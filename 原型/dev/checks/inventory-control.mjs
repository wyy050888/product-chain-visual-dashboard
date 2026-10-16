import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
export async function inventoryControl(page){
 let mode='month';const context=vm.createContext({periodFor:()=>({mode})});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/inventory-period/02-rules.js',import.meta.url),'utf8'),context);
 for(const [period,green,yellow] of [['month',.85,.3],['quarter',2.5,.9],['year',10,3.6]]){
  mode=period;assert.equal(context.ipSignal('turn',green),'green');assert.equal(context.ipSignal('turn',green-.001),'yellow');assert.equal(context.ipSignal('turn',yellow),'yellow');assert.equal(context.ipSignal('turn',yellow-.001),'red');
 }
 for(const [kind,value,tone] of [['delivery',98,'green'],['delivery',97.999,'yellow'],['delivery',97.5,'yellow'],['delivery',97.499,'red'],['refurb',-16,'green'],['refurb',-15,'green'],['refurb',-14,'yellow'],['refurb',-10,'yellow'],['refurb',-9,'red'],['refurb',0,'red'],['turn',null,'none'],['delivery',NaN,'none']])assert.equal(context.ipSignal(kind,value),tone);
 const audit=()=>page.evaluate(()=>window.inventoryControlAudit());
 await page.locator('a[href="#inventory"]').click();
 assert.equal(await page.locator('#inventory h2').innerText(),'全品类库存管控');
 assert.equal(await page.locator('#inventory [data-time-scope] button').count(),0);
 assert.equal(await page.locator('#inventory [data-inv]').count(),0);
 assert.deepEqual(await page.locator('#inventory .ip-group-panel h3').allTextContents(),['类目库存','品牌库存']);
 const panels=page.locator('#inventory .ip-group-panel'),[left,right]=await panels.evaluateAll(els=>els.map(e=>e.getBoundingClientRect().toJSON()));
 assert(right.x>left.x+left.width&&Math.abs(right.y-left.y)<1);
 const initial=await audit();
 for(const groups of [initial.chain,initial.brand]){
  for(const key of ['num','amountCents','staleCents','on','due','cost','avg'])assert(Math.abs(groups.reduce((sum,r)=>sum+r[key],0)-initial.total[key])<.00001,key+'两维度汇总一致');
  assert.equal(Math.max(...groups.map(r=>r.refurbDelay).filter(Number.isFinite)),initial.total.refurbDelay);
 }
 assert.deepEqual([...new Set(initial.records.map(r=>r.refurbDelay))].sort((a,b)=>a-b),[-20,-15,-12,-10,-5,3]);
 assert(initial.records.every(r=>r.refurbDelay===Math.round((Date.parse(r.refurbReported)-Date.parse(r.refurbReturn))/86400000)-45));
 // 全局回看不得改写实时库存，本月统计也保持一致。
 await page.locator('#globaltime [data-time-mode="year"]').dispatchEvent('click');
 await page.locator('#globaltime [data-time-year]').selectOption('2025',{force:true});
 assert.deepEqual((await audit()).total,initial.total);assert.deepEqual((await audit()).period,initial.period);
 assert.equal(await page.locator('#inventory [data-time-scope] button').count(),0);
 for(const [key,text] of [['turn','0.85'],['delivery','97.5'],['refurb','-15']]){
  const help=page.locator('#inventory [data-ip-rule="'+key+'"]').first();await help.evaluate(el=>el.scrollIntoView({behavior:'instant',block:'center'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await help.focus();
  const tooltip=page.locator('#metric-tooltip');await tooltip.waitFor({state:'visible'});
  assert((await tooltip.innerText()).includes(text));assert.equal(await tooltip.locator('.ip-tip-light').count(),key==='turn'?9:3);
  assert(await tooltip.evaluate(el=>{const b=el.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight}));
  await page.keyboard.press('Escape');assert(await tooltip.isHidden());
 }
 // 两表按各自维度打开，搜索后仍保持本月单位与判灯。
 for(const dimension of ['chain','brand']){
  const button=page.locator('#inventory [data-ip-dimension="'+dimension+'"] button[data-ip-stock="0"]');await button.click();
  assert((await page.locator('#dialogtitle').innerText()).includes((dimension==='chain'?initial.chain:initial.brand)[0].name));
  assert.equal(await page.locator('#dialogsub').innerText(),'');
  assert.equal(await page.locator('#ipd-results th').count(),9);assert((await page.locator('#ipd-results th').last().innerText()).includes('翻新延期天数'));
  assert((await page.locator('#ipd-results [data-ip-signal="turn"]').first().innerText()).includes('次/月'));
  await page.locator('#drawer-tabs [data-drawer-tab="products"]').click();
  await page.locator('#ipd-search').fill('不存在的产品');assert((await page.locator('#ipd-results').innerText()).includes('没有符合筛选条件'));
  await page.locator('#ipd-reset').click();assert((await page.locator('#ipd-results [data-ip-signal="turn"]').first().innerText()).includes('次/月'));
  await page.keyboard.press('Escape');
 }
 for(const width of [1366,1024,390]){
  await page.setViewportSize({width,height:1080});
  assert(await page.locator('#inventory').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1}));
  for(const panel of await panels.all())assert(await panel.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1}));
 }
 await page.setViewportSize({width:1920,height:1080});
}
