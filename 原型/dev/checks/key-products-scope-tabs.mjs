import {clearKeyProductFilters} from './key-products-default-filters.mjs';
import assert from 'node:assert/strict';
export async function verifyKeyProductScopeTabs(page){
 const root=page.locator('#matrix'),snapshot=()=>page.evaluate(()=>dashboardKeyProductsSnapshot()),reset=()=>clearKeyProductFilters(page);
 const tab=(key,value)=>root.locator(`[data-kpm-scope-filter="${key}"][data-kpm-scope-value="${value}"]`);
 const chosen=value=>Array.isArray(value)?value:value==='all'?[]:[value];
 await reset();const base=(await snapshot()).rows;
 assert.equal(await root.locator('.kpm-tools [data-kpm-filter="category"],.kpm-tools [data-kpm-filter="season"]').count(),0);
 assert.equal(await root.locator('.kpm-scope-tabs+.matrixlayout').count(),1);
 const counts=async()=>{
  const {filters}=await snapshot();
  for(const key of ['season','category'])for(const button of await root.locator(`[data-kpm-scope-filter="${key}"]`).all()){
   const value=await button.getAttribute('data-kpm-scope-value');
   const other=key==='season'?'category':'season',selected=chosen(filters[other]),brands=chosen(filters.brand);
   const expected=base.filter(row=>(!brands.length||brands.includes(row.brand))&&(!selected.length||selected.includes(row[other]))&&(value==='all'||row[key]===value));
   assert.equal(await button.locator('span').innerText(),String(expected.length),'分组数量忽略自身选择');
  }
 };
 await counts();
 for(const key of ['category','season']){
  const values=[...new Set(base.map(row=>row[key]))].slice(0,2);await tab(key,values[0]).click();await tab(key,values[1]).click();
  assert.deepEqual(chosen((await snapshot()).filters[key]),values);
  assert.deepEqual((await snapshot()).visible.map(row=>row.spuId).sort(),base.filter(row=>values.includes(row[key])).map(row=>row.spuId).sort());await counts();
  await tab(key,values[0]).click();await tab(key,values[1]).click();assert.equal((await snapshot()).filters[key],'all');assert.equal(await tab(key,'all').getAttribute('aria-pressed'),'true');
 }
 const sample=base[0];await root.locator('[data-kpm-filter="brand"]').selectOption(sample.brand,{force:true});await tab('category',sample.category).click();await tab('season',sample.season).click();
 assert.deepEqual((await snapshot()).visible.map(row=>row.spuId).sort(),base.filter(row=>row.brand===sample.brand&&row.category===sample.category&&row.season===sample.season).map(row=>row.spuId).sort());await counts();
 const before=(await snapshot()).filters;await tab('category','all').focus();await page.keyboard.press('ArrowRight');assert.deepEqual((await snapshot()).filters,before,'方向键仅移动多选焦点');await page.keyboard.press('Enter');assert.notDeepEqual((await snapshot()).filters,before);
 await reset();
 for(const width of [1920,1440,1024,390]){await page.setViewportSize({width,height:1080});assert(await root.locator('.kpm-scope-tabs').evaluate(e=>e.scrollWidth<=e.clientWidth+1));assert(await root.locator('.kpm-scope-tabs').evaluate(e=>e.getBoundingClientRect().bottom<=document.querySelector('#matrix .kpm-sidebar').getBoundingClientRect().top));}
 await page.setViewportSize({width:1920,height:1080});
}
