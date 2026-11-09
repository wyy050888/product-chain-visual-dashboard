import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
export async function goalImportExperience(page){
 await page.goto(new URL('../../数智罗盘/目标管理/目标管理.html',import.meta.url).href);await page.waitForFunction(()=>window.GoalPrototype?.entryImport);
 const key='goal-prototype-targets-v1',before=await page.evaluate(key=>localStorage.getItem(key),key);
 try{
  for(const kind of ['product','link']){
   await page.evaluate(kind=>{GoalPrototype.state.entryTab=kind;GoalPrototype.entryImport.open()},kind);
   const dialog=page.locator('#refImport');for(const width of[1920,390]){await page.setViewportSize({width,height:1080});const box=await dialog.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1,'旧页面上传弹窗宽窄屏不溢出')}await page.setViewportSize({width:1920,height:1080});assert.equal(await page.locator('#importChoice,#importProgress,#importUpload').count(),0,'无模拟进度及手选结果');
   assert.equal(await dialog.locator('input[type=file]').count(),1);assert(await page.locator('#importConfirm').isDisabled());
   const n=await page.evaluate(()=>GoalPrototype.targetStore.operations().length);
   await page.locator('#importFile').setInputFiles({name:'旧页面错误.csv',mimeType:'text/csv',buffer:Buffer.from('错误表头\n原始失败内容')});
   assert(await page.locator('#importConfirm').isEnabled());assert.equal(await page.evaluate(()=>GoalPrototype.targetStore.operations().length),n,'选文件不产生记录');
   await page.locator('#importConfirm').click();await page.locator('#importErrors').waitFor({state:'visible'});assert.match(await page.locator('#importResult').innerText(),/导入失败，未保存数据/);
   const failed=await page.evaluate(()=>GoalPrototype.targetStore.operations().at(-1));assert.equal(failed.totalRows,1);assert.equal(failed.failureCount,1);assert.equal(failed.failedRows[0].row,2);
   await page.locator('#importErrors').click();await page.locator('.history-failures').waitFor();assert.match(await page.locator('#historyResults').innerText(),/原始失败内容/);
   const dl=page.waitForEvent('download');await page.locator('[data-history-download]').click();const download=await dl;assert.match(download.suggestedFilename(),/失败数据.csv/);assert.match(fs.readFileSync(await download.path(),'utf8'),/原始失败内容/);
   await page.locator('#historyBack').click();assert.deepEqual(await page.locator('.history-imports th').allTextContents(),['导入时间','文件名','操作人','总行数','成功数','失败数','状态','备注','操作']);await page.locator('#historyClose').click();
   await page.locator('#importReplace').click();assert(await page.locator('#importConfirm').isDisabled());assert.equal(await page.locator('#importFilename').innerText(),'选择文件或拖拽到此处');
   const pending=page.waitForEvent('download');await page.locator('#importTemplate').click();const buffer=fs.readFileSync(await(await pending).path());await page.locator('#importFile').setInputFiles({name:kind+'目标.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
   assert(await page.locator('#importDrop').evaluate(node=>node.contains(document.getElementById('importFilename'))));
   await dialog.screenshot({path:fileURLToPath(new URL('../../outputs/目标管理-单文件导入.png',import.meta.url))});
   await page.locator('#importConfirm').click();await dialog.waitFor({state:'hidden'});const success=await page.evaluate(()=>GoalPrototype.targetStore.operations().at(-1));assert.equal(success.status,'success');assert.equal(success.failureCount,0);assert(success.successCount>0);
  }
  await page.reload();await page.waitForFunction(()=>window.GoalPrototype?.history);await page.evaluate(()=>GoalPrototype.history.open());await page.locator('#historySearch').fill('旧页面错误.csv');await page.locator('[data-history-failure]').first().click();assert.match(await page.locator('#historyResults').innerText(),/原始失败内容/);await page.locator('#historyDialog').screenshot({path:fileURLToPath(new URL('../../outputs/目标管理-失败明细.png',import.meta.url))});
  console.log('通过：独立目标管理两类导入实际成功/失败、去除模拟进度和结果选择、单文件移除、九列表头、真实失败数据与刷新持久化。');
 }finally{await page.evaluate(({key,before})=>before===null?localStorage.removeItem(key):localStorage.setItem(key,before),{key,before})}
}
