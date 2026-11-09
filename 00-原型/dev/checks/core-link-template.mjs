import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectImportWorkbook,fillImportWorkbook,cleanTemplateHeader} from './import-template-workbook.mjs';

export async function coreLinkTemplate(page){
 const storage='dashboard-core-links-v1',original=await page.evaluate(key=>localStorage.getItem(key),storage);
 const audit=()=>page.evaluate(()=>coreLinkConfigSnapshot());
 try{
  await page.evaluate(()=>location.hash='#system-core-links');
  const before=await audit(),known=before.rows.find(row=>row.spuId),month=known.monitorMonth.replace('-','/');
  const pending=page.waitForEvent('download');await page.locator('#klc-template').click();
  const buffer=fs.readFileSync(await(await pending).path()),book=inspectImportWorkbook(buffer),headers=book.rows[0].values.map(cleanTemplateHeader);
  assert.deepEqual(headers,['月份','商品链接名称','链接ID','店铺名称','店铺ID']);
  assert.deepEqual(book.rows[0].values.filter(value=>value.startsWith('*')).map(cleanTemplateHeader),['月份','链接ID','店铺ID']);
  const upload=async values=>{
   await page.locator('#klc-file').setInputFiles({name:'拼多多五列.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:fillImportWorkbook(buffer,1,values)});

  };
  await page.locator('#klc-import').click();
  for(const values of [[month,'链接名称','123','店铺名称', '不存在的店铺ID'],[month.replace('/','-'),'链接名称','123','店铺名称',known.shopId],[month,'链接名称','','店铺名称',known.shopId]]){
   await upload(values);await page.locator('#klc-confirm-import').click();await page.locator('.ui-import-feedback button').waitFor();assert.equal((await audit()).revision,before.revision);
  }
  // 名称用于展示，ID负责定位；重命名链接不会改变已有产品关联。
  await upload([month,'恢复模板后的商品链接名称',known.linkId,'店铺展示名称',known.shopId]);
  await page.locator('#klc-confirm-import').click();await page.locator('#klc-import-dialog').waitFor({state:'hidden'});
  let saved=(await audit()).rows.find(row=>row.shopId===known.shopId&&row.linkId===known.linkId);
  assert.equal(saved.name,'恢复模板后的商品链接名称');assert.equal(saved.spuId,known.spuId);
  const longId='799999900123456789012345678901';
  await page.locator('#klc-import').click();await upload([month,'新增商品链接名称',longId,'店铺展示名称',known.shopId]);
  await page.locator('#klc-confirm-import').click();await page.locator('#klc-import-dialog').waitFor({state:'hidden'});
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
  saved=(await audit()).rows.find(row=>row.shopId===known.shopId&&row.linkId===longId);
  assert.equal(saved.linkId,longId,'长链接ID精度不丢失');assert.equal(saved.name,'新增商品链接名称');assert.equal(saved.monitorMonth,known.monitorMonth);
 }finally{
  await page.evaluate(({storage,original})=>original===null?localStorage.removeItem(storage):localStorage.setItem(storage,original),{storage,original});
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 }
 console.log('通过：拼多多五列模板、表头顺序与红星、下载件直接导入、错误拒绝、ID匹配、关联保留及长ID持久化。');
}
