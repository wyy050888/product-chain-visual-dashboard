import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
export async function salesSort(page){
 const ctx=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(new URL('../../src/modules/sales-review/01-model.js',import.meta.url),'utf8'),ctx);
 const fixture=[{name:'missing',sale:null},{name:'zero',sale:0},{name:'negative',sale:-10.01},{name:'near',sale:-10.02},{name:'positive',sale:1000},{name:'equal',sale:0}];
 assert.deepEqual(ctx.msDrawerSortRows(fixture,{key:'sale',direction:'asc'}).map(r=>r.name),['near','negative','zero','equal','positive','missing']);
 assert.deepEqual(ctx.msDrawerSortRows(fixture,{key:'sale',direction:'desc'}).map(r=>r.name),['positive','zero','equal','negative','near','missing']);
 await page.locator('a[href="#sales"]').click();await page.locator('#salescards .ms-card').first().locator('[data-sales]').click();
 const table=page.locator('#ms-drawer-table'),audit=()=>page.evaluate(()=>dashboardSalesDetailSnapshot());
 assert.deepEqual((await audit()).sort,{key:'scaleDeviation',direction:'desc'});
 const keys=['name','sku','sale','netSales','actualMargin','target','gap','marginGap','gsvDeviation','scaleDeviation'];
 const verify=async()=>{
  const data=await audit(),{key,direction}=data.sort;
  assert.deepEqual(await table.locator('tbody tr td:first-child').allTextContents(),data.records.slice(0,20).map(r=>r.name));
  assert.equal(await table.locator(`[data-ms-sort="${key}"]`).getAttribute('data-direction'),direction);
  assert.equal(await table.locator('th').nth(keys.indexOf(key)).getAttribute('aria-sort'),direction==='asc'?'ascending':'descending');
  let previous=null,missing=false;
  for(const row of data.records){const value=row[key],valid=key==='name'?typeof value==='string':Number.isFinite(value);if(!valid){missing=true;continue}assert(!missing);if(previous!==null){const comparison=key==='name'?previous.localeCompare(value,'zh-CN'):previous-value;assert(direction==='asc'?comparison<=0:comparison>=0)}previous=value;}
 };
 for(const view of ['brand','platform']){
  await page.locator(`[data-ms-view="${view}"]`).click();assert.equal(await table.locator('[data-ms-sort]').count(),10);
  for(const key of keys)for(let i=0;i<2;i++){await table.locator(`[data-ms-sort="${key}"]`).click();await verify();}
 }
 await table.locator('[data-ms-sort="sale"]').click();await table.locator('[data-ms-sort="sale"]').click();
 const sort=(await audit()).sort;
 const query=(await audit()).records[0].name;await page.locator('#ms-search').fill(query);assert.equal((await audit()).records.length,1);assert.deepEqual((await audit()).sort,sort);await verify();await page.locator('#ms-search').fill('');
 await page.locator('[data-ms-view="brand"]').click();assert.deepEqual((await audit()).sort,sort);await verify();
 await page.locator('[data-drawer-tab="ms-chain-0"]').click();assert.equal((await audit()).chain,0);assert.deepEqual((await audit()).sort,sort);await verify();
 await page.locator('[data-ms-year]').selectOption('2025');assert.deepEqual((await audit()).sort,sort);await verify();
 await table.locator('[data-ms-sort="gap"]').focus();await page.keyboard.press('Enter');assert.equal((await audit()).sort.key,'gap');await verify();
 for(const width of [1920,900,600]){await page.setViewportSize({width,height:1080});assert(await table.evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1));}
 await page.setViewportSize({width:1920,height:1080});await page.locator('#dialog').screenshot({path:fileURLToPath(new URL('../../outputs/sales-detail-sort.png',import.meta.url))});
 await page.locator('#close').click();assert.equal(await audit(),null);
 await page.locator('#salescards .ms-card').first().locator('[data-sales]').click();assert.deepEqual((await audit()).sort,{key:'scaleDeviation',direction:'desc'});await page.locator('#close').click();
}
