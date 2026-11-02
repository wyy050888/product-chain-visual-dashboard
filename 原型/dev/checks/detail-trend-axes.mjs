import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

export async function detailTrendAxes(page){
 await page.setViewportSize({width:1920,height:1080});
 await page.evaluate(()=>{const b=document.createElement('button');b.dataset.riskitem='1,4';document.body.append(b);b.click();b.remove()});
 const shop=page.locator('.sd-detail');await shop.waitFor();
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
 await page.locator('#newtable [data-nsp-view]').first().click();
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
  const host=document.createElement('div');host.innerHTML=render([{date:'2026-10-01',gsvCents:1400000,sales:92,profitCents:-140000},{date:'2026-10-02',gsvCents:2000000,sales:75,profitCents:400000},{date:'2026-10-03',gsvCents:0,sales:0,profitCents:0}]);
  return {axis:host.querySelector('[data-up-axis="margin"]').textContent,paths:[...host.querySelectorAll('[data-up-series] path')].map(n=>n.getAttribute('d')),values:JSON.parse(host.querySelector('[data-up-trend-point]').dataset.seriesValues)};
 },renderSource);
 assert.match(sample.axis,/-/);assert(!sample.paths.join('').match(/NaN|Infinity/));
 assert.notEqual(sample.paths[0],sample.paths[1],'金额和件数用各自刻度');
 assert.deepEqual(sample.values.map(v=>v.value),['1.40万元','92件','-10.0%']);
 console.log('通过：店铺左右轴、产品金额/利润率双轴、销量隐藏轴及图例提示、负利润与缺失数据。');
}
