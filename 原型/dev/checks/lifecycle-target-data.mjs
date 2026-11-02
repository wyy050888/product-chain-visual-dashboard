import assert from 'node:assert/strict';
import {inspectImportWorkbook} from './import-template-workbook.mjs';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
export async function lifecycleTargetData(page){
 const key='lifecycle-quarter-targets-v1',previous=await page.evaluate(key=>localStorage.getItem(key),key),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const audit=()=>page.evaluate(()=>lifecycleTargetsAudit()),snapshot=async()=>(await audit()).saved;
 const csv=rows=>'\uFEFF'+rows.map(row=>row.map(value=>'"'+String(value??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
 const headers=['年度','链群','计划','Q1','Q2','Q3','Q4'],plan='自研上品计划';
 const row=(q1,q2='',year=2026)=>[year,'环境',plan,q1,q2,'',''];
 const open=()=>page.locator('[data-lt-import]').click(),close=()=>page.locator('[data-lt-import-close]').first().click();
 const upload=async(rows,name='目标.csv')=>{
  await page.locator('#lt-import-file').setInputFiles({name,mimeType:'text/csv',buffer:Buffer.from(csv([headers,...rows]))});
  await page.locator('#lt-import-result .lt-data-summary').waitFor();
 };
 const confirm=async()=>{if(await page.locator('#lt-import-overwrite').count())await page.locator('#lt-import-overwrite').check();await page.locator('#lt-import-confirm').click()};
 try{
  await page.evaluate(key=>localStorage.removeItem(key),key);await page.reload();
  await page.locator('#lt-open-targets').evaluate(element=>element.click());await page.locator('#lt-year').selectOption('2026');
  const actuals=(await audit()).sourceActuals,original=await snapshot();
  let download=page.waitForEvent('download');await page.locator('[data-lt-download]').click();
  const exported=fs.readFileSync(await(await download).path()),downloadRows=inspectImportWorkbook(exported).rows;
  assert.equal(downloadRows.length,38);assert(String(downloadRows[1].values[0]).startsWith('【示例】'));
  assert.deepEqual(downloadRows[2].values,['2026','环境','自研上品计划','','','','']);
  for(const chain of ['环境','清洁','厨电','个护&健康'])assert(downloadRows.some(row=>row.values[1]===chain));
  assert.deepEqual(await page.locator('.lt-data-actions button').allTextContents(),['导入','下载模板','导入记录']);
  assert.equal(await page.locator('[data-lt-history="changes"],#lt-history-dialog').count(),0);
  await page.locator('[data-lt-number="0:0"]').fill('21');
  let saved=await snapshot();assert.equal(saved.history[0].kind,'manual');assert.deepEqual(saved.history[0].changes.map(c=>[c.before,c.after]),[[17,21]]);
  await open();download=page.waitForEvent('download');await page.locator('[data-lt-template]').click();
  const templateDownload=await download;assert.match(templateDownload.suggestedFilename(),/\.xlsx$/);
  const templateRows=inspectImportWorkbook(fs.readFileSync(await templateDownload.path())).rows;
  assert(String(templateRows[1].values[0]).startsWith('【示例】'));assert.deepEqual(templateRows[2].values,['2026','环境','自研上品计划','','','','']);
  await upload([row(30,0)]);assert(await page.locator('#lt-import-confirm').isDisabled());assert.match(await page.locator('#lt-import-result').innerText(),/2项季度数值变更/);
  await close();assert.deepEqual(await snapshot(),saved,'取消不修改目标，不记录成功导入');
  await open();await upload([row(30,0),[2026,'不存在',plan,5,'','','']]);
  assert(await page.locator('#lt-import-confirm').isDisabled());assert.deepEqual((await snapshot()).years,saved.years,'整批有错不部分写入');
  assert.equal((await snapshot()).history[0].kind,'import-error');
  download=page.waitForEvent('download');await page.locator('[data-lt-error-download]').click();assert.match(fs.readFileSync(await(await download).path(),'utf8'),/固定链群/);
  await upload([row(-1)]);assert.match(await page.locator('#lt-import-result').innerText(),/整数/);
  await upload([row(1.5)]);assert.match(await page.locator('#lt-import-result').innerText(),/整数/);
  await upload([row(100000)]);assert.match(await page.locator('#lt-import-result').innerText(),/99999/);
  await upload([row(1,'',2025)]);assert.match(await page.locator('#lt-import-result').innerText(),/当前所选年度/);
  await upload([row(2),row(3)]);assert.match(await page.locator('#lt-import-result').innerText(),/重复/);
  await upload([row(30,0)]);
  await page.locator('#lt-import-file').setInputFiles([]);assert(await page.locator('#lt-import-confirm').isDisabled());assert.equal(await page.locator('#lt-import-result').innerText(),'');
  await upload([row(30,0)]);
  const beforeFailure=await snapshot();
  await page.evaluate(()=>{window.ltOriginalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='lifecycle-quarter-targets-v1')throw Error('quota');return window.ltOriginalSet.call(this,key,value)}});
  await confirm();assert.match(await page.locator('#lt-import-error').innerText(),/保存失败/);assert.deepEqual(await snapshot(),beforeFailure,'目标、记录同时回滚');
  await page.evaluate(()=>{Storage.prototype.setItem=window.ltOriginalSet;delete window.ltOriginalSet});
  await page.locator('#lt-import-confirm').click();assert(await page.locator('#lt-import-dialog').isHidden());
  saved=await snapshot();assert.deepEqual(saved.years[2026].values[0][0],[30,0,18,18],'空白保留，0保存为零目标');
  assert.equal(saved.history[0].kind,'import');assert.equal(saved.history[0].changes.length,2);assert.equal(await page.locator('[data-lt-row-total="0"]').innerText(),'66');
  assert.deepEqual((await audit()).sourceActuals,actuals,'目标更新不改实际完成事实');
  assert.notDeepEqual((await audit()).saved.years[2026].values,original.years[2026].values);
  await page.locator('[data-lt-history="import"]').click();assert.match(await page.locator('[data-ui-history-content]').innerText(),/导入成功/);
  await page.locator('[data-ui-history-detail]').first().click();assert.match(await page.locator('[data-ui-history-content]').innerText(),/变更前/);assert.equal(await page.locator('[data-ui-history-content] tbody tr').count(),2);
  await page.locator('[data-ui-history-back]').click();await page.locator('[data-ui-history-detail]').nth(1).click();assert.match(await page.locator('[data-ui-history-content]').innerText(),/重复/);
  await page.locator('[data-ui-history-close]').first().click();
  await open();await upload([row(30,0)]);assert(await page.locator('#lt-import-confirm').isEnabled());await confirm();
  assert.equal((await snapshot()).history[0].status,'无变更');assert.equal((await snapshot()).years[2026].revision,saved.years[2026].revision);
  await open();await upload([row(50)]);
  const beforeConflict=await snapshot(),stored=await page.evaluate(key=>localStorage.getItem(key),key);
  await page.evaluate(key=>{const data=JSON.parse(localStorage.getItem(key));data.years[2026].revision++;data.years[2026].values[0][0][0]=77;localStorage.setItem(key,JSON.stringify(data))},key);
  await confirm();assert.match(await page.locator('#lt-import-error').innerText(),/其他页面更新/);assert.deepEqual(await snapshot(),beforeConflict,'冲突时不覆盖其他页面目标');
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).years[2026].values[0][0][0],key),77);
  await page.evaluate(({key,stored})=>localStorage.setItem(key,stored),{key,stored});await close();
  // 慢文件返回时不可覆盖后来选中的新文件。
  await open();await page.evaluate(()=>{window.ltReadOriginal=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){const file=this;if(file.name==='慢文件.csv')return new Promise(resolve=>{window.ltReadRelease=()=>window.ltReadOriginal.call(file).then(resolve)});return window.ltReadOriginal.call(file)}});
  await page.locator('#lt-import-file').setInputFiles({name:'慢文件.csv',mimeType:'text/csv',buffer:Buffer.from(csv([headers,row(99)]))});
  await upload([row(30,0)],'新文件.csv');await page.evaluate(()=>window.ltReadRelease());
  assert.match(await page.locator('#lt-import-result').innerText(),/0项季度数值变更/);await confirm();assert.equal((await snapshot()).history[0].file,'新文件.csv');assert.equal((await snapshot()).years[2026].values[0][0][0],30);
  await page.evaluate(()=>{File.prototype.arrayBuffer=window.ltReadOriginal;delete window.ltReadOriginal;delete window.ltReadRelease});
  await open();await page.locator('#lt-import-file').setInputFiles(fileURLToPath(new URL('../fixtures/lifecycle-targets-import.xlsx',import.meta.url)));
  await page.locator('#lt-import-result .lt-data-summary').waitFor();assert.match(await page.locator('#lt-import-result').innerText(),/校验通过/);await confirm();assert.equal((await snapshot()).years[2026].values[1][0][0],44);
  await open();await page.locator('#lt-import-file').setInputFiles(fileURLToPath(new URL('../fixtures/lifecycle-targets-formula.xlsx',import.meta.url)));
  await page.locator('#lt-import-result .lt-data-summary').waitFor();assert.match(await page.locator('#lt-import-result').innerText(),/公式/);assert(await page.locator('#lt-import-confirm').isDisabled());await close();
  const persisted=await snapshot();await page.reload();assert.deepEqual(await snapshot(),persisted,'刷新后目标和两类记录保持');
  await page.locator('#lt-year').selectOption('2027');await page.locator('[data-lt-history="import"]').click();assert.match(await page.locator('[data-ui-history-content]').innerText(),/暂无导入记录/);await page.locator('[data-ui-history-close]').first().click();
  await open();await upload([row(8)]);assert.match(await page.locator('#lt-import-result').innerText(),/2027/);await close();await page.locator('#lt-year').selectOption('2026');
  // 空白目录和标记示例不能写入目标。
  await open();await page.locator('#lt-import-file').setInputFiles({name:'原始下载.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:exported});await page.locator('#lt-import-result .lt-data-summary').waitFor();assert.match(await page.locator('#lt-import-result').innerText(),/没有可导入/);assert(await page.locator('#lt-import-confirm').isDisabled());await close();
  for(const width of [1920,1024,390]){
   await page.setViewportSize({width,height:900});assert(await page.locator('[data-lt-import]').isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
   const actions=page.locator('.lt-data-actions'),panel=page.locator('#lt-target-page>.lt-panel');assert(Math.abs((await actions.boundingBox()).x-(await panel.evaluate(node=>{const r=node.getBoundingClientRect();return r.x+parseFloat(getComputedStyle(node).paddingLeft)})))<2,'操作区靠左');
   await page.locator('[data-lt-history="import"]').click();const bounds=await page.locator('#ui-import-history').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width+1);await page.locator('[data-ui-history-close]').first().click();
  }
  assert.deepEqual(errors,[]);
 }finally{
  await page.evaluate(({key,previous})=>{if(previous===null)localStorage.removeItem(key);else localStorage.setItem(key,previous)},{key,previous});
 }
}
