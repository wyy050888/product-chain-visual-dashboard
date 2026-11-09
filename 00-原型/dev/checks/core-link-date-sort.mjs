import assert from 'node:assert/strict';

export async function coreLinkDateSort(page){
 const key='dashboard-core-links-v1',before=await page.evaluate(key=>localStorage.getItem(key),key);
 const ready=async()=>{await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await page.evaluate(()=>location.hash='#system-core-links');await page.locator('#klc-import').waitFor()};
 try{
  await ready();const snapshot=await page.evaluate(()=>coreLinkConfigSnapshot()),base=snapshot.rows[0];assert(base);
  const records=Array.from({length:24},(_,i)=>({shopId:base.shopId,linkId:String(880000000+i),versions:[{...base,from:'2025-01-01',to:null,name:'链接排序-'+String(i).padStart(2,'0'),updatedAt:i===23?'':i===0?'2026/11/09 08:00:00':`2026-11-${String(i).padStart(2,'0')}T01:00:00Z`}]}));
  await page.evaluate(({key,snapshot,records})=>localStorage.setItem(key,JSON.stringify({version:1,revision:snapshot.revision+1,records})),{key,snapshot,records});await ready();
  const unchanged=await page.evaluate(key=>localStorage.getItem(key),key),button=page.locator('#klc-page [data-rp-sort="updatedAt"]');
  const times=records.map(record=>{const value=record.versions[0].updatedAt;return {id:record.linkId,time:value.includes('/')?Date.parse(value.replaceAll('/','-').replace(' ','T')+'+08:00'):Date.parse(value)}});
  const check=async direction=>{
   const ordered=[...times].sort((a,b)=>Number.isFinite(a.time)!==Number.isFinite(b.time)?Number.isFinite(a.time)?-1:1:Number.isFinite(a.time)?direction==='desc'?b.time-a.time:a.time-b.time:0);
   const visible=await page.locator('#klc-body tr td:nth-child(2) small').allTextContents();assert.deepEqual(visible,ordered.slice(0,visible.length).map(row=>'ID：'+row.id));
   assert.equal(await button.getAttribute('data-direction'),direction);
  };
  await check('desc');await page.locator('#klc-pagination [aria-label="第2页"]').click();await button.click();await check('asc');await button.click();await check('desc');
  await page.locator('#klc-query').fill('链接排序');await check('desc');await button.click();await page.locator('#klc-reset').click();await check('desc');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),unchanged,'排序不修改核心链接数据');
 }finally{await page.evaluate(({key,before})=>before===null?localStorage.removeItem(key):localStorage.setItem(key,before),{key,before});await ready()}
 console.log('通过：核心链接默认更新时间倒序、双向排序、北京时间兼容、空时间置后、跨页与重置。');
}
