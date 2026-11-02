import assert from 'node:assert/strict';
export async function verifyZoomCategoryClicks(page,all){
 const zoom=page.locator('.kpm-chart-zoom'),model=()=>page.evaluate(()=>window.dashboardKeyProductZoomSnapshot());
 const tag=(key,value)=>zoom.locator(`[data-kpm-zoom-scope-filter="${key}"][data-kpm-scope-value="${value}"]`);
 const selected=v=>Array.isArray(v)?v:v==='all'?[]:[v];
 const checkCounts=async()=>{
  const {filters}=await model();
  for(const key of ['category','season'])for(const button of await zoom.locator(`[data-kpm-zoom-scope-filter="${key}"]`).all()){
   const value=await button.getAttribute('data-kpm-scope-value'),other=key==='category'?'season':'category',chosen=selected(filters[other]);
   assert.equal(await button.locator('span').innerText(),String(all.filter(p=>(!chosen.length||chosen.includes(p[other]))&&(value==='all'||p[key]===value)).length),'数量忽略本组选择');
  }
 };
 assert.equal(await zoom.locator('[data-kpm-zoom-filter="category"],[data-kpm-zoom-filter="season"]').count(),0,'类目、季品不再使用下拉框');
 await checkCounts();
 for(const key of ['category','season']){
  const values=[...new Set(all.map(p=>p[key]))].slice(0,2);
  await tag(key,values[0]).click();await tag(key,values[1]).click();
  assert.deepEqual(selected((await model()).filters[key]),values,'标签多选');
  assert.deepEqual((await model()).rows.map(p=>p.spuId).sort(),all.filter(p=>values.includes(p[key])).map(p=>p.spuId).sort());await checkCounts();
  await tag(key,values[0]).click();await tag(key,values[1]).click();assert.equal((await model()).filters[key],'all','取消最后一项恢复全部');
  await tag(key,values[0]).click();await tag(key,'all').click();assert.equal((await model()).rows.length,all.length);
  const before=(await model()).filters;await tag(key,'all').focus();await page.keyboard.press('ArrowRight');assert.deepEqual((await model()).filters,before,'方向键只移动焦点');
  await page.keyboard.press('Enter');assert.notDeepEqual((await model()).filters,before);await tag(key,'all').click();
 }
 const row=all[0];await tag('category',row.category).click();await tag('season',row.season).click();await checkCounts();
 assert.deepEqual((await model()).rows.map(p=>p.spuId).sort(),all.filter(p=>p.category===row.category&&p.season===row.season).map(p=>p.spuId).sort(),'不同标签组取交集');
 await zoom.locator('[data-kpm-zoom-reset]').click();
 const styles=await zoom.locator('[data-kpm-zoom-scope-filter="category"][data-kpm-scope-value="all"]').evaluate(e=>{
  const source=document.querySelector('.kpm-scope-tabs:not(.kpm-zoom-scope-tabs) button.active'),read=n=>{const s=getComputedStyle(n);return [s.backgroundColor,s.color,s.borderRadius,s.fontSize]};return [read(e),read(source)];
 });assert.deepEqual(styles[0],styles[1],'放大图复用既有标签样式');
}
