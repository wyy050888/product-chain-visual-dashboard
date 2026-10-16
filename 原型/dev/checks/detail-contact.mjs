import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export async function verifyDetailContact(page){
 const ctx=vm.createContext({fmt:(v,n=0)=>Number(v).toFixed(n),rpQualityChangeTone:()=> 'rp-quality-gray'});
 for(const file of ['quality-monthly/00-contact.js','unified-product/05-contact-view.js'])
  vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8'),ctx);
 const model={current:{contacts:50,qualityContacts:20,experienceContacts:30,qualityContactRate:10,experienceContactRate:15},previous:{qualityContactRate:8,experienceContactRate:10}};
 const parts=ctx.upContactParts(model);
 assert.deepEqual(Array.from(parts,p=>p.share),[40,60]);assert.equal(parts[0].rate,10);assert.equal(parts[0].comparison,'环比 +2.0%');
 assert.equal(parts[1].comparison,'环比 +5.0%');
 const empty=ctx.upContactParts({current:{contacts:0,qualityContacts:0,experienceContacts:0,qualityContactRate:0,experienceContactRate:0},previous:{qualityContactRate:null,experienceContactRate:null}});
 assert.deepEqual(Array.from(empty,p=>p.share),[0,0]);assert(empty.every(p=>p.comparison==='环比 --'));
 const root=page.locator('.up-detail'),region=root.locator('.up-violation-stats'),tip=page.locator('#up-contact-tooltip');
 assert.deepEqual(await region.locator('[data-up-quality-metric]').evaluateAll(es=>es.map(e=>e.dataset.upQualityMetric).slice(-2)),['contact','bad']);
 assert.equal(await root.locator('.up-contact-region,.up-contact-metrics').count(),0);
 const tops=await region.locator('[data-up-quality-metric]').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));assert(tops.every(t=>Math.abs(t-tops[0])<1),'违规、进线与差评同排');
 const buttons=region.locator('.up-contact-bar button'),payloads=await buttons.evaluateAll(es=>es.map(e=>JSON.parse(e.dataset.upContactDetail)));
 const total=payloads.reduce((n,p)=>n+p.count,0),sales=await root.locator('[data-up-return-point]').evaluateAll(es=>es.reduce((n,e)=>n+Number(e.dataset.sales),0));
 const totalRate=await region.locator('[data-up-quality-metric="contact"] strong').innerText();
 assert.equal(totalRate,sales?(total/sales*100).toFixed(1)+'%':'—');
 assert.equal(await region.locator('.up-contact-bar>button').count(),2);
 assert.equal(await region.locator('.up-contact-legend').count(),0);
 assert(await region.locator('[data-up-quality-metric="contact"]').evaluate(e=>e.children.length===2&&e.querySelector(':scope>small>.up-contact-bar')!==null),'进线构成条位于标题右侧，不新增数值下方行');
 for(let i=0;i<2;i++){
  const p=payloads[i],button=buttons.nth(i);
  assert.equal(p.share,total?p.count/total*100:0);
  if(sales)assert(Math.abs(p.rate-p.count/sales*100)<1e-10);
  const width=await region.locator('.up-contact-bar>button').nth(i).evaluate(e=>parseFloat(e.style.width));
  assert(Math.abs(width-p.share)<.0001);
  await button.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center'}));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await button.hover();await tip.waitFor({state:'visible'});
  assert.equal(await tip.locator('.up-contact-tooltip-heading').innerText(),p.name);
  assert.deepEqual(await tip.locator('.up-contact-tooltip-row>span').allTextContents(),['进线条数','条数占比','进线率','环比']);
  assert.equal(await tip.locator('.up-contact-tooltip-row b').nth(2).innerText(),Number.isFinite(p.rate)?p.rate.toFixed(1)+'%':'—');
  assert.equal(await tip.locator('.up-contact-tooltip-row b').last().innerText(),p.comparison.replace(/^环比\s*/,''));
  await page.keyboard.press('Escape');assert(await tip.isHidden());assert(await root.isVisible());
  await button.focus();await tip.waitFor({state:'visible'});await page.keyboard.press('Escape');
 }
 await page.mouse.move(0,0);await buttons.last().blur();
 for(const width of [390,1920]){
  await page.setViewportSize({width,height:1080});
  assert(await root.locator('.up-violation-stats-scroll').evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1),'指标栏在窄屏内部滚动');
 }
}
