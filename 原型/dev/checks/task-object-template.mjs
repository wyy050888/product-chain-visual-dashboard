import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectImportWorkbook,importTemplateHeader,cleanTemplateHeader,fillImportWorkbook} from './import-template-workbook.mjs';

export async function taskObjectTemplate(page){
 await page.clock.setFixedTime(new Date('2026-10-29T04:00:00Z'));await page.reload();
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 await page.locator('a[href="#ai"]').click();await page.locator('#ai [data-gd-part="tasks"]').click();
 const dialog=()=>page.locator('.gd-task-entry-dialog');
 await page.locator('[data-gd-task-import]').click();
 const pending=page.waitForEvent('download');await dialog().locator('[data-gd-task-template]').click();
 const download=await pending,bytes=fs.readFileSync(await download.path()),book=inspectImportWorkbook(bytes),header=importTemplateHeader(book);
 assert.deepEqual(header.values.map(cleanTemplateHeader),['业务对象类型','业务对象','业务对象名称','事项名称','优先级','问题描述','执行事项','负责人','计划完成日期']);
 const guide=book.rows.filter(row=>row.row<header.row);
 assert(guide.every(row=>row.values.some(Boolean)));assert.equal(guide.length,header.row-1,'说明与表头没有空行');
 const text=guide.map(row=>row.values.join(' ')).join('\n');
 assert.match(text,/项目：业务对象留空，业务对象名称填完整项目名称/);assert.doesNotMatch(text,/项目ID/);assert.match(text,/产品：业务对象填SPU码/);assert.match(text,/店铺：业务对象填店铺ID/);assert.match(text,/类型可填：产品、项目、店铺/);
 const example=book.rows.find(row=>row.row===header.row+1).values;
 assert.equal(example[0],'【示例】产品');assert.equal(example[1],'CW-LJ-QNQ-A817');
 assert.equal(example[2],'创维取暖器高塔机械款A817');
 const objects=await page.evaluate(()=>({
  product:referenceSampleAudit().spus.find(row=>row.spuCode==='CW-LJ-QNQ-A817'),
  project:globalDiagnosisAudit().tasks.flatMap(row=>row.task.businessObjects||[]).find(row=>row.type==='project')
 }));
 assert(objects.product&&objects.project,'产品示例及项目来自现有档案');
 const submit=async(buffer,name)=>{
  await dialog().locator('[data-gd-task-file]').setInputFiles({name,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
  await dialog().locator('[data-gd-task-confirm]').click();
  await page.waitForFunction(()=>!document.querySelector('.gd-task-entry-dialog')?.hasAttribute('aria-busy'));
 };
 await submit(bytes,'只有示例.xlsx');assert.match(await dialog().locator('.ui-import-feedback').innerText(),/导入失败/,'示例不会被当成真实任务');
 for(const [type,badReference,goodReference]of [
  ['项目',objects.project.id,objects.project.name],
  ['产品',objects.product.name,objects.product.spuCode]
 ]){
  const title='对象匹配回归-'+type,values=[type,badReference,'',title,'P2','核对任务关联','确认关联对象','林悦','2026/11/05'];
  await submit(fillImportWorkbook(bytes,header.row,values,{keepExample:true}),type+'错误.xlsx');
  assert.match(await dialog().locator('.ui-import-feedback').innerText(),/导入失败/);
  values[1]=type==='项目'?'':goodReference;
  values[2]=type==='项目'?goodReference:objects.product.name;
  if(type==='产品'){
   values[2]='不对应的产品名称';
   await submit(fillImportWorkbook(bytes,header.row,values,{keepExample:true}),'名称错误.xlsx');
   assert.match(await dialog().locator('.ui-import-feedback').innerText(),/导入失败/,'名称不能覆盖编码匹配');
   values[2]=objects.product.name;
  }
  await submit(fillImportWorkbook(bytes,header.row,values,{keepExample:true}),type+'成功.xlsx');
  await dialog().waitFor({state:'hidden'});
  const task=await page.evaluate(title=>globalDiagnosisAudit().tasks.find(row=>row.task.title===title)?.task,title);
  assert(task);assert.equal(task.businessObjects[0].name,type==='项目'?objects.project.name:objects.product.name);
  assert.equal(task.businessObjects[0].type,type==='项目'?'project':'product');
  await page.locator('[data-gd-task-import]').click();
 }
 await dialog().locator('[data-gd-entry-close]').first().click();
 console.log('通过：新增名称列及填写说明、产品示例、示例忽略、项目按名称列匹配、产品SPU匹配及名称核对');
}
