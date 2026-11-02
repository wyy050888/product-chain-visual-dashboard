import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// 排序比较器使用未格式化的原值；覆盖零值、负数、并列与缺失值。
function comparatorCases(){
 const context=vm.createContext({});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/03-sort.js',import.meta.url),'utf8'),context);
 const data=[{n:1.24,id:'a'},{n:null,id:'missing'},{n:1.21,id:'b'},{n:0,id:'zero'},{n:-8,id:'negative'},{n:1.24,id:'tie'}];
 const sort=direction=>Array.from(context.rpSortRows(data,{key:'n',direction},r=>r.n),r=>r.id);
 assert.deepEqual(sort('desc'),['a','tie','b','zero','negative','missing']);
 assert.deepEqual(sort('asc'),['negative','zero','b','a','tie','missing']);
 assert.equal(context.rpSortRows(data,{key:''},r=>r.n),data);
}
async function tableRows(page){
 return page.locator('.rp-list-table tbody tr').evaluateAll(rows=>rows.map(r=>[...r.cells].map(c=>c.innerText)));
}
async function allPages(page){
 const result=[];
 for(;;){
  result.push(...await tableRows(page));
  const next=page.locator('#rp-list-pagination [aria-label="下一页"]');
  if(await next.isDisabled())break;
  await next.click();
 }
 return result;
}
const numeric=text=>Number(text.split('\n')[0].replaceAll(',','').replace(/[^\d.+-]/g,''));
function ordered(rows,index,direction){
 const values=rows.map(r=>numeric(r[index]));
 for(let i=1;i<values.length;i++)assert.ok(direction==='desc'?values[i-1]>=values[i]:values[i-1]<=values[i],values.slice(i-1,i+1).join(','));
}

function removedFilterCases(){
 const context=vm.createContext({pfDefaults:()=>({}),pfSelected:()=>[],pfIncludes:()=>true,pfMatches:()=>true,rpProduct:r=>r,rpRankingGrade:()=>''});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/risk-presentation/03-filters.js',import.meta.url),'utf8'),context);
 const rows=[{name:'低于目标',returnRate:3,monthly:{target:8}},{name:'高于目标',returnRate:12,monthly:{target:8}},{name:'无目标',returnRate:5,monthly:{}}];
 const filters=context.rpDefaultFilters();
 assert.equal(Object.hasOwn(filters,'deviationOnly'),false);
 assert.deepEqual(Array.from(context.rpFilterRows(0,rows,{...filters,deviationOnly:true})),rows);
}

export async function riskSort(page){
 comparatorCases();
 await page.locator('#riskrail [data-risk="0"]').click();
 const check=page.getByRole('checkbox',{name:'仅展示退货率偏差产品'});
 assert.equal(await check.count(),0);
 assert.equal(await page.locator('[data-rp-filter="sort"],[data-rp-filter="returnPool"]').count(),0);
 const qualityCheck=page.getByRole('checkbox',{name:'展示品质违规统计'});
 assert.equal(await qualityCheck.isChecked(),true);
 const placement=await page.locator('.rp-quality-list-checks').evaluate(el=>({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,filtersBottom:document.querySelector('.rp-list-tools').getBoundingClientRect().bottom,tableTop:document.querySelector('#qr-list-table').getBoundingClientRect().top}));
 assert(placement.top>=placement.filtersBottom&&placement.bottom<=placement.tableTop,'勾选项应独立位于筛选与表格之间');
 const baseline=await allPages(page);
 const button=page.locator('#dialogbody [data-rp-sort="return"]');
 const index=await button.evaluate(b=>b.closest('th').cellIndex);
 await button.click();
 assert.equal(await page.locator('#rp-list-pagination .list-pagination').getAttribute('data-list-current'),'1');
 ordered(await allPages(page),index,'desc');
 await button.click();ordered(await allPages(page),index,'asc');
 await button.click();assert.deepEqual(await allPages(page),baseline);
 await qualityCheck.uncheck();
 const allCauses=await allPages(page);
 assert.equal(allCauses.length,baseline.length,'统计口径不改变入榜产品');
 for(const key of ['violations','frozen','offShelf']){
  const column=await page.locator('#dialogbody [data-rp-sort="'+key+'"]').evaluate(el=>el.closest('th').cellIndex);
  assert.ok(allCauses.some((row,i)=>row[column]!==baseline[i][column]),key+'应有非品质样例差异');
 }
 for(const key of ['gsv','return','received']){
  const column=await page.locator('#dialogbody [data-rp-sort="'+key+'"]').evaluate(el=>el.closest('th').cellIndex);
  assert.deepEqual(allCauses.map(row=>row[column]),baseline.map(row=>row[column]),key+'不受处罚口径影响');
 }
 // 旧筛选状态不能继续影响列表。
 removedFilterCases();
 await page.locator('#dialogbody [data-rp-sort="netSales"]').click();
 await page.locator('[data-drawer-tab="ranking-1"]').click();
 await page.locator('[data-drawer-tab="ranking-0"]').click();
 assert.equal(await check.count(),0);
 assert.equal(await qualityCheck.isChecked(),false);
 assert.equal(await page.locator('#dialogbody [data-rp-sort="netSales"]').getAttribute('data-direction'),'desc');
 await page.locator('[data-rp-reset]').click();
 assert.equal(await check.count(),0);
 assert.equal(await qualityCheck.isChecked(),true);
 assert.equal(await page.locator('#dialogbody .rp-sort-header[data-direction="desc"]').count(),0);
 assert.deepEqual(await allPages(page),baseline);
 for(const kind of [1,2,3,4,6]){
  await page.locator('[data-drawer-tab="ranking-'+kind+'"]').click();
  const original=await tableRows(page),sort=page.locator('#dialogbody [data-rp-sort]').first();
  if(!original.length){assert(await page.locator('.rp-list-table .empty').isVisible());continue}
  assert.ok(await page.locator('#dialogbody [data-rp-sort]').count()>=6);
  await sort.click();assert.equal(await sort.locator('..').getAttribute('aria-sort'),'descending');
  await sort.press('Enter');assert.equal(await sort.locator('..').getAttribute('aria-sort'),'ascending');
  await sort.press('Enter');assert.deepEqual(await tableRows(page),original);
  if(kind===1){
   await page.locator('#dialogbody .rp-platform-tools select').selectOption('拼多多',{force:true});
   await page.locator('#dialogbody [data-rp-sort="gsv"]').click();
   await page.locator('#dialogbody .rp-platform-tools select').selectOption('抖音',{force:true});
   assert.equal(await page.locator('#dialogbody [data-rp-sort="gsv"]').getAttribute('data-direction'),'desc');
  }
  if([3,4].includes(kind))assert.equal(await page.locator('#rp-dimensions,[data-ir-dimension]').count(),0);
 }
 await page.locator('#close').click();
}

// 删除偏差筛选后，保留处罚口径切换、排序及重置。
export async function riskQualityFilterRemoval(page){
 await page.locator('#riskrail [data-risk="0"]').click();
 const removed=page.locator('[data-rp-filter="deviationOnly"]');
 assert.equal(await removed.count(),0);
 const quality=page.getByRole('checkbox',{name:'展示品质违规统计'});
 assert.equal(await quality.isChecked(),true);
 removedFilterCases();
 const baseline=await allPages(page);
 assert.ok(baseline.length>0,'必须使用实际入榜数据验证');
 await quality.uncheck();
 assert.equal((await allPages(page)).length,baseline.length);
 await page.locator('#dialogbody [data-rp-sort="netSales"]').click();
 await page.locator('[data-drawer-tab="ranking-1"]').click();
 await page.locator('[data-drawer-tab="ranking-0"]').click();
 assert.equal(await removed.count(),0);
 assert.equal(await quality.isChecked(),false);
 assert.equal(await page.locator('#dialogbody [data-rp-sort="netSales"]').getAttribute('data-direction'),'desc');
 await page.locator('[data-rp-reset]').click();
 assert.equal(await removed.count(),0);
 assert.equal(await quality.isChecked(),true);
 await page.locator('#close').click();
}
