import assert from 'node:assert/strict';

export async function verifyStrategicSupplierStages(page){
 const headers=['供应商编码','供应商名称','负责采购','注册日期','意向储备日期','准入储备日期','开始合作日期','淘汰日期'];
 const statuses=['已注册','意向储备','准入储备','合作中','已淘汰'];
 assert.deepEqual(await page.locator('#ssi-status option').allTextContents(),['全部',...statuses]);
 assert.deepEqual(await page.locator('#ssi-page .ssi-table th').allTextContents(),[...headers.slice(0,3),'供应商状态',...headers.slice(3)]);
 const upload=async rows=>{
  const csv=[headers,...rows].map(row=>row.map(value=>'"'+String(value??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
  await page.locator('#ssi-file').setInputFiles({name:'阶段名单.csv',mimeType:'text/csv',buffer:Buffer.from('\uFEFF'+csv)});
  await page.locator('#ssi-result .cec-import-summary').waitFor();
 };
 const record=(index,dates)=>['LIFE-SUP-'+index,'阶段供应商'+index,'测试采购',...dates];
 const rows=[
  record(0,['2026-01-01','','','','']),
  record(1,['2026-01-01','2026-02-01','','','']),
  record(2,['2026-01-01','2026-02-01','2026-03-01','','']),
  record(3,['2026-01-01','2026-02-01','2026-03-01','2026-04-01','']),
  record(4,['2026-01-01','2026-02-01','2026-03-01','2026-04-01','2026-05-01'])
 ];
 await page.locator('#ssi-import').click();
 for(const [dates,error] of [
  [['2026-03-01','2026-02-01','','',''],/不能早于注册日期/],
  [['2026-01-01','','2026-03-01','',''],/须先填写意向储备日期/],
  [['2026-01-01','','','2026-03-01',''],/须在准入储备日期/],
  [['2026-01-01','','','','2025-12-31'],/淘汰日期不能早于/],
  [['','','','',''],/至少填写一项/]
 ]){await upload([record('BAD',dates)]);assert.match(await page.locator('#ssi-result').innerText(),error);assert(await page.locator('#ssi-confirm').isDisabled())}
 await upload(rows);assert(await page.locator('#ssi-confirm').isEnabled());
 assert.deepEqual(await page.locator('#ssi-result .ssi-status').allTextContents(),statuses);
 await page.locator('#ssi-confirm').click();await page.locator('#ssi-query').fill('LIFE-SUP-');
 for(const status of statuses){
  await page.locator('#ssi-status').selectOption(status);
  assert.equal(await page.locator('#ssi-body tr[data-ssi-code]').count(),1);
  assert.equal(await page.locator('#ssi-body .ssi-status').innerText(),status);
 }
 await page.reload();await page.locator('#ssi-query').fill('LIFE-SUP-');
 assert.deepEqual(await page.locator('#ssi-body .ssi-status').allTextContents(),statuses,'五种状态刷新后保留');
 // 单纯注册不纳入资源池储备数量；已淘汰不计入当前有效资源。
 const registered=await page.evaluate(()=>supplierPlanningAudit().annual);
 await page.locator('#ssi-import').click();await upload([record('REGISTERED',['2026-01-01','','','',''])]);await page.locator('#ssi-confirm').click();
 assert.deepEqual(await page.evaluate(()=>supplierPlanningAudit().annual),registered);
 await page.locator('#ssi-reset').click();
 // 旧版本名单不含注册日期，升级不能清空已导入记录。
 const key='strategic-supplier-roster-v1',saved=await page.evaluate(key=>localStorage.getItem(key),key);
 try{
  await page.evaluate(key=>{const store=JSON.parse(localStorage.getItem(key));store.rows=store.rows.filter(row=>row.code==='TEST-SUP-1');delete store.rows[0].registered;localStorage.setItem(key,JSON.stringify(store))},key);
  await page.reload();await page.locator('#ssi-query').fill('TEST-SUP-1');assert.equal(await page.locator('#ssi-body .ssi-status').innerText(),'合作中');
  assert.equal(await page.evaluate(()=>strategicSupplierImportAudit().store.rows.length),1);
 }finally{await page.evaluate(({key,saved})=>localStorage.setItem(key,saved),{key,saved});await page.reload()}
}
