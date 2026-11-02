import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
export async function verifyProjectLightDistribution(page){
 const ctx=vm.createContext({esc:String});vm.runInContext(fs.readFileSync(new URL('../../src/modules/project-panorama/03-scope-tabs.js',import.meta.url),'utf8'),ctx);
 const model=(total,green,yellow,red,high)=>({total,green,yellow,red,high,rate:n=>total?(n/total*100).toFixed(1)+'%':'—'});
 for(const counts of [model(0,0,0,0,0),model(1,0,0,1,1),model(4,1,1,1,1)]){
  const html=ctx.ppLightDistribution(counts);assert(!/NaN|Infinity/.test(html));
  assert(html.includes('data-pp-light-share="high"'),'高危独立一段');
  assert(html.includes('data-pp-light-share="red" data-count="'+(counts.red-counts.high)+'"'),'普通红灯扣除高危，不重复计数');
  assert.equal(html.includes('data-pp-light-share="unknown"'),counts.total>counts.green+counts.yellow+counts.red);
 }
 const bar=page.locator('#pp-light-distribution .pp-light-distribution');
 const read=()=>bar.evaluate(n=>({total:Number(n.dataset.total),parts:[...n.children].map(x=>({tone:x.dataset.ppLightShare,count:Number(x.dataset.count),share:Number(x.dataset.share)}))}));
 const assertCards=async()=>{
  const state=await read(),count=async key=>Number(await page.locator('[data-pp-light-tab="'+key+'"] [data-pp-card-count]').innerText());
  assert.equal(state.total,await count('all'));assert.equal(state.parts.find(n=>n.tone==='high').count,await count('高危红灯'));assert.equal(state.parts.find(n=>n.tone==='red').count+state.parts.find(n=>n.tone==='high').count,await count('红灯'));assert.equal(state.parts.find(n=>n.tone==='yellow').count,await count('黄灯'));
  assert.equal(state.parts.reduce((n,p)=>n+p.count,0),state.total);assert(Math.abs(state.parts.reduce((n,p)=>n+p.share,0)-(state.total?100:0))<1e-8);
  assert.deepEqual(state.parts.slice(0,4).map(p=>p.tone),['high','red','yellow','green']);return state;
 };
 const initial=await assertCards();
 await page.locator('[data-pp-light-tab="红灯"]').click();assert.deepEqual(await assertCards(),initial,'灯色筛选不缩小整体分母');
 await page.locator('[data-pp-light-tab="all"]').click();
 await page.locator('[data-pp-type-tab="自研开发"]').click();await assertCards();assert((await read()).total<initial.total,'类型筛选同步');
 await page.locator('[data-pp-type-tab="all"]').click();assert.deepEqual(await read(),initial);
 await page.locator('[data-pp-search]').fill('没有匹配的项目-整体分布测试');assert.equal((await assertCards()).total,0);
 assert.equal(await bar.getAttribute('aria-label'),'暂无进行中项目');
 await page.locator('[data-pp-search]').fill('');assert.deepEqual(await read(),initial);
 for(const width of [1920,1440,1024,390,320]){
  await page.setViewportSize({width,height:1080});
  const geometry=await bar.evaluate(n=>{const r=n.getBoundingClientRect(),cards=document.querySelector('#pp-light-tabs').getBoundingClientRect(),filters=document.querySelector('#pp-filters').getBoundingClientRect();return {height:r.height,ordered:cards.bottom<=r.top&&r.bottom<=filters.top,aligned:Math.abs(cards.width-r.width)<1,overflow:n.scrollWidth-n.clientWidth}});
  assert(geometry.ordered&&geometry.aligned&&geometry.overflow<=1&&geometry.height===6,'横条位于卡片下方、筛选上方且无溢出 '+width);
 }
 await page.setViewportSize({width:1920,height:1080});
}
