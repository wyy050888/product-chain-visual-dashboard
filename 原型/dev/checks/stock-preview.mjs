import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
function stockModel(){
 const ctx=vm.createContext({boundedCache:()=>({}),rpField:(key,name,value,tone,hint,target)=>({key,name,value,tone,hint,target}),
  pfMoneyYuan:n=>n+'元',fmt:(n,d=0)=>n.toFixed(d),upPercent:n=>Number.isFinite(n)?n.toFixed(1)+'%':'—',
  upIdentity:r=>r,upProduct:r=>r,upWindow:()=>({start:'2026-09-11',end:'2026-10-10'}),
  shiftDate:(d,n)=>new Date(Date.parse(d)+n*86400000).toISOString().slice(0,10),pfIdentity:()=>({attribute:'冬季品',isNew:true}),
  upPlatformStockFacts:r=>r,upSummary:()=>({sales:150,returned:30})});
 for(const file of ['01-quality.js','01-loss.js','01-stock.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/'+file,import.meta.url),'utf8'),ctx);
 ctx.rpLossReturnTarget=()=>10;
 ctx.rpStockEvents=(_p,start)=>start==='2026-09-11'?[{type:'资金冻结',amount:100},{type:'下架'},{type:'掉权'}]:[];
 const row={totalCoverage15:18.75,totalUnits:150,warehouse:100,financePriceCents:200,goodsValueCents:30000,staleUnits:20,staleValueCents:4000,staleMaxAgeDays:210,staleOldestSellableUnits:12,turn:1.2};
 const current={gsvCents:100000,sales:100,returned:20,profitRate:20,returnRate:20,receivedRate:6},before={...current,start:'2026-08-12',end:'2026-09-10',gsvCents:80000,sales:80,returned:10,profitRate:10};
 const fields=kind=>Object.fromEntries(ctx.rpStockFields(kind,row,current,before).map(f=>[f.key,f]));
 const inv=fields(3);
 assert.equal(inv.margin.sortValue,20,'库存利润率不得扣减亏损榜的10个百分点');
 assert.equal(inv.margin.target,'环比 ↑ 100.0%');assert.equal(inv.netSales.sortValue,80);
 assert.equal(inv.total.target,'总可售天数 18.8天');assert.equal(inv.total.cardTarget,'呆滞占比 13.3%');
 assert.equal(inv.frozen.sortValue,100);assert.equal(inv.frozen.target,'1次');
 assert.equal(inv.offShelf.sortValue,1,'链接下架不能合并掉权');
 assert.equal(inv.return.tone,'rp-quality-red');assert.equal(inv.received.tone,'rp-quality-normal');
 const slow=fields(4);
 assert.equal(slow.staleUnits.cardTarget,'呆滞占比 13.3%');
 assert.equal(slow.staleUnits.cardTargetTone,'rp-quality-red');
 assert.equal(slow.staleUnits.target,slow.staleUnits.cardTarget);
 assert.equal(slow.staleValue.target,slow.staleValue.cardTarget);
 assert.equal(slow.staleValue.cardTarget,'呆滞金额占比 13.3%');
 row.staleUnits=30;assert.equal(fields(4).staleUnits.cardTarget,'呆滞占比 20.0%');
 assert.equal(fields(4).staleValue.cardTarget,'呆滞金额占比 13.3%');
 assert.equal(slow.dailyNet15.sortValue,8,'近15日均净销量需扣退货再除15');
 assert.equal(slow.warehouse.cardTarget,'我司可售货值 '+slow.warehouseValue.value);
 assert.equal(slow.warehouse.target,slow.warehouse.cardTarget);
 assert.equal(slow.coverage15.sortValue,12.5);assert.equal(slow.warehouseValue.sortValue,20000);
 row.warehouseValueCents=12345;assert.equal(fields(4).warehouseValue.sortValue,12345,'底层货值优先于数量乘默认单价');assert.equal(fields(4).warehouse.cardTarget,'我司可售货值 '+fields(4).warehouseValue.value);delete row.warehouseValueCents;
 assert.equal(slow.age.sortValue,210);assert.equal(slow.age.value,'210天');
 assert.equal(slow.dailyNet15.value,'8');
 assert.equal(slow.age.cardTarget,'库存 12');assert.equal(slow.age.target,slow.age.cardTarget);
 row.staleOldestSellableUnits=0;assert.equal(fields(4).age.cardTarget,'库存 0');
 row.staleOldestSellableUnits=null;assert.equal(fields(4).age.cardTarget,'库存 —');
 ctx.upSummary=()=>({sales:149,returned:30});assert.equal(fields(4).dailyNet15.value,'8');
 assert.equal(fields(4).dailyNet15.sortValue,119/15);
 ctx.upSummary=()=>({sales:0,returned:0});assert.equal(fields(4).coverage15.value,'—');
 assert.equal(fields(4).warehouse.cardTarget,'我司可售货值 '+fields(4).warehouseValue.value);
 row.staleValueCents=0;assert.equal(fields(3).total.cardTarget,'呆滞占比 0.0%');
 assert.equal(fields(4).staleValue.cardTarget,'呆滞金额占比 0.0%');
 row.totalUnits=0;row.goodsValueCents=0;
 assert.equal(fields(4).staleUnits.cardTarget,'呆滞占比 0.0%');
 assert.equal(fields(4).staleValue.cardTarget,'呆滞金额占比 0.0%');
}
export async function stockPreview(page){
 stockModel();
 const expected={3:['gsv','margin','return','total','turn'],4:['staleUnits','staleValue','age','warehouse','dailyNet15']};
 for(const width of [1920,1440,1100,390]){
  await page.setViewportSize({width,height:1080});
  assert.equal(await page.locator('.rp-stock-card .rp-quality-metric').evaluateAll(ns=>ns.filter(n=>n.scrollWidth>n.clientWidth+1).length),0,'库存卡片指标溢出 '+width);
  if(width>900){const heights=await page.locator('#riskrail>.riskcard').evaluateAll(ns=>ns.map(n=>n.offsetHeight));assert(Math.max(...heights)-Math.min(...heights)<=1,'六榜须等高')}
 }
 await page.setViewportSize({width:1920,height:1080});
 for(const kind of [3,4]){
  const card=page.locator('.rp-stock-card').filter({has:page.locator('[data-risk="'+kind+'"]')});
  const first=card.locator('.rp-stock-entry').first();
  assert.equal(await card.locator('.rp-stock-entry').count(),6);
  assert.deepEqual(await first.locator('[data-rp-field]').evaluateAll(ns=>ns.map(n=>n.dataset.rpField)),expected[kind]);
  await card.screenshot({path:fileURLToPath(new URL('../../outputs/stock-card-'+kind+'.png',import.meta.url))});
  await card.locator('[data-risk]').click();
  const table=page.locator('.rp-stock-table');
  assert.equal(await table.locator('th').count(),kind===3?19:14);
  assert.equal(await table.locator('.rp-list-risks').count(),0);
  assert.equal(await table.locator('[data-rp-trend],.rp-mini-trend,.rp-trend-empty').count(),0);
  for(const key of expected[kind]){
   const index=await table.locator('[data-rp-sort="'+key+'"]').evaluate(e=>e.closest('th').cellIndex);
   assert.equal(await first.locator('[data-rp-field="'+key+'"] strong').innerText(),await table.locator('tbody tr').first().locator('td').nth(index).locator('strong').innerText());
  }
  if(kind===4){
   for(const key of ['staleUnits','staleValue','age']){
    const index=await table.locator('[data-rp-sort="'+key+'"]').evaluate(e=>e.closest('th').cellIndex);
    assert.equal(await table.locator('tbody tr').first().locator('td').nth(index).locator('em').innerText(),await first.locator('[data-rp-field="'+key+'"] small').innerText());
   }
   const coverageIndex=await table.locator('[data-rp-sort=warehouseValue]').evaluate(e=>e.closest('th').cellIndex);
   const days=await table.locator('tbody tr').first().locator('td').nth(coverageIndex).locator('strong').innerText();
   assert.equal(await first.locator('[data-rp-field=warehouse] small').innerText(),'我司可售货值 '+days);
   assert.match(await first.locator('[data-rp-field=age] small').innerText(),/^库存 [\d,]+$/);
   assert.match(await first.locator('[data-rp-field=age] small').getAttribute('title'),/最高库龄对应的我司可售库存数量/);
   assert.match(await first.locator('[data-rp-field=age] strong').innerText(),/^\d+天$/);
   assert.match(await first.locator('[data-rp-field=dailyNet15] strong').innerText(),/^[\d,]+$/);
   assert(Number((await first.locator('[data-rp-field=staleUnits] strong').innerText()).replaceAll(',',''))>=1000);
  }
  if(kind===3){
   const index=await table.locator('[data-rp-sort="total"]').evaluate(e=>e.closest('th').cellIndex);
   const stock=await page.evaluate(()=>window.inventoryRiskSnapshot());
   for(const row of await table.locator('tbody tr').all()){
    const id=(await row.locator('[data-riskitem]').getAttribute('data-riskitem')).split(',')[1],record=stock.find(r=>String(r.id)===id);
    assert(record,'库存榜对应原快照');
    const days=Number.isFinite(record.totalCoverage15)?record.totalCoverage15.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})+'天':'—';
    assert.equal(await row.locator('td').nth(index).locator('em').innerText(),'总可售天数 '+days);
   }
  }
  assert(await table.getByText('属性',{exact:true}).count());assert(await table.locator('.rp-product-tag').count());
  await page.screenshot({path:fileURLToPath(new URL('../../outputs/stock-drawer-'+kind+'.png',import.meta.url))});
  await table.evaluate(el=>el.scrollLeft=el.scrollWidth);
  await page.screenshot({path:fileURLToPath(new URL('../../outputs/stock-drawer-right-'+kind+'.png',import.meta.url))});
  await page.locator('#close').click();
 }
}
