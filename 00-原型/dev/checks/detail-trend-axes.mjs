import {openNewProductSpu} from './new-products-detail.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {salesQuantityFormatter} from './business-rules-context.mjs';

export async function detailTrendAxes(page){
 await page.setViewportSize({width:1920,height:1080});
 await page.evaluate(()=>{const b=document.createElement('button');b.dataset.riskitem='1,4';document.body.append(b);b.click();b.remove()});
 const shop=page.locator('.sd-detail');await shop.waitFor();
 const chart=shop.locator('.up-operating-trend'),canvas=chart.locator('svg');
 assert.equal(await chart.locator('h3').count(),0,'店铺趋势图移除可见标题');
 const salesToggle=chart.locator('[data-up-series-toggle="netSales"]');await salesToggle.click();
 for(const width of [1920,1100,390,1920]){
  await page.setViewportSize({width,height:1080});
  await page.waitForFunction(()=>{
   const svg=document.querySelector('.sd-operating-overview .up-trend-scroll svg'),host=svg.parentElement;
   return svg.viewBox.baseVal.width===host.clientWidth&&svg.viewBox.baseVal.height===host.clientHeight;
  });
  const bounds=await canvas.evaluate(svg=>{
   const area=svg.getBoundingClientRect(),grid=svg.querySelector('line').getBoundingClientRect();
   return {fits:[...svg.querySelectorAll('text')].every(text=>{const box=text.getBoundingClientRect();return box.left>=area.left&&box.right<=area.right}),left:grid.left-area.left,right:area.right-grid.right};
  });
  assert(bounds.fits&&bounds.left<=50&&bounds.right<=60,'绘图区随容器宽度伸缩并留出刻度空间：'+width);
  assert.equal(await chart.locator('[data-up-series="netSales"]').evaluate(n=>getComputedStyle(n).display),'none','自适应重绘保留图例开关');
 }
 await salesToggle.click();
 assert.deepEqual(await shop.locator('[data-up-axis]').evaluateAll(ns=>ns.map(n=>[n.dataset.upAxis,n.dataset.axisSide])),[['gsv','left'],['netSales','right']]);
 assert.doesNotMatch(await shop.locator('[data-up-axis]').allTextContents().then(v=>v.join('')),/GSV|销量|万元|件/);
 const legend=shop.locator('.up-trend-legend-item').filter({has:page.locator('[data-up-series-toggle="netSales"]')});
 const gap=await legend.evaluate(n=>{const label=n.querySelector('button').getBoundingClientRect(),help=n.querySelector('.net-sales-help').getBoundingClientRect();return help.left-label.right});
 assert(gap>=0&&gap<=6,'销量提示紧挨图例文字');
 await legend.locator('.net-sales-help').hover();
 assert.match(await page.locator('#metric-tooltip').innerText(),/去退后销量/);
 await page.mouse.move(0,0);
 await shop.locator('[data-up-trend-point]').first().hover();
 assert.deepEqual(await page.locator('.up-sales-tooltip-row>span').allTextContents(),['GSV','销量']);
 await page.mouse.move(0,0);
 await page.locator('#close').click();
 await openNewProductSpu(page.locator('#newtable [data-nsp-view]').first());
 await page.locator('[data-drawer-tab="operating"]').click();
 const product=page.locator('.up-detail');
 assert.doesNotMatch(await product.locator('.up-operating-trend [data-up-axis]').allTextContents().then(v=>v.join('')),/GSV|利润率|万元/);
 assert.deepEqual(await product.locator('.up-operating-trend [data-up-axis]').evaluateAll(ns=>ns.map(n=>[n.dataset.upAxis,n.dataset.axisSide])),[['gsv','left'],['margin','right']]);
 assert.equal(await product.locator('.up-operating-trend [data-up-axis="sales"]').count(),0);
 assert.equal(await product.locator('[data-up-series="sales"]').count(),1);
 await product.locator('[data-up-series-toggle="sales"]').click();
 assert.equal(await product.locator('[data-up-series="sales"]').evaluate(n=>getComputedStyle(n).display),'none');
 await product.locator('[data-up-series-toggle="sales"]').click();
 // 不同量纲、负利润与数据中断：轴和悬浮保留原值，不把比例当金额。
 const renderSource=readFileSync(new URL('../../src/modules/unified-product/05-sales-trend.js',import.meta.url),'utf8').split("document.addEventListener('click'")[0];
 const sample=await page.evaluate(source=>{
  const chrQuote=String.fromCharCode(34);
  const render=new Function('fmt','esc','upPercent','netSalesHelp',source+';return upSalesTrend;')((v,d=0)=>Number(v).toFixed(d),v=>String(v).replaceAll('&','&amp;').replaceAll(chrQuote,'&quot;'),v=>v+'%',()=>'' );
  const host=document.createElement('div');host.innerHTML=render([{date:'2026-10-01',gsvCents:1400000,sales:92,profitCents:-140000},{date:'2026-10-02',gsvCents:2000000,sales:12500,profitCents:400000},{date:'2026-10-03',gsvCents:0,sales:0,profitCents:0}]);
  const points=[...host.querySelectorAll('[data-up-trend-point]')].map(point=>JSON.parse(point.dataset.seriesValues));
  return {axis:host.querySelector('[data-up-axis="margin"]').textContent,paths:[...host.querySelectorAll('[data-up-series] path')].map(n=>n.getAttribute('d')),points};
 },salesQuantityFormatter+'\n'+renderSource);
 assert.match(sample.axis,/-/);assert(!sample.paths.join('').match(/NaN|Infinity/));
 assert.notEqual(sample.paths[0],sample.paths[1],'金额和件数用各自刻度');
 assert.deepEqual(sample.points[0].map(v=>v.value),['1.4万元','92件','-10.0%']);
 assert.equal(sample.points[1].find(v=>v.key==='sales').value,'1.3w件');
 console.log('通过：店铺左右轴、产品金额/利润率双轴、销量隐藏轴及图例提示、负利润与缺失数据。');
}
