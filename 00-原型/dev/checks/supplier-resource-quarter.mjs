import assert from 'node:assert/strict';

export async function verifySupplierResourceQuarters(page,root,audit){
 const resource=root.locator('.scp-resource-card'),table=resource.locator('.scp-resource-table');
 const year=resource.locator('[data-scp-year]');
 const labels=()=>resource.locator('.scp-annual-primary>span').allTextContents();
 assert.deepEqual(await labels(),['已合作（总）']);
 assert.equal(await resource.locator('.scp-annual-group').count(),1,'只展示合作概览');
 assert.equal(await table.locator('thead th').count(),2);
 assert.equal(await table.locator('tfoot,.scp-rate,[data-rp-sort="rate"]').count(),0);
 assert(!/合计|达成率|%/.test(await table.innerText()),'季度表不展示合计与达成率');
 assert.deepEqual(await table.locator('thead [data-rp-sort]').evaluateAll(es=>es.map(e=>e.dataset.rpSort)),['quarter','newCooperation','target']);
 const annualBefore=await resource.locator('.scp-annual').innerText();
 const check=async()=>{
  const state=await audit(),quarters=state.quarters;
  const rows=await table.locator('tbody tr').evaluateAll(es=>es.map(e=>({quarter:+e.dataset.scpResourceQuarter,cells:[...e.cells].map(c=>c.textContent.trim().replace(/\s+/g,''))})));
  assert.equal(rows.length,4);
  for(const row of rows){
   const expected=quarters.find(q=>q.quarter===row.quarter),value=key=>expected.range.future?'—':String(expected[key]);
   assert.deepEqual(row.cells,['Q'+expected.quarter,value('newCooperation')+'/'+(expected.target===null?'—':String(expected.target))]);
  }
  return {quarters,rows};
 };
 await check();
 for(const key of ['quarter','newCooperation','target']){
  for(let i=0;i<3;i++){
   const button=table.locator('[data-rp-sort="'+key+'"]');await button.focus();await page.keyboard.press('Enter');
   assert(await button.evaluate(e=>e===document.activeElement),'排序后保留键盘焦点');
   const active=await table.locator('[data-direction="asc"],[data-direction="desc"]').evaluate(e=>({key:e.dataset.rpSort,direction:e.dataset.direction}));
   const {quarters,rows}=await check(),value=row=>row.range.future&&!['quarter','target'].includes(active.key)?null:row[active.key];
   const expected=[...quarters].sort((a,b)=>{
    const av=value(a),bv=value(b),validA=Number.isFinite(av),validB=Number.isFinite(bv);
    if(validA!==validB)return validA?-1:1;
    return (validA?(active.direction==='asc'?av-bv:bv-av):0)||a.quarter-b.quarter;
   });
   assert.deepEqual(rows.map(r=>r.quarter),expected.map(r=>r.quarter),'使用原值排序 '+key);
   assert.equal(await resource.locator('.scp-annual').innerText(),annualBefore,'排序不改变原卡片');
  }
 }
 for(const selected of ['2025','2027','2026']){await year.selectOption(selected);await check()}
 const quarter=table.locator('[data-rp-sort="quarter"]');
 if(await quarter.getAttribute('data-direction')!=='asc')await quarter.click();
 assert.deepEqual(await table.locator('tbody tr td:first-child').allTextContents(),['Q1','Q2','Q3','Q4']);
 for(const width of [1920,1366,1024,390]){
  await page.setViewportSize({width,height:1080});
  assert(await root.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'季度表不撑宽页面 '+width);
  const overview=await resource.locator('.scp-annual').boundingBox(),quarterTable=await resource.locator('.scp-resource-scroll').boundingBox();
  if(width>1100){assert(quarterTable.x>=overview.x+overview.width+20,'年度概览在左、季度表在右');assert(Math.abs(overview.y-quarterTable.y)<2&&Math.abs(overview.height-quarterTable.height)<2,'左右区域上下对齐')}
  else assert(quarterTable.y>=overview.y+overview.height,'窄屏改为上下排列');
  if(width===390)assert(await resource.locator('.scp-resource-scroll').evaluate(e=>e.scrollWidth>e.clientWidth),'窄屏只在表内横向滚动');
 }
 await page.setViewportSize({width:1920,height:1080});
 await resource.screenshot({path:'outputs/supplier-resource-quarters.png'});
}
