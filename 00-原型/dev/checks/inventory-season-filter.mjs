import assert from 'node:assert/strict';
export async function verifyInventorySeasonFilter(page){
 const root=page.locator('#inventory'),control=root.locator('>.sectionhead .ip-season-filter'),tabs=control.locator('.ip-season-tabs');
 const get=()=>page.evaluate(()=>inventoryControlAudit()),initial=await get();
 await root.locator('[data-ip-stale-metric="units"]').click();
 const seasons=new Map((await page.evaluate(()=>dashboardKeyProductsSnapshot().rows)).map(row=>[row.spuId,row.season]));
 assert.equal(await control.locator('select[multiple][hidden]').count(),1,'保留公共季品多选取值协议');
 assert.equal(await control.locator('.pf-multi').count(),0,'取消下拉面板');
 assert.deepEqual(await tabs.locator('button').allTextContents(),['全部','夏季品','冬季品','四季品']);
 assert.equal(await tabs.locator('[data-ip-season="all"]').getAttribute('aria-pressed'),'true');
 assert(await control.evaluate(e=>{const h=e.parentElement.querySelector('h2').getBoundingClientRect(),b=e.getBoundingClientRect();return b.left>h.right&&Math.abs((b.top+b.bottom)-(h.top+h.bottom))<5}),'标题右侧对齐');
 const category=root.locator('.ip-group-panel[data-ip-dimension="category"]');
 await category.locator('[data-rp-sort="staleUnits"]').click();
 const choose=async value=>{await tabs.locator('[data-ip-season="'+value+'"]').click()};
 const verify=async selected=>{
  const data=await get(),expected=initial.stockRecords.filter(row=>!selected.length||selected.includes(seasons.get(row.spuId)));
  assert.deepEqual(data.season,selected);
  assert.deepEqual((await root.locator('.ip-group-panel[data-ip-dimension="brand"] tbody tr>td:first-child').allTextContents()).sort(),['苏泊尔','美的','创维','海尔','康佳'].sort(),'季品切换不改变固定品牌集合');
  assert.deepEqual(data.stockRecords.map(row=>row.spuId),expected.map(row=>row.spuId),'按主数据季品筛选SPU，同字段取并集');
  assert(expected.length>0&&(!selected.length||expected.length<initial.stockRecords.length));
  for(const key of ['warehouse','factory','totalUnits','goodsValueCents','staleUnits','staleValueCents','cost','avg','deliveryOn','deliveryDue']){
   const sum=expected.reduce((n,row)=>n+row[key],0);
   assert(Math.abs(data.stockTotal[key]-sum)<1e-5,'底层记录先筛选再汇总 '+key);
   for(const groups of [data.category,data.brand])assert(Math.abs(groups.reduce((n,row)=>n+row[key],0)-sum)<1e-5,'两表同源 '+key);
  }
  assert.equal(data.balance.totalUnits,expected.reduce((n,row)=>n+row.totalUnits,0),'总库存卡片随季品变化');
  assert.equal(data.overview.turn,data.stockTotal.turn);assert.equal(data.overview.refurb.total,data.stockTotal.refurb.total);
  assert.deepEqual(data.metricPeriod,initial.metricPeriod,'季品不重置日期');
  assert.equal(await category.locator('[data-rp-sort="staleUnits"]').getAttribute('data-direction'),'desc','季品不重置排序');
  assert.equal(await root.locator('[data-stock-card]').count(),8);
  const stockoutRows=initial.overview.stockout.rows.filter(row=>!selected.length||selected.includes(seasons.get(row.spuId)));
  assert.deepEqual(data.overview.stockout.rows,stockoutRows,'断货明细沿用外侧季品筛选');
  for(const row of data.overview.seasons)assert.equal(await root.locator('[data-stock-stale-season="'+row.label+'"]').innerText(),row.units.toLocaleString('en-US')+'件','呆滞分布随公共季品筛选汇总');
  assert.deepEqual(await tabs.locator('[aria-pressed="true"]').evaluateAll(nodes=>nodes.map(node=>node.dataset.ipSeason)),selected.length?selected:['all'],'分段选中态随筛选同步');
 };
 await choose('夏季品');await verify(['夏季品']);
 await choose('冬季品');await verify(['夏季品','冬季品']);
 await choose('夏季品');await verify(['冬季品']);
 await choose('all');await verify([]);assert.equal(await tabs.locator('[aria-pressed="true"]').innerText(),'全部');
 await choose('四季品');await verify(['四季品']);
 await root.locator('>.sectionhead [data-ip-time-mode="quarter"]').click();assert.deepEqual((await get()).season,['四季品'],'切换期间保留季品');
 for(const width of [1920,1024,390]){
  await page.setViewportSize({width,height:1080});
  assert(await tabs.evaluate(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth+1&&e.scrollWidth<=e.clientWidth+1}),'季品标签不越界 '+width);
  assert(await root.locator('>.sectionhead').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'标题和时间控件不溢出 '+width);
  if(width!==1024)await control.screenshot({path:'outputs/inventory-season-tabs-'+width+'.png'});
 }
 await page.setViewportSize({width:1920,height:1080});await choose('all');
 await tabs.locator('[data-ip-season="all"]').focus();await page.keyboard.press('End');await page.keyboard.press('Enter');assert.deepEqual((await get()).season,['四季品'],'分段标签支持键盘选择');await choose('all');
 await root.locator('>.sectionhead [data-ip-time-mode="month"]').click();
 await category.locator('[data-rp-sort="staleUnits"]').click();await category.locator('[data-rp-sort="staleUnits"]').click();
 assert.deepEqual((await get()).balance,initial.balance,'全部产品还原库存卡片');
 await root.locator('[data-ip-stale-metric="valueCents"]').click();
 console.log('通过：库存季品多选及键盘、断货明细与库存指标同步、期间排序保留及窄屏');
}
