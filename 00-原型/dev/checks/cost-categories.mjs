import assert from 'node:assert/strict';

export async function verifyCostCategories(page){
 const names=['产品降本','包装降本','物流降本','罚款收入','风控收入','客服收入'];
 const audit=period=>page.evaluate(p=>costControlAudit(p),period);
 for(const period of [{year:2026,mode:'month',value:10},{year:2026,mode:'quarter',value:3},{year:2025,mode:'year',value:1},{year:2026,mode:'month',value:11}]){
  const a=await audit(period);assert.deepEqual(a.categories.map(c=>c.name),names);
  assert(a.metrics.every(m=>a.categories.some(c=>c.id===m.category)));
  assert(a.metrics.filter(m=>m.department==='risk').every(m=>m.category==='risk'));
  assert(a.metrics.filter(m=>m.department==='user').every(m=>m.category==='service'));
  for(const [mode,total] of Object.entries(a.totals))for(const key of ['target','actual','gap']){
   const sum=rows=>{const known=rows.map(row=>row.values[mode][key]).filter(Number.isFinite);return known.length?known.reduce((n,v)=>n+v,0):null};
   assert.equal(sum(a.rows),total[key]);if(key==='actual')assert.equal(sum(a.categoryRows),total[key],'分类实际与总额守恒至分 '+mode);else assert(a.categoryRows.every(row=>!Object.hasOwn(row.values[mode],key)),'分类不派生目标或差额');
  }
 }
 await page.locator('a[href="#cost"]').click();
 const cards=await page.locator('#costcards').innerText();
 await page.locator('[data-cc-view="category"]').click();
 assert.deepEqual(await page.locator('#costtable tbody .cc-row-name').allTextContents(),names);assert.equal(await page.locator('#costtable th').count(),5);assert.doesNotMatch(await page.locator('#costtable thead').innerText(),/目标|达成|差额/);
 assert.equal(await page.locator('#costcards').innerText(),cards,'切换维度不改变总览金额');
 await page.locator('[data-cc-category="packaging"]').click();
 assert.deepEqual(await page.locator('#drawer-tabs button').allTextContents(),names);
 assert.equal(await page.locator('.cc-department-table tbody .cc-row-name').innerText(),'包材降本');
 assert.equal(await page.locator('.cc-department-table tbody [data-cc-context]').innerText(),'仓储部');assert.equal(await page.locator('.cc-department-table th').count(),5);assert.doesNotMatch(await page.locator('.cc-department-table').innerText(),/目标|达成|差额/);
 await page.locator('#drawer-tabs [data-drawer-tab="risk"]').click();
 assert.equal(await page.locator('.cc-department-table tbody tr').count(),7);
 await page.locator('#close').click();
 await page.locator('#costtable [data-cc-sort="month-actual"]').click();
 const a=await audit(),expected=[...a.categoryRows].sort((x,y)=>(y.values.month.actual??-Infinity)-(x.values.month.actual??-Infinity)).map(row=>row.id);
 assert.deepEqual(await page.locator('#costtable tbody tr').evaluateAll(es=>es.map(e=>e.dataset.ccRow)),expected);
 await page.locator('[data-cc-view="department"]').click();
 assert.deepEqual(await page.locator('#costtable tbody .cc-row-name').allTextContents(),a.departments.map(d=>d.name));
 assert.equal(await page.locator('#costcards').innerText(),cards);
 console.log('通过：六类/九部门金额守恒、确认归类、分类明细含部门、独立排序及切换不改总额');
}
