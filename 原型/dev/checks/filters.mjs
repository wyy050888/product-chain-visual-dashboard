import assert from 'node:assert/strict';

const menu=(page,key)=>page.locator('[data-rp-filter="'+key+'"]').locator('..');
async function choose(page,key,values){
 const field=menu(page,key);
 if(await field.getAttribute('open')===null)await field.locator('summary').click();
 await field.locator('input[value="all"]').check();
 for(const value of values)await field.locator('input').evaluateAll((inputs,v)=>inputs.find(i=>i.value===v).click(),value);
 await field.locator('summary').click();
}
const total=async page=>Number(await page.locator('#rp-list-pagination nav').getAttribute('data-list-total'));
export async function filters(page){
 await page.locator('#riskrail [data-risk="0"]').click();
 const baseline=await total(page),brands=await page.locator('[data-rp-filter="brand"]').evaluate(e=>[...e.options].slice(1,3).map(o=>o.value));
 // 品牌为互斥主数据，两个单选数量之和应等于多选并集。
 await choose(page,'brand',[brands[0]]);const a=await total(page);
 await choose(page,'brand',[brands[1]]);const b=await total(page);
 await choose(page,'brand',brands);assert.equal(await total(page),a+b);
 await choose(page,'chain',['环境类','健康类']);
 assert.ok(await total(page)<=a+b);
 const saved=await total(page);
 await page.locator('[data-drawer-tab="ranking-1"]').click();
 await page.locator('[data-drawer-tab="ranking-0"]').click();
 assert.equal(await total(page),saved);
 assert.deepEqual(await page.locator('[data-rp-filter="brand"]').evaluate(e=>[...e.selectedOptions].map(o=>o.value)),brands);
 await page.locator('[data-rp-reset]').click();assert.equal(await total(page),baseline);
 assert.equal(await menu(page,'brand').locator('.pf-multi-value').innerText(),'全部');
 // 类型筛选与品牌/类目多选仍使用不同控件。
 assert.equal(await page.locator('.pf-attribute').count(),1);
 await page.setViewportSize({width:390,height:844});
 for(const key of ['brand','chain']){
  const field=menu(page,key);await field.locator('summary').click();
  const bounds=await field.locator('.pf-multi-menu').boundingBox();
  assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390);
  await page.keyboard.press('Escape');assert.equal(await field.getAttribute('open'),null);
  assert.equal(await page.locator('#overlay').evaluate(e=>e.hidden),false);
 }
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.setViewportSize({width:1920,height:1080});await page.locator('#close').click();
}
