import fs from 'node:fs';
import assert from 'node:assert/strict';
import {inspectImportWorkbook,importTemplateHeader} from './import-template-workbook.mjs';
export async function importTemplateColors(page){
 let templates=0,sheets=0;
 const column=index=>{let name='';for(index++;index;index=Math.floor((index-1)/26))name=String.fromCharCode(65+(index-1)%26)+name;return name};
 const verify=(buffer,label)=>{
  const book=inspectImportWorkbook(buffer);
  for(let i=0;i<book.sheetNames.length;i++){
   const sheet=inspectImportWorkbook(buffer,{sheet:i+1,styles:true}),header=importTemplateHeader(sheet);
   for(const [index,text]of header.values.entries())if(text)assert.equal(sheet.cellFills[column(index)+header.row],'FF294D79',label+' '+book.sheetNames[i]+' '+text+' 深蓝底');
   const marks=sheet.marks.filter(mark=>Number(mark.cell.match(/\d+$/)[0])===header.row);
   assert.equal(marks.length,header.values.filter(Boolean).length,'每个表头都显式保留白色文字 '+label);
   for(const mark of marks)for(const run of mark.runs)assert.equal(run.color,run.text==='*'?'FFD92848':'FFFFFFFF','红星/白字 '+label);
   sheets++;
  }
  templates++;
 };
 const download=async selector=>{const pending=page.waitForEvent('download');await page.locator(selector).click();return fs.readFileSync(await(await pending).path())};
 await page.evaluate(()=>location.hash='#system-lifecycle-targets');await page.locator('[data-lt-import]').click();
 verify(await download('#lt-import-dialog [data-lt-template]'),'生命周期目标');await page.locator('[data-lt-import-close]').first().click();
 await page.evaluate(()=>location.hash='#system-cost-efficiency');verify(await download('#cec-template'),'降本目标与实际');
 await page.evaluate(()=>location.hash='#system-core-links');verify(await download('#klc-template'),'核心链接');
 await page.evaluate(()=>location.hash='#system-strategic-suppliers');
 for(const tier of ['primary','secondary']){await page.locator('[data-ssi-tier="'+tier+'"]').click();verify(await download('#ssi-template'),'供应商 '+tier)}
 await page.evaluate(()=>location.hash='#ai');await page.locator('#ai [data-gd-part="tasks"]').click();await page.locator('[data-gd-task-import]').click();verify(await download('[data-gd-task-template]'),'任务');await page.locator('[data-gd-entry-close]').first().click();
 await page.goto(new URL('../../采购部.html',import.meta.url).href);await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await page.locator('[data-pb-action="risk-list"][data-key="1"]').first().click();
 for(let type=0;type<5;type++){await page.locator('#cw-type').selectOption(String(type));verify(await download('#cw-template'),'采购 '+type)}
 for(const kind of ['product','link'])verify(fs.readFileSync(new URL('../../数智罗盘/目标管理/assets/templates/'+kind+'-target.xlsx',import.meta.url)),'数智罗盘 '+kind);
 console.log('通过：'+templates+'类模板、'+sheets+'个工作表的深蓝表头、白色文字与红色必填星号。');
}
