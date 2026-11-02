import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {verifyZoomFilters} from './key-products-zoom-filters.mjs';

export async function keyProductBubbles(page){
 const model=vm.createContext({brcGradeFactor:mode=>({quarter:3,year:12}[mode]||1)});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/key-products/01-bubble-size.js',import.meta.url),'utf8'),model);
 for(const [mode,factor] of [['recent30',1],['month',1],['quarter',3],['year',12]]){
  for(const [amount,tier] of [[0,0],[49.999999,0],[50,1],[299.999999,1],[300,2],[999.999999,2],[1000,3],[99999999,3]])assert.equal(model.kpmBubbleTier(Math.round(amount*1e6)*factor,mode),tier,mode+' '+amount);
  for(const [tier,radius] of [[0,5],[1,7],[2,9],[3,11]])assert.equal(model.kpmBubbleRadius(tier),radius);
 }
 await page.clock.setFixedTime(new Date('2026-10-26T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 await page.locator('a[href="#matrix"]').click();
 const root=page.locator('#matrix'),snapshot=()=>page.evaluate(()=>dashboardKeyProductsSnapshot());
 const dots=()=>root.locator('#matrixchart [data-kpm-point]').evaluateAll(nodes=>nodes.map(e=>({id:e.dataset.kpmPoint,tier:+e.dataset.kpmBubbleTier,r:+e.getAttribute('r'),x:+e.getAttribute('cx'),y:+e.getAttribute('cy')})));
 async function check(rows,zoom=false){
  const state=await snapshot(),factor={quarter:3,year:12}[state.period.mode]||1;
  await page.waitForFunction(zoom=>[...document.querySelectorAll('#matrixchart [data-kpm-point]')].every(e=>Math.abs(+e.getAttribute('r')-[5,7,9,11][+e.dataset.kpmBubbleTier]*(zoom?1.2:1))<1e-8),zoom);
  const points=await dots(),valid=rows.filter(p=>p.assessment.current.sales>0&&Number.isFinite(p.assessment.current.gsvCents)&&Number.isFinite(p.assessment.current.profitRate));
  assert.deepEqual(points.map(p=>p.id).sort(),valid.map(p=>p.spuId).sort(),'点数与经营事实不变');
  for(const point of points){const p=rows.find(row=>row.spuId===point.id),amount=p.assessment.current.gsvCents/(1e6*factor),tier=amount<50?0:amount<300?1:amount<1000?2:3;assert.equal(point.tier,tier);assert.equal(point.r,[5,7,9,11][tier]*(zoom?1.2:1))}
  assert.equal(await root.locator('.kpm-bubble-legend,[data-kpm-bubble-legend]').count(),0,'主图及放大图均移除气泡大小说明栏');
  return points;
 }
 for(const mode of ['recent30','month','quarter','year']){
  await page.locator('#time-matrix [data-time-mode="'+mode+'"]').click();
  await check((await snapshot()).base);
 }
 await page.locator('#time-matrix [data-time-mode="month"]').click();
 const original=await snapshot(),before=await check(original.base),trigger=root.locator('[data-kpm-expand]');
 assert.equal(new Set(before.map(point=>point.r)).size,4,'实际数据覆盖四档气泡');
 await trigger.click();const zoom=root.locator('.kpm-chart-zoom');await zoom.waitFor({state:'visible'});await check(original.base,true);
 const point=root.locator('#matrixchart circle').first();await point.hover();await page.locator('#kpm-point-tooltip').waitFor({state:'visible'});
 assert.equal(await page.locator('#kpm-point-tooltip').getAttribute('data-spu-id'),await point.getAttribute('data-kpm-point'));
 await page.keyboard.press('Escape');
 await zoom.locator('[data-kpm-zoom-scope-filter="category"][data-kpm-scope-value="环境"]').click();
 await check(original.base.filter(p=>p.category==='环境'),true);
 await zoom.locator('[data-kpm-zoom-reset]').click();await check(original.base,true);
 for(const width of [1920,1280,390]){
  await page.setViewportSize({width,height:900});await check(original.base,true);
  const box=await zoom.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1);
  if(width!==1280)await zoom.screenshot({path:fileURLToPath(new URL('../../outputs/matrix-bubbles-'+width+'.png',import.meta.url))});
 }
 await trigger.click();await page.setViewportSize({width:1920,height:1080});await check(original.base);
 assert.deepEqual(await snapshot(),original,'放大、筛选和返回不修改经营事实及外层状态');
 await root.locator('.matrixplot').screenshot({path:fileURLToPath(new URL('../../outputs/matrix-bubbles-main.png',import.meta.url))});
 await verifyZoomFilters(page);
 console.log('通过：移除大小说明栏，月季年/近30日档位、四档边界、半径、筛选、缩放/返回、悬浮与三种宽度正常');
}
