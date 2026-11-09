import assert from 'node:assert/strict';

export async function supplierDateSort(page){
 const storage='strategic-supplier-roster-v1',previous=await page.evaluate(key=>localStorage.getItem(key),storage);
 const ready=async()=>{await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await page.evaluate(()=>location.hash='#system-strategic-suppliers');await page.locator('#ssi-import').waitFor()};
 const audit=()=>page.evaluate(()=>strategicSupplierImportAudit());
 try{
  await ready();
  const rows=[],store=(await audit()).store;
  for(const tier of ['primary','secondary']){
    await page.locator('[data-ssi-tier="'+tier+'"]').click();await page.locator('#ssi-reset').click();
    const snapshot=await audit(),year=snapshot.year,base=snapshot.rows[0];assert(base);
    for(let i=1;i<=25;i++)rows.push({...base,tier,supplierId:'SORT-'+tier+'-'+i,name:'日期排序-'+tier+'-'+String(i).padStart(2,'0'),admitted:year+'-01-'+String(i).padStart(2,'0'),cooperation:tier==='secondary'&&i===24?'':year+'-02-'+String(26-i).padStart(2,'0'),actor:'排序验证',updatedAt:i===25?'':year+'-03-'+String(i).padStart(2,'0')+'T01:00:00Z'});
  }
  await page.evaluate(({storage,store,rows})=>localStorage.setItem(storage,JSON.stringify({...store,rows,revision:store.revision+1})),{storage,store,rows});
  await ready();const unchanged=await page.evaluate(key=>localStorage.getItem(key),storage);
  const expected=(rows,key,direction)=>[...rows].sort((a,b)=>{
   const av=Date.parse(a[key]),bv=Date.parse(b[key]);
   if(Number.isFinite(av)!==Number.isFinite(bv))return Number.isFinite(av)?-1:1;
   return Number.isFinite(av)?(direction==='asc'?av-bv:bv-av):a.name.localeCompare(b.name,'zh-CN');
  });
  for(const tier of ['primary','secondary']){
   await page.locator('[data-ssi-tier="'+tier+'"]').click();await page.locator('#ssi-reset').click();await page.locator('#ssi-query').fill('日期排序-'+tier);
   const headers=await page.locator('#ssi-head th').allTextContents();assert.deepEqual(headers.slice(-3),['更新人','更新时间','操作']);
   await page.waitForFunction(()=>document.querySelector('#ssi-page .ssi-table').classList.contains('ui-table-widths'));
   for(const scroll of [0,100000]){
    const layout=await page.locator('#ssi-page .cec-table-scroll').evaluate((host,scroll)=>{
     host.scrollLeft=scroll;const bounds=host.getBoundingClientRect();
     return ['name','actor','updatedAt','actions'].map(key=>{const cell=host.querySelector('thead [data-ssi-field="'+key+'"]'),rect=cell.getBoundingClientRect();return {key,position:getComputedStyle(cell).position,left:rect.left,right:rect.right,min:bounds.left,max:bounds.right}});
    },scroll);
    for(const cell of layout.filter(cell=>['name','actions'].includes(cell.key)))assert(cell.left>=cell.min-1&&cell.right<=cell.max+1,'名称和操作列保持可见');
    for(const cell of layout.filter(cell=>['actor','updatedAt'].includes(cell.key)))assert.notEqual(cell.position,'sticky','更新信息随表格滚动');
    assert(Math.abs(layout[0].left-layout[0].min)<2,'供应商名称固定左侧');
    assert(Math.abs(layout[3].right-layout[3].max)<2,'操作固定右侧');
   }
   await page.locator('#ssi-page .cec-table-scroll').evaluate(host=>host.scrollLeft=0);
   for(const [key,min] of [['cooperation',140],['categoryPath',300],['productCode',280],['productName',320],...(tier==='secondary'?[['cooperationMaterial',180]]:[])])assert((await page.locator('#ssi-head [data-ssi-field="'+key+'"]').boundingBox()).width>=min-1,'合作字段保持可读宽度');
   assert.deepEqual(await page.locator('#ssi-head [data-rp-sort]').evaluateAll(nodes=>nodes.map(node=>node.dataset.rpSort).sort()),(tier==='primary'?['cooperation','updatedAt']:['admitted','cooperation','updatedAt']).sort());
   const rows=(await audit()).rows;assert.equal(rows.length,25);
   const check=async(key,direction)=>{
    const result=await audit(),ordered=expected(rows,key,direction);assert.deepEqual(result.rows.map(row=>row.name),ordered.map(row=>row.name));
    assert.equal(await page.locator('#ssi-head [data-rp-sort="'+key+'"]').locator('..').getAttribute('aria-sort'),direction==='desc'?'descending':'ascending');
    const visible=await page.locator('#ssi-body tr td:first-child').allTextContents();assert.deepEqual(visible,ordered.slice(0,visible.length).map(row=>row.name));
   };
   await page.locator('#ssi-pagination .list-page-size').selectOption('10');await check('updatedAt','desc');
   await page.locator('#ssi-pagination [aria-label="第2页"]').click();await page.locator('#ssi-head [data-rp-sort="updatedAt"]').click();await check('updatedAt','asc');
   for(const key of tier==='primary'?['cooperation']:['admitted','cooperation']){
    const button=page.locator('#ssi-head [data-rp-sort="'+key+'"]');await button.click();await check(key,'desc');await button.click();await check(key,'asc');await button.click();await check('updatedAt','desc');
   }
   await page.locator('#ssi-head [data-rp-sort="updatedAt"]').click();await page.locator('#ssi-reset').click();assert.equal(await page.locator('#ssi-head [data-rp-sort="updatedAt"]').getAttribute('data-direction'),'desc');
  }
  await page.locator('#ssi-head [data-rp-sort="admitted"]').click();await page.locator('[data-ssi-tier="primary"]').click();assert.equal(await page.locator('#ssi-head [data-rp-sort="updatedAt"]').getAttribute('data-direction'),'desc');await page.locator('[data-ssi-tier="secondary"]').click();assert.equal(await page.locator('#ssi-head [data-rp-sort="admitted"]').getAttribute('data-direction'),'desc');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),storage),unchanged,'排序筛选不修改业务数据');
 }finally{await page.evaluate(({storage,previous})=>previous===null?localStorage.removeItem(storage):localStorage.setItem(storage,previous),{storage,previous});await ready()}
 console.log('通过：一级/二级默认更新时间倒序、日期双向排序、缺失置后、全量排序再分页、独立Tab及元数据。');
}
