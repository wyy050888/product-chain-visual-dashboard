import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {inspectImportWorkbook,fillImportWorkbook,importTemplateHeader} from './import-template-workbook.mjs';

export async function uploadExperience(page){
 const historyKey='dashboard-import-history-v1',keys=[historyKey,'dashboard-core-links-v1','strategic-supplier-roster-v1','cost-efficiency-config-v1','lifecycle-quarter-targets-v1','dashboard.global-manual-tasks.v1','procurement-cost-import-v1'];
 const before=await page.evaluate(keys=>keys.map(key=>localStorage.getItem(key)),keys);
 const csv=rows=>Buffer.from(rows.map(row=>row.map(value=>'"'+String(value??'').replaceAll('"','""')+'"').join(',')).join('\r\n'));
 const recordCount=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'[]').length,historyKey);
 const waitIdle=dialog=>page.waitForFunction(id=>!document.querySelector(id)?.hasAttribute('aria-busy'),dialog);
 const shell=async selector=>{
  const dialog=page.locator(selector);await dialog.locator('.ui-upload-zone').waitFor();
  assert.equal(await dialog.locator('input[type=file]').count(),1,'每次导入只有一个文件入口');
  assert.equal(await dialog.locator('input[type=file]').getAttribute('multiple'),null);
  assert.equal(await dialog.locator('.ui-import-template').count(),1);
  for(const width of[1920,390]){await page.setViewportSize({width,height:1080});const box=await dialog.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1&&Math.abs(box.x+box.width/2-width/2)<2)}
  await page.setViewportSize({width:1920,height:1080});return dialog;
 };
 const scenarios=[
  {route:'#system-lifecycle-targets',open:'[data-lt-import]',dialog:'#lt-import-dialog',button:'#lt-import-confirm',close:'[data-lt-import-close]',module:'生命周期目标'},
  {route:'#system-cost-efficiency',open:'#cec-import',dialog:'#cec-import-dialog',button:'#cec-confirm-import',close:'[data-cec-import-close]',module:'降本目标与实际'},
  {route:'#system-strategic-suppliers',open:'#ssi-import',dialog:'#ssi-import-dialog',button:'#ssi-confirm',close:'[data-ssi-close]',module:'供应商名单'},
  {route:'#system-core-links',open:'#klc-import',dialog:'#klc-import-dialog',button:'#klc-confirm-import',close:'[data-klc-close]',module:'核心链接'},
  {route:'#ai',open:'[data-gd-task-import]',dialog:'.gd-task-entry-dialog',button:'[data-gd-task-confirm]',close:'[data-gd-entry-close]',module:'任务'},
 ];
 try{
  await page.evaluate(key=>localStorage.removeItem(key),historyKey);await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
  for(const config of scenarios){
   await page.evaluate(hash=>location.hash=hash,config.route);if(config.module==='任务')await page.locator('#ai [data-gd-part="tasks"]').click();
   await page.locator(config.open).click();const dialog=await shell(config.dialog),input=dialog.locator('input[type=file]'),confirm=dialog.locator(config.button);
   const n=await recordCount();
   await input.setInputFiles({name:config.module+'-错误.csv',mimeType:'text/csv',buffer:csv([['错误表头'],['原始错误内容']])});
   assert.equal(await recordCount(),n,'选文件不校验、不生成批次');assert(await confirm.isEnabled());
   if(config.module==='核心链接')await dialog.screenshot({path:fileURLToPath(new URL('../../outputs/统一导入-单文件.png',import.meta.url))});
   assert.equal(await dialog.locator('.ui-upload-zone .ui-upload-file').count(),1);assert(await dialog.locator('.ui-upload-content').isHidden());
   assert.equal(await dialog.locator('table,input[type=checkbox]').count(),0,'没有预览、覆盖勾选');
   await confirm.click();await waitIdle(config.dialog);assert.match(await dialog.locator('.ui-import-feedback').innerText(),/导入失败，未保存数据/);
   const entry=await page.evaluate(key=>JSON.parse(localStorage.getItem(key))[0],historyKey);assert.equal(entry.totalRows,1);assert.equal(entry.successCount,0);assert.equal(entry.failureCount,1);assert.equal(entry.failedRows[0].row,2);assert.equal(entry.failedRows[0].values[0],'原始错误内容');
   await dialog.locator('.ui-import-feedback button').click();const history=page.locator('#ui-import-history');assert.match(await history.innerText(),/失败明细/);assert.deepEqual(await history.locator('th').allTextContents(),['原始行号','错误表头','失败原因']);
   const dl=page.waitForEvent('download');await history.locator('[data-ui-history-errors]').click();const download=await dl;assert.match(download.suggestedFilename(),/失败数据/);assert.match(fs.readFileSync(await download.path(),'utf8'),/原始错误内容/);
   if(config.module==='核心链接')await history.screenshot({path:fileURLToPath(new URL('../../outputs/统一导入-失败明细.png',import.meta.url))});
   await history.locator('[data-ui-history-back]').click();if(config.module==='核心链接')await history.screenshot({path:fileURLToPath(new URL('../../outputs/统一导入-记录.png',import.meta.url))});assert.deepEqual(await history.locator('th').allTextContents(),['导入时间','文件名','操作人','总行数','成功数','失败数','状态','备注','操作']);await history.locator('[data-ui-history-close]').first().click();
   await dialog.getByRole('button',{name:'移除 '+config.module+'-错误.csv',exact:true}).click();assert(await confirm.isDisabled());assert.equal(await dialog.locator('.ui-import-feedback').innerText(),'');assert(await dialog.locator('.ui-upload-content').isVisible());
   let file;
   if(config.module==='核心链接'){
    const row=await page.evaluate(()=>coreLinkConfigSnapshot().rows[0]);file={name:'核心成功.csv',mimeType:'text/csv',buffer:csv([['月份','商品链接名称','链接ID','店铺名称','店铺ID'],['2026/10','单文件导入成功',row.linkId,'名称',row.shopId]])};
   }else if(config.module==='任务')file={name:'任务成功.csv',mimeType:'text/csv',buffer:csv([['业务对象类型','业务对象ID','事项名称','优先级','问题描述','执行事项','负责人','计划完成日期'],['','','统一导入回归-'+Date.now(),'P2','检查单文件','完成确认导入','林悦','2026/11/04']])};
   else{
    const pending=page.waitForEvent('download');await dialog.locator('.ui-import-template button:not([data-ui-import-history])').click();const buffer=fs.readFileSync(await(await pending).path()),book=inspectImportWorkbook(buffer);
    let content=buffer;
    if(config.module==='生命周期目标')content=fillImportWorkbook(buffer,1,['2026','环境','自研上品计划','1','','','']);
    if(config.module==='供应商名单'){const header=importTemplateHeader(book).row,row=[...book.rows.find(row=>row.row===header+1).values];row[0]='统一供应商回归';content=fillImportWorkbook(buffer,header,row,{keepExample:true})}
    file={name:config.module+'-成功.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:content};
   }
   const count=await recordCount();await input.setInputFiles(file);
   // 同一按钮被快速触发两次只提交一次。
   await confirm.evaluate(node=>{node.click();node.click()});await waitIdle(config.dialog);
   if(await dialog.isVisible())console.log(config.module+'错误：',await page.evaluate(key=>JSON.parse(localStorage.getItem(key))[0]?.errors,historyKey));
   await dialog.waitFor({state:'hidden'});
   assert.equal(await recordCount(),count+1);assert.equal((await page.evaluate(key=>JSON.parse(localStorage.getItem(key))[0],historyKey)).status,'导入成功',config.module+'成功提交');
  }
  // 核心链接：有效行与错误行一起失败；移除重传、保存失败重试，整月覆盖不受筛选影响。
  await page.evaluate(()=>location.hash='#system-core-links');const snapshot=await page.evaluate(()=>coreLinkConfigSnapshot()),known=snapshot.rows[0];
  await page.locator('#klc-import').click();let dialog=await shell('#klc-import-dialog');
  const headers=['月份','商品链接名称','链接ID','店铺名称','店铺ID'],valid=['2026/10','确认重试样例',known.linkId,'名称',known.shopId];
  await dialog.locator('input[type=file]').setInputFiles({name:'整批失败.csv',mimeType:'text/csv',buffer:csv([headers,valid,['2026/10','缺少链接','','名称',known.shopId]])});await page.locator('#klc-confirm-import').click();await waitIdle('#klc-import-dialog');assert.deepEqual(await page.evaluate(()=>coreLinkConfigSnapshot()),snapshot);
  let failed=await page.evaluate(key=>JSON.parse(localStorage.getItem(key))[0],historyKey);assert.equal(failed.totalRows,2);assert.equal(failed.failureCount,2);assert.equal(failed.failedRows[0].reason,'同批文件含错误，本行未导入');assert.match(failed.failedRows[1].reason,/链接/);
  await dialog.locator('.ui-upload-file button').click();await dialog.locator('input[type=file]').setInputFiles({name:'保存重试.csv',mimeType:'text/csv',buffer:csv([headers,valid])});
  await page.evaluate(()=>{window.originalImportSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='dashboard-core-links-v1')throw Error('quota');return window.originalImportSet.call(this,key,value)}});
  await page.locator('#klc-confirm-import').click();await waitIdle('#klc-import-dialog');assert.deepEqual(await page.evaluate(()=>coreLinkConfigSnapshot()),snapshot);assert.match(await dialog.locator('.ui-import-feedback').innerText(),/导入失败/);
  await page.evaluate(()=>{Storage.prototype.setItem=window.originalImportSet;delete window.originalImportSet});await page.locator('#klc-confirm-import').click();await dialog.waitFor({state:'hidden'});
  assert.equal((await page.evaluate(()=>coreLinkConfigSnapshot())).revision,snapshot.revision+1);
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await page.locator('#klc-page [data-ui-import-history]').click();await page.locator('[data-ui-history-query]').fill('整批失败.csv');await page.locator('[data-ui-history-detail]').click();assert.match(await page.locator('#ui-import-history').innerText(),/缺少链接/);await page.locator('[data-ui-history-close]').first().click();
  // 第六类入口：采购成本同样只有一个文件，下载样例可直接提交。
  await page.goto(new URL('../../采购部.html',import.meta.url).href);await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await page.locator('[data-pb-action="risk-list"][data-key="1"]').first().click();
  const pending=page.waitForEvent('download');await page.locator('#cw-demo-file').click();const sample=await pending,file={name:sample.suggestedFilename(),mimeType:'text/csv',buffer:fs.readFileSync(await sample.path())};
  await page.locator('#cw-import').click();dialog=await shell('#dialog');
  const costSnapshot=await page.evaluate(()=>localStorage.getItem('procurement-cost-import-v1')),historyBeforeCancel=await recordCount();
  await page.locator('#cw-file').setInputFiles(file);
  await page.evaluate(()=>{window.originalArrayBuffer=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){return new Promise(resolve=>setTimeout(resolve,180)).then(()=>window.originalArrayBuffer.call(this))}});
  await page.locator('#cw-confirm').click();await page.locator('#modalclose').click();
  await page.waitForFunction(()=>!document.getElementById('dialog').hasAttribute('aria-busy'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('procurement-cost-import-v1')),costSnapshot,'关闭慢读取后不保存');assert.equal(await recordCount(),historyBeforeCancel,'取消读取不生成导入结果');
  await page.evaluate(()=>{File.prototype.arrayBuffer=window.originalArrayBuffer;delete window.originalArrayBuffer});
  if(!await page.locator('#cw-import').isVisible())await page.locator('[data-pb-action="risk-list"][data-key="1"]').first().click();await page.locator('#cw-import').click();dialog=await shell('#dialog');await page.locator('#cw-file').setInputFiles({name:'成本错误.csv',mimeType:'text/csv',buffer:Buffer.from('错误\n内容')});await page.locator('#cw-confirm').click();await waitIdle('#dialog');assert.match(await dialog.locator('.ui-import-feedback').innerText(),/导入失败/);await dialog.locator('.ui-upload-file button').click();await page.locator('#cw-file').setInputFiles(file);await page.locator('#cw-confirm').click();await page.locator('#cw-import').waitFor();await page.locator('#close').click();
  console.log('通过：六类单文件确认导入、上传区内文件/移除重传、无预览勾选、成功失败统一记录、原始行失败下载、刷新持久化、整批回滚与保存重试、快速点击防重、读取取消与宽窄屏。');
 }finally{
  await page.evaluate(({keys,before})=>{if(window.originalArrayBuffer){File.prototype.arrayBuffer=window.originalArrayBuffer;delete window.originalArrayBuffer}if(window.originalImportSet){Storage.prototype.setItem=window.originalImportSet;delete window.originalImportSet}keys.forEach((key,index)=>before[index]===null?localStorage.removeItem(key):localStorage.setItem(key,before[index]))},{keys,before});
 }
}
