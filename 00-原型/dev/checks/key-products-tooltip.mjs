import {clearKeyProductFilters} from './key-products-default-filters.mjs';
import assert from 'node:assert/strict';
export async function verifyPointTooltipHover(page,dot,tip){
 await dot.hover();await tip.waitFor({state:'visible'});
 const id=await tip.getAttribute('data-spu-id'),box=await tip.boundingBox();
 await page.mouse.move(box.x+20,box.y+20,{steps:8});await page.waitForTimeout(350);
 assert(await tip.isVisible(),'鼠标从圆点移入浮层后保持显示');assert.equal(await tip.getAttribute('data-spu-id'),id);
 await tip.locator('.kpm-point-values').hover();await page.waitForTimeout(300);assert(await tip.isVisible(),'在浮层内移动不关闭');
 await tip.locator('.kpm-point-product b').click();assert(await tip.isVisible(),'点击浮层内容不关闭');
 await page.mouse.move(0,0);await tip.waitFor({state:'hidden'});assert.equal(await dot.getAttribute('aria-describedby'),null,'离开浮层后清理提示关联');
}
export async function verifyKeyProductTooltip(page,initial){
 const root=page.locator('#matrix'),tip=page.locator('#kpm-point-tooltip');
 const point=p=>root.locator('circle[data-kpm-point="'+p.spuId+'"]');
 const money=cents=>{const value=cents/100;return (Math.abs(value)>10000?value/10000:value).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1}).replaceAll(',','')+(Math.abs(value)>10000?'w':'元')};
 const percent=n=>Number.isFinite(n)?n.toFixed(1)+'%':'--';
 const expectValues=p=>{const f=p.assessment.current;return [money(f.gsvCents),percent(f.profitRate),money(f.profitCents),f.sales.toLocaleString('en-US'),percent(f.returnRate),percent(f.receivedRate)]};
 const within=()=>tip.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=8&&r.right<=innerWidth-8+1&&r.top>=8&&r.bottom<=innerHeight-8+1&&e.scrollWidth<=e.clientWidth+1});
 const reveal=async p=>{const dot=point(p);await dot.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center',inline:'center'}));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const exposed=await dot.evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e});if(exposed)await dot.hover();else await dot.focus();await tip.waitFor({state:'visible'});return dot};
 assert.equal(await root.locator('#matrixchart circle title').count(),0,'替换原生title，不叠加两种提示');
 const graded=initial.rows.filter(p=>p.level);
 const candidates=[...new Set([graded.find(p=>p.level==='A'&&p.profit<0),graded.reduce((a,b)=>a.sales>b.sales?a:b),graded.reduce((a,b)=>a.profit<b.profit?a:b),...['S','A','B','C'].map(g=>graded.find(p=>p.level===g))])].filter(Boolean);
 for(const p of candidates){
  const dot=await reveal(p);
  assert.equal(await tip.getAttribute('role'),'tooltip');assert.equal(await tip.locator('.metric-help').count(),0,'提示内部不添加二次问号');assert.equal(await dot.getAttribute('aria-describedby'),'kpm-point-tooltip');assert.equal(await tip.getAttribute('data-spu-id'),p.spuId);
  await page.waitForTimeout(80);
  assert.equal(await tip.locator('.metric-help,.kpm-point-meta').count(),0,'原信息块及自动问号均移除');
  assert.doesNotMatch(await tip.innerText(),/SPU码|销售额/);
  assert.equal(await tip.locator('[data-kpm-metric="gsv"] strong').evaluate(e=>getComputedStyle(e).color),'rgb(22, 119, 255)');
  assert.equal(await tip.locator('[data-kpm-metric="profit"] strong').evaluate(e=>getComputedStyle(e).color),p.profit<0?'rgb(255, 49, 87)':'rgb(118, 81, 212)');
  assert.equal(await tip.locator('.kpm-point-product b').innerText(),p.name);
  assert.equal(await tip.locator('[data-kpm-metric="guidePrice"] strong').innerText(),Number.isFinite(p.guidePriceCents)?(p.guidePriceCents/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+'元':'—','读取产品主数据指导价，不用成交均价');
  assert.doesNotMatch(await tip.innerText(),/成交均价/);
  const layout=await tip.evaluate(e=>{const fields=[...e.querySelectorAll('.kpm-point-values>div')].map(n=>n.getBoundingClientRect()),price=e.querySelector('.kpm-point-guide').getBoundingClientRect(),name=e.querySelector('.kpm-point-info').getBoundingClientRect(),image=e.querySelector('.kpm-point-product>:first-child').getBoundingClientRect();return {width:e.getBoundingClientRect().width,cols:new Set(fields.map(r=>r.left)).size,rows:new Set(fields.map(r=>r.top)).size,right:price.left>=name.right+11,imageGap:name.left-image.right}});
  assert.equal(layout.cols,3);assert.equal(layout.rows,2);assert(layout.right);assert(layout.imageGap>=11,'图片和商品信息之间留出完整间距');assert.equal(layout.width,440);assert.match(await tip.locator('.kpm-point-grade').innerText(),new RegExp('^'+p.level+' '));
  assert.deepEqual(await tip.locator('.kpm-point-values>div>span').allTextContents(),['GSV','单品利润率','利润额','销量','总退','已收退']);
  assert.deepEqual(await tip.locator('.kpm-point-values strong').allTextContents(),expectValues(p),'取当前图表同一产品事实');assert(await within());
  assert.equal(await tip.locator('.kpm-point-values .negative').count(),p.profit<0?2:0);
  await dot.evaluate(e=>e.blur());await page.mouse.move(0,0);await tip.waitFor({state:'hidden'});assert.equal(await dot.getAttribute('aria-describedby'),null);
 }
 const p=candidates[0],dot=point(p);await dot.evaluate(e=>{e.scrollIntoView({behavior:'instant',block:'center'});e.focus({preventScroll:true})});await tip.waitFor({state:'visible'});
 await dot.evaluate(e=>e.blur());await verifyPointTooltipHover(page,point(graded.reduce((a,b)=>a.sales>b.sales?a:b)),tip);
 await dot.focus();await tip.waitFor({state:'visible'});
 await page.keyboard.press('Escape');assert(await tip.isHidden());assert.equal(await page.locator('#overlay').isVisible(),false,'关闭提示不打开或关闭业务抽屉');
 await dot.evaluate(e=>e.blur());await dot.evaluate(e=>e.focus({preventScroll:true}));await tip.waitFor({state:'visible'});
 await root.locator('[data-kpm-filter="brand"]').evaluate(e=>{for(const option of e.options)option.selected=option.value==='康佳';e.dispatchEvent(new Event('change',{bubbles:true}))});assert(await tip.isHidden(),'重绘立即清除旧提示');
 await clearKeyProductFilters(page);
 await root.locator('[data-time-mode="month"]').click();const monthly=await page.evaluate(()=>window.dashboardKeyProductsSnapshot());
 const updated=monthly.rows.find(a=>a.spuId===p.spuId);await reveal(updated);
 assert.deepEqual(await tip.locator('.kpm-point-values strong').allTextContents(),expectValues(updated),'切换统计周期使用同一评级事实');assert.match(await tip.locator('.kpm-point-period').innerText(),/10月.*26\/10\/01.*26\/10\/10/);
 await point(updated).click();await page.locator('.up-detail').waitFor();assert.equal(await page.locator('.up-detail').getAttribute('data-up-start'),monthly.range.start,'圆点详情继承图表所选期间');await page.locator('#close').click();
 await root.locator('[data-time-mode="recent30"]').click();
 for(const width of [390,1920]){await page.setViewportSize({width,height:1080});await reveal(p);assert(await within(),'浮层避让视口 '+width);await page.mouse.move(0,0)}
 await reveal(p);await point(p).click();await page.locator('.up-detail').waitFor();assert(await tip.isHidden(),'点击圆点进入详情时隐藏提示');assert.match(await page.locator('#dialogbody').innerText(),new RegExp(p.name));await page.locator('#close').click();
 await clearKeyProductFilters(page);
}
