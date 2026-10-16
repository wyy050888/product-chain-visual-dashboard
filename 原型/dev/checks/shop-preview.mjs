import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {pddLinks} from './pdd-links.mjs';
function rules(){
 const shiftDate=(date,days)=>new Date(Date.parse(date)+days*86400000).toISOString().slice(0,10);
 const ctx=vm.createContext({DATA_CUTOFF:'2026-10-10',shiftDate,riskMonthShift:(month,n)=>{const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m-1+n,1)).toISOString().slice(0,7)}});
 const rangeSource=fs.readFileSync(new URL('../../src/modules/risk-range/01-data.js',import.meta.url),'utf8');
 vm.runInContext(rangeSource.slice(0,rangeSource.indexOf('function riskLossPeriod')),ctx);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/sample-reference/03-shop-sales.js',import.meta.url),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/sample-reference/04-shop-events.js',import.meta.url),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/01-quality.js',import.meta.url),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/01-shop.js',import.meta.url),'utf8'),ctx);
 for(const [platform,red,normal] of [['抖音',4.6,4.8],['快手',4.4,4.7],['视频号',4,4.5],['天猫',4.6,4.8],['京东',4.6,4.8],['拼多多',4.7,4.8]]){
  assert.equal(ctx.rpShopScoreTone(platform,red),platform==='天猫'?'rp-quality-yellow':'rp-quality-red');
  assert.equal(ctx.rpShopScoreTone(platform,(red+normal)/2),'rp-quality-yellow');
  assert.equal(ctx.rpShopScoreTone(platform,normal),'rp-quality-green');
  assert.equal(ctx.rpShopScoreTone(platform,normal+0.01),'rp-quality-green');
  assert.equal(ctx.rpShopScoreTone(platform,red-0.01),'rp-quality-red');
  assert.equal(ctx.rpShopScoreTone(platform,null),'rp-quality-gray');
 }
 assert.equal(ctx.rpShopProblemHit({target:10,previous:10.5,current:11}),false);
 assert.equal(ctx.rpShopProblemHit({target:10,previous:10.6,current:10.7}),true);
 assert.equal(ctx.rpShopProblemHit({target:10,previous:11,current:10.8}),false);
 assert.equal(ctx.rpShopProblemHit({currentTarget:11,previousTarget:10,previous:10.6,current:11}),false);
 const a={spuCode:'A'},b={spuCode:'B'};
 assert.equal(ctx.rpShopTopSpu([{product:a,sales:10},{product:b,sales:20}]),b);
 assert.equal(ctx.rpShopTopSpu([{product:b,sales:20},{product:a,sales:20}]),a);
 assert.equal(ctx.rpShopTopSpu([{product:a,sales:0},{product:b,sales:NaN}]),null);
 vm.runInContext(fs.readFileSync(new URL('../../src/data/sample-spus.js',import.meta.url),'utf8'),ctx);
 const salesShop={id:4,brand:'康佳'},start='2026-09-11',end='2026-10-10';
 const sales=ctx.sampleShopSpuSales(salesShop,start,end);
 const gross=ctx.riskDailyRows(start,end,date=>({sales:ctx.sampleShopDailySales(salesShop,date)})).reduce((sum,r)=>sum+r.sales,0);
 assert.equal(sales.reduce((sum,r)=>sum+r.sales,0),gross);
 assert.equal(ctx.rpShopMainSpu(salesShop,start,end).spuCode,ctx.rpShopTopSpu(sales).spuCode);
 const earlier=ctx.sampleShopSpuSales(salesShop,start,'2026-09-30'),later=ctx.sampleShopSpuSales(salesShop,'2026-10-01',end);
 sales.forEach((r,i)=>assert.equal(r.sales,earlier[i].sales+later[i].sales));
 // 每一家有销量的参考店铺必须有主营SPU，且总销量、退货、净销量均可核对。
 const shops=vm.runInContext(fs.readFileSync(new URL('../../src/data/sample-shops.js',import.meta.url),'utf8')+';sampleShops',ctx);
 for(const [id,source] of shops.entries()){
  const record={...source,id,sourceQualityFine:0,frozenAmount:0};
  const details=ctx.sampleShopSpuSales(record,start,end),main=ctx.rpShopMainSpu(record,start,end);
  assert(main,source.name+'有销量时应有核心主营SPU');
  assert.equal(main.brand,source.brand);
  if(source.brand==='苏泊尔')assert.match(main.spuCode,/^DEMO-/);
  const daily=ctx.riskDailyRows(start,end,date=>({sales:ctx.sampleShopDailySales(record,date)}));
  assert.equal(details.reduce((n,r)=>n+r.sales,0),daily.reduce((n,r)=>n+r.sales,0));
  assert.equal(details.reduce((n,r)=>n+r.returned,0),daily.reduce((n,r)=>n+Math.round(r.sales*.095),0));
  assert.equal(ctx.rpShopPeriodFacts(record,start,end).netSales,details.reduce((n,r)=>n+r.sales-r.returned,0));
  assert(details.every(r=>r.sales>=r.returned&&Number.isInteger(r.returned)));
  const splitA=ctx.sampleShopSpuSales(record,start,'2026-09-30'),splitB=ctx.sampleShopSpuSales(record,'2026-10-01',end);
  details.forEach((r,i)=>{assert.equal(r.sales,splitA[i].sales+splitB[i].sales);assert.equal(r.returned,splitA[i].returned+splitB[i].returned)});
 }
 assert.equal(ctx.rpShopMainSpu({id:0,brand:'缺失品牌'},start,end),null);
 assert.equal(ctx.rpShopMainSpu(salesShop,'2026-10-11','2026-10-12'),null);
 const winners=new Set(Array.from({length:9},(_,i)=>ctx.rpShopMainSpu(salesShop,'2026-0'+(i+1)+'-01','2026-0'+(i+1)+'-28').spuCode));
 assert(winners.size>1,'主营SPU应随期间销量变化，而非固定匹配第一条');
 const shop={id:4,brand:'康佳',chain:0,referenceGsv:10.7,sourceQualityFine:5000,frozenAmount:12000};
 const full=ctx.rpShopPeriodFacts(shop,'2026-09-11','2026-10-10');
 const left=ctx.rpShopPeriodFacts(shop,'2026-09-11','2026-09-30'),right=ctx.rpShopPeriodFacts(shop,'2026-10-01','2026-10-10');
 for(const key of Object.keys(full))assert(Math.abs(full[key]-left[key]-right[key])<1e-7,key+'应可按日期拆分汇总');
 const all=ctx.rpShopPeriodFacts(shop,'2026-09-11','2026-10-10',false);
 for(const key of ['violations','fine','frozen','fineCount','frozenCount','offShelf','drop','limited'])assert(all[key]>full[key],key+'全部原因应包含非品质样例');
 for(const key of ['gsv','netSales'])assert.equal(all[key],full[key]);
 const allLeft=ctx.rpShopPeriodFacts(shop,'2026-09-11','2026-09-30',false),allRight=ctx.rpShopPeriodFacts(shop,'2026-10-01','2026-10-10',false);
 for(const key of Object.keys(all))assert(Math.abs(all[key]-allLeft[key]-allRight[key])<1e-7);
 assert.equal(full.fineCount,1);assert.equal(full.frozenCount,1);assert.equal(full.drop,1);assert.equal(full.limited,1);assert.equal(full.violations,4);
}
export async function shopPreview(page){
 rules();
 const card=page.locator('#riskrail .rp-shop-card');
 assert.equal(await card.locator('.rp-shop-entry').count(),6);
 for(const width of [1440,390,1920]){
  await page.setViewportSize({width,height:1080});
  const overflow=await card.evaluate(c=>[...c.querySelectorAll('.rp-shop-metric,.rp-shop-scores')].filter(el=>el.scrollWidth>el.clientWidth+1).length);
  assert.equal(overflow,0,'店铺卡片指标不能溢出 '+width);
 }
 assert.equal(await card.locator('.rp-shop-scores>div').count(),4*await card.locator('.rp-shop-scores:not(.rp-shop-link-counts)').count());
 assert.equal(await card.locator('.rp-shop-link-counts .rp-pdd-count--card').count(),2*await card.locator('.rp-shop-link-counts').count());
 assert.equal(await card.locator('[data-rp-pdd-shop]').count(),0);
 assert.equal(await card.locator('.rp-shop-values [data-rp-field="score"]').count(),0);
 assert.equal(await card.locator('.rp-shop-scores>div:first-child').first().getAttribute('data-rp-field'),'score');
 assert(await card.locator('.rp-shop-assessed').count()>0);
 await card.screenshot({path:fileURLToPath(new URL('../../outputs/shop-card-v2.png',import.meta.url))});
 const first=card.locator('.rp-shop-entry').first();
 await card.locator('[data-risk="1"]').click();
 const table=page.locator('.rp-shop-table');
 assert.equal(await table.locator('thead th').count(),17);
 for(const key of ['gsv','netSales','limited','score']){
  const index=await table.locator('[data-rp-sort="'+key+'"]').evaluate(el=>el.closest('th').cellIndex);
  assert.equal(await first.locator('[data-rp-field="'+key+'"] strong').innerText(),await table.locator('tbody tr').first().locator('td').nth(index).locator('strong').innerText());
 }
 assert(await table.locator('.rp-shop-spu .risk-thumb').count()>0);
 assert.match(await table.locator('tbody tr').first().locator('td').nth(2).innerText(),/SPU码/);
 assert.equal(await table.locator('tbody').getByText('待配置',{exact:true}).count(),0);
 assert.equal(await table.locator('tbody').getByText('暂无销量数据',{exact:true}).count(),0);
 assert.equal(await table.locator('.rp-shop-spu').count(),await table.locator('tbody tr').count());
 assert((await table.locator('tbody').innerText()).includes('DEMO-SUPOR'));
 assert.equal(await table.locator('th').filter({hasText:/^核心店铺$/}).count(),0);
 const widths=await table.locator('th:has([data-rp-sort])').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().width));
 assert(widths.every(w=>w>=127));
 await page.screenshot({path:fileURLToPath(new URL('../../outputs/shop-drawer-v2.png',import.meta.url))});
 await table.evaluate(el=>el.scrollLeft=el.scrollWidth);
 await page.screenshot({path:fileURLToPath(new URL('../../outputs/shop-drawer-right.png',import.meta.url))});
 await page.locator('[data-rp-filter="qualityRisk"]').selectOption('down',{force:true});
 assert(await table.locator('tbody tr').count()>0);
 await page.locator('#close').click();
 await pddLinks(page);
}
