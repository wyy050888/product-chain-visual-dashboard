import assert from 'node:assert/strict';
export async function verifyInventoryGroupSort(page){
 const category=page.locator('#inventory .ip-group-panel[data-ip-dimension="category"]'),brand=page.locator('#inventory .ip-group-panel[data-ip-dimension="brand"]');
 const ids=panel=>panel.locator('tbody tr').evaluateAll(es=>es.map(e=>e.dataset.ipRow));
 const originalCategory=await ids(category),originalBrand=await ids(brand);
 assert(!(await brand.locator('h3').innerText()).includes('按我司可售货值排序'));
 for(const panel of [category,brand]){
  assert.equal(await panel.locator('[data-rp-sort]').count(),13);
  assert.equal(await panel.locator('thead .metric-help').count(),0,'指标表头无问号提示');
  assert(await panel.locator('thead').evaluate(e=>e.getBoundingClientRect().height<=49),'表头高度收紧');
  assert(await panel.locator('table').evaluate(e=>e.getBoundingClientRect().width<2100),'列宽收紧');
  const original=await ids(panel),keys=await panel.locator('[data-rp-sort]').evaluateAll(es=>es.map(e=>e.dataset.rpSort));
  assert.equal(await panel.locator('[data-rp-sort="warehouse"]').getAttribute('data-direction'),'desc','默认我司可售库存降序');
  const quantities=await panel.locator('[data-ip-metric="warehouse"]').evaluateAll(es=>es.map(e=>+e.dataset.value));assert(quantities.every((v,i)=>!i||quantities[i-1]>=v));
  for(const key of keys){
   const header=panel.locator('[data-rp-sort="'+key+'"]');
   for(const direction of (key==='warehouse'?['asc','desc']:['desc','asc',''])){
    await header.click();
    assert.equal(await header.getAttribute('data-direction'),direction);
    if(!direction)assert.equal(await panel.locator('[data-rp-sort="warehouse"]').getAttribute('data-direction'),'desc','恢复默认时还原库存降序箭头');
    assert.equal(await panel.locator('thead .metric-help').count(),0,'排序重绘不恢复问号提示');
    assert.equal(await header.locator('..').locator('..').getAttribute('aria-sort'),direction==='desc'?'descending':direction==='asc'?'ascending':'none');
    const rows=await panel.locator('tbody tr').evaluateAll((es,key)=>es.map(e=>({id:e.dataset.ipRow,value:e.querySelector('[data-ip-metric="'+key+'"]').dataset.value})),key);
    if(direction){const values=rows.filter(r=>r.value!=='').map(r=>+r.value);assert(values.every((v,i)=>!i||(direction==='desc'?values[i-1]>=v:values[i-1]<=v)),key+direction)}
    else assert.deepEqual(rows.map(r=>r.id),original,'恢复原顺序');
    assert.deepEqual([...rows.map(r=>r.id)].sort(),[...original].sort(),'固定五品牌成员不变');
   }
  }
 }
 await category.locator('[data-rp-sort="turn"]').click();assert.deepEqual(await ids(brand),originalBrand,'两表排序独立');
 await page.locator('#inventory>.sectionhead [data-ip-time-mode="quarter"]').click();assert.equal(await category.locator('[data-rp-sort="turn"]').getAttribute('data-direction'),'desc');
 const values=await category.locator('[data-ip-metric="turn"]').evaluateAll(es=>es.map(e=>+e.dataset.value));assert(values.every((v,i)=>!i||values[i-1]>=v),'日期重算后保留排序');
 const header=category.locator('[data-rp-sort="turn"]');await header.focus();await page.keyboard.press('Enter');assert.equal(await header.getAttribute('data-direction'),'asc');await page.keyboard.press('Enter');assert.deepEqual(await ids(category),originalCategory);
 await page.locator('#inventory>.sectionhead [data-ip-time-mode="month"]').click();
 await page.locator('#inventory .ip-group-scroll').evaluateAll(es=>es.forEach(e=>e.scrollLeft=0));
 console.log('通过：两表13指标降序/升序/恢复、独立状态、固定五品牌成员不变、日期继承及紧凑表头');
}
