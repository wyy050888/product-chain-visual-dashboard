import {businessRuleContext} from './business-rules-context.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export async function verifyDetailContact(page){
 const ctx=businessRuleContext({fmt:(v,n=0)=>Number(v).toFixed(n)});
 for(const file of ['quality-monthly/00-contact.js','risk-presentation/01-quality.js','unified-product/05-contact-view.js'])
  vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+file,import.meta.url),'utf8'),ctx);
 const model={current:{contacts:50,qualityContacts:20,experienceContacts:30,qualityContactRate:10,experienceContactRate:15},previous:{qualityContactRate:8,experienceContactRate:10}};
 const parts=ctx.upContactParts(model);
 assert.deepEqual(Array.from(parts,p=>p.share),[40,60]);assert.equal(parts[0].rate,10);assert.equal(parts[0].comparison,'环比 ↑ 25.0%');
 assert.equal(parts[1].comparison,'环比 ↑ 50.0%');assert(parts.every(part=>part.tone==='rp-quality-red'),'进线上升分项也为红色');
 const empty=ctx.upContactParts({current:{contacts:0,qualityContacts:0,experienceContacts:0,qualityContactRate:0,experienceContactRate:0},previous:{qualityContactRate:null,experienceContactRate:null}});
 assert.deepEqual(Array.from(empty,p=>p.share),[0,0]);assert(empty.every(p=>p.comparison==='环比 —'));
 const root=page.locator('.up-detail'),region=root.locator('.up-violation-stats'),tip=page.locator('#up-contact-tooltip');
 assert.deepEqual(await region.locator('[data-up-quality-metric]').evaluateAll(es=>es.map(e=>e.dataset.upQualityMetric).slice(-2)),['contact','bad']);
 assert.equal(await root.locator('.up-contact-region,.up-contact-metrics').count(),0);
 const tops=await region.locator('[data-up-quality-metric]').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));assert(tops.every(t=>Math.abs(t-tops[0])<1),'违规、进线与差评同排');
 const buttons=region.locator('.up-contact-bar button'),payloads=await buttons.evaluateAll(es=>es.map(e=>JSON.parse(e.dataset.upContactDetail)));
 const total=payloads.reduce((n,p)=>n+p.count,0),sales=await root.locator('[data-up-return-point]').evaluateAll(es=>es.reduce((n,e)=>n+Number(e.dataset.sales),0));
 const badTrend=await region.locator('[data-up-quality-metric="bad"] .up-quality-comparison').innerText();assert.match(badTrend,/^环比 (?:[↑↓] [\d,.]+%|持平|—)$/,'产品详情差评率环比用箭头显示增长率');
 const totalRate=await region.locator('[data-up-quality-metric="contact"] strong').innerText();
 assert.equal(totalRate,sales?(total/sales*100).toFixed(1)+'%':'—');
 assert.equal(await region.locator('.up-contact-bar>button').count(),2);
 assert.equal(await region.locator('.up-contact-legend').count(),0);
 assert(await region.locator('[data-up-quality-metric="contact"]').evaluate(e=>e.children.length===2&&e.querySelector(':scope>small>.up-contact-bar')!==null),'进线构成条位于标题右侧，不新增数值下方行');
 for(let i=0;i<2;i++){
  const p=payloads[i],button=buttons.nth(i);
  assert(Math.abs(p.share-(total?p.count/total*100:0))<.0001,'浏览器样式宽度允许小数序列化误差');
  const width=await region.locator('.up-contact-bar>button').nth(i).evaluate(e=>parseFloat(e.style.width));
  assert(Math.abs(width-p.share)<.0001);
  await button.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center'}));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await button.hover();await tip.waitFor({state:'visible'});
  assert.equal(await tip.locator('.up-contact-tooltip-heading').count(),0);
  assert.deepEqual(await tip.locator('.up-contact-tooltip-row>span').allTextContents(),['品质问题','体验问题']);
  const values=await tip.locator('.up-contact-tooltip-row b').allTextContents();
  assert.deepEqual(values,payloads.map(part=>part.count.toLocaleString('en-US')+'条 '+part.share.toFixed(1).replace(/\.0$/,'')+'%'),'悬浮任一分段均同时展示两类的条数与占比');
  assert.doesNotMatch(await tip.innerText(),/进线率|环比|进线条数|条数占比/);
  const box=await tip.boundingBox(),viewport=page.viewportSize();assert(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width&&box.y+box.height<=viewport.height,'提示在视口内');
  await page.keyboard.press('Escape');assert(await tip.isHidden());assert(await root.isVisible());
  await button.focus();await tip.waitFor({state:'visible'});await page.keyboard.press('Escape');
 }
 await page.mouse.move(0,0);await buttons.last().blur();
 for(const width of [390,1920]){
  await page.setViewportSize({width,height:1080});
  assert(await root.locator('.up-violation-stats-scroll').evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1),'指标栏在窄屏内部滚动');
 }
}

export async function detailContact(page){
 await page.clock.setFixedTime(new Date('2026-10-31T04:00:00Z'));await page.reload();
 await page.locator('#riskrail [data-qr-detail]').first().click();
 await page.locator('.up-detail [data-drawer-tab="quality"]').click();
 await verifyDetailContact(page);
 const root=page.locator('.up-detail'),button=root.locator('.up-contact-bar button').first(),tip=page.locator('#up-contact-tooltip');
 await button.focus();await tip.waitFor({state:'visible'});
 await root.locator('[data-up-quality-platform="京东"]').click();
 assert(await tip.isHidden(),'切换平台清理旧提示');
 await root.locator('.up-contact-bar button').first().focus();await tip.waitFor({state:'visible'});
 await page.locator('#close').click();assert(await tip.isHidden(),'关闭详情清理提示');
}
