import assert from 'node:assert/strict';
export async function shopStatistics(page){
 await page.locator('#riskrail [data-risk="1"]').click();
 const check=page.locator('[data-rp-filter="qualityOnly"]'),table=page.locator('.rp-shop-table');
 assert(await check.isChecked());
 assert.equal(await page.locator('[data-rp-filter="deviationOnly"]').count(),0);
 const snapshot=()=>table.evaluate(el=>{
  const indices=Object.fromEntries([...el.querySelectorAll('[data-rp-sort]')].map(b=>[b.dataset.rpSort,b.closest('th').cellIndex]));
  return [...el.querySelectorAll('tbody tr')].map(row=>Object.fromEntries(Object.entries(indices).map(([key,index])=>[key,row.cells[index].innerText])));
 });
 const quality=await snapshot();
 await check.uncheck();const all=await snapshot();
 assert.equal(all.length,quality.length);
 for(const key of ['violations','fine','frozen','offShelf','drop','limited'])assert(all.some((r,i)=>r[key]!==quality[i][key]),key+'切换应改变显示数据');
 for(const key of ['gsv','netSales','problemSpus','score','productScore','logisticsScore','serviceScore'])assert.deepEqual(all.map(r=>r[key]),quality.map(r=>r[key]),key+'不受统计口径影响');
 await table.locator('[data-rp-sort="fine"]').click();
 const amounts=(await snapshot()).map(r=>{const text=r.fine.split('\n')[0];return parseFloat(text.replaceAll(',',''))*(text.includes('w')?10000:1)});
 assert.deepEqual(amounts,[...amounts].sort((a,b)=>b-a));
 await page.locator('[data-drawer-tab="ranking-0"]').click();
 assert(await check.isChecked(),'两个榜单独立保存统计口径');
 await page.locator('[data-drawer-tab="ranking-1"]').click();assert.equal(await check.isChecked(),false);
 await page.locator('[data-rp-reset]').click();assert(await check.isChecked());assert.deepEqual(await snapshot(),quality);
 await page.locator('#close').click();
}
