import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
function cycleCases(){
 const c=vm.createContext({});vm.runInContext(readFileSync(new URL('../../src/modules/risk-presentation/03-sort.js',import.meta.url),'utf8'),c);
 for(const direction of ['asc','desc']){
  const defaults={key:'primary',direction},state={...defaults};
  c.rpSortCycle(state,'primary',defaults);assert.notEqual(state.direction,direction);c.rpSortCycle(state,'primary',defaults);assert.deepEqual(state,defaults);
  for(let i=0;i<3;i++)c.rpSortCycle(state,'other',defaults);assert.deepEqual(state,defaults,'其他列第三次恢复默认');assert.deepEqual(defaults,{key:'primary',direction});
 }
 const values=[{v:null},{v:0},{v:-3},{v:5},{v:5}];
 for(const direction of ['asc','desc']){const rows=Array.from(c.rpSortRows(values,{key:'v',direction},r=>r.v));assert.equal(rows.at(-1).v,null);assert.equal(rows.filter(r=>r.v===0).length,1);}
}
async function assertDefault(table,key,direction,cycle=false){
 const header=table.locator('[data-rp-sort="'+key+'"]');
 assert.equal(await header.getAttribute('data-direction'),direction,key+'默认箭头');
 assert.equal(await header.locator('..').getAttribute('aria-sort'),direction==='asc'?'ascending':'descending');
 assert.equal(await table.locator('[data-rp-sort][data-direction]:not([data-direction=""])').count(),1,'只显示一个默认指标');
 if(!cycle)return;
 const original=await table.locator('tbody tr').allTextContents();
 await header.click();await header.click();assert.equal(await header.getAttribute('data-direction'),direction);
 const other=table.locator('[data-rp-sort]:not([data-rp-sort="'+key+'"])').first();
 if(await other.count()){for(let i=0;i<3;i++)await other.click();assert.equal(await header.getAttribute('data-direction'),direction);assert.deepEqual(await table.locator('tbody tr').allTextContents(),original,'恢复默认也恢复实际行顺序');}
}
async function ascending(table,key,direction){
 // 根据排序表头定位列，读取实际数量，忽略门槛/进度等辅助文案。
 const index=await table.locator('[data-rp-sort="'+key+'"]').evaluate(button=>{let index=0;for(let cell=button.closest('th').previousElementSibling;cell;cell=cell.previousElementSibling)index+=cell.colSpan;return index});
 const values=await table.locator('tbody tr:not(.scp-material-total-row)').evaluateAll((rows,i)=>rows.map(row=>{const cell=row.cells[i];return Number((cell.querySelector('.scp-count')||cell).textContent.replaceAll(',',''))}),index);
 assert(values.every(Number.isFinite),'数量可解析');
 assert(values.every((v,i)=>!i||(direction==='asc'?values[i-1]<=v:values[i-1]>=v)),'实际数据符合 '+direction);
}
export async function defaultSorts(page){
 cycleCases();await page.locator('a[href="#suppliers"]').click();
 const scope=selector=>page.locator('#suppliers '+selector);
 await assertDefault(scope('.scp-project-table'),'admitted','asc',true);await ascending(scope('.scp-project-table'),'admitted','asc');
 await assertDefault(scope('.scp-category-table'),'admitted','asc',true);await ascending(scope('.scp-category-table'),'admitted','asc');
 await scope('[data-scp-material-view]').first().click();const material=page.locator('.scp-material-detail-table'),materialOrder=await material.locator('tbody tr').allTextContents();for(let i=0;i<3;i++)await material.locator('[data-rp-sort="电机"]').click();assert.deepEqual(await material.locator('tbody tr').allTextContents(),materialOrder,'核心物料明细恢复目录顺序');await page.locator('#close').click();
 assert.equal(await scope('.scp-resource-table').count(),1);
 await scope('[data-scp-all-categories]').click();await assertDefault(page.locator('.scp-category-list-table'),'admitted','asc',true);await page.locator('#close').click();
 await page.locator('#riskrail [data-risk="0"]').click();
 for(const kind of [0,1,2,3,4,6]){
  await page.locator('[data-drawer-tab="ranking-'+kind+'"]').click();
  if(kind===2||kind===4){await assertDefault(page.locator('.rp-list-table'),kind===2?'loss':'coverage15',kind===2?'asc':'desc',true);}
  else{
   assert.equal(await page.locator('[data-rp-default-order]').count(),0);const original=await page.locator('.rp-list-table tbody tr').allTextContents();
   const header=page.locator('.rp-list-table [data-rp-sort]').first();await header.click();await header.click();await header.click();assert.deepEqual(await page.locator('.rp-list-table tbody tr').allTextContents(),original,'复合业务顺序保持');
  }
 }
 // 呆滞预警卡片和完整榜单使用同一可售天数次序。
 await page.locator('[data-drawer-tab="ranking-4"]').click();
 const stale=page.locator('.rp-list-table'),index=await stale.locator('[data-rp-sort="coverage15"]').evaluate(e=>e.closest('th').cellIndex);
 const amounts=await stale.locator('tbody tr').evaluateAll((rows,i)=>rows.map(row=>{const text=row.cells[i].querySelector('strong').textContent;return Number(text.replace(/[^0-9.+-]/g,''))*(text.includes('w')?10000:1)}),index);assert(amounts.every((n,i)=>!i||amounts[i-1]>=n));
 await page.locator('[data-drawer-tab="ranking-1"]').click();await page.locator('.rp-list-table button').filter({hasText:'查看详情'}).first().click();await assertDefault(page.locator('[data-sd-spu-table]'),'gsvCents','desc',true);await page.locator('.drawer-back').click();
 await page.locator('[data-drawer-tab="ranking-2"]').click();await page.locator('.rp-list-table button').filter({hasText:'查看详情'}).first().click();await page.locator('[data-drawer-tab="stock"]').click();await assertDefault(page.locator('#up-stock-skus'),'totalUnits','desc',true);await page.locator('#close').click();
 // Close any restored parent ranking before opening the cost section.
 if(await page.locator('#overlay').isVisible())await page.locator('#close').click();
 await page.locator('a[href="#cost"]').click();const cost=page.locator('#costtable');assert.equal(await cost.locator('.rp-business-default').count(),0);
 const original=await cost.locator('tbody tr').allTextContents(),button=cost.locator('[data-cc-sort]').first();for(let i=0;i<3;i++)await button.click();assert.deepEqual(await cost.locator('tbody tr').allTextContents(),original);assert.equal(await cost.locator('.rp-business-default').count(),0);
 await cost.locator('[data-cc-department],[data-cc-category]').first().click();assert.equal(await page.locator('.cc-department-table .rp-business-default').count(),0);await page.locator('#close').click();
 console.log('通过：全局默认列与箭头、三态恢复、缺失/零/负数、业务配置顺序及详情/列表独立状态');
}
