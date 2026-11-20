import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {cleanTemplateHeader,editImportWorkbookCells,fillImportWorkbookRows,inspectImportWorkbook,importTemplateHeader} from './import-template-workbook.mjs';

const mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function lifecycleTargetData(page){
 const key='lifecycle-quarter-targets-v1',previous=await page.evaluate(key=>localStorage.getItem(key),key);
 const audit=()=>page.evaluate(()=>lifecycleTargetsAudit());
 const open=()=>page.locator('[data-lt-import]').click();
 const dialog=page.locator('#lt-import-dialog'),file=dialog.locator('#lt-import-file');
 const submit=()=>dialog.locator('#lt-import-confirm').click();
 const feedback=dialog.locator('.ui-import-feedback.is-error');
 const close=()=>dialog.locator('[data-lt-import-close]').first().click();
 const download=async selector=>{
  const pending=page.waitForEvent('download');await page.locator(selector).click();
  const template=await pending;assert.equal(template.suggestedFilename(),'生命周期目标导入模板.xlsx');
  return fs.readFileSync(await template.path());
 };
 const upload=(buffer,name='目标.xlsx')=>file.setInputFiles({name,mimeType,buffer});
 try{
  await page.evaluate(key=>localStorage.removeItem(key),key);await page.reload();
  await page.locator('#lt-open-targets').evaluate(element=>element.click());
  await page.locator('#lt-year').selectOption('2026');
  const actuals=(await audit()).sourceActuals;
  const workbook=await download('[data-lt-download]'),book=inspectImportWorkbook(workbook,{outline:true});
  const header=importTemplateHeader(book);
  assert.deepEqual(header.values.map(cleanTemplateHeader),['年度','链群','计划','品牌','Q1','Q2','Q3','Q4']);
  assert.equal(book.rows[0].values[0],'填写说明');
  const defaults=['苏泊尔','美的','创维','海尔','康佳'];
  assert.equal(book.rows.find(row=>row.row===header.row+1).values[3],defaults[0]);
  const guide=book.rows.slice(1,header.row-1).map(row=>row.values[0]);
  assert.deepEqual(guide.map(line=>line.slice(0,2)),['1.','2.','3.','4.']);
  assert.match(guide[2],/若有新增品牌，可自行新增行填写/);
  assert.match(guide[3],/研发创新规划只支持设置链群目标，品牌列请留空/);
  const data=book.rows.filter(row=>row.row>header.row+1);
  assert.equal(data.filter(row=>!row.values[3]).length,36,'四个链群的九项链群目标都预填');
  assert(data.every(row=>row.values.slice(4).every(value=>value==='')),'正式行只预填身份字段');
  assert(data.every(row=>row.level===(row.values[3]?1:0)&&!row.hidden&&!row.collapsed),'品牌保留分组且默认全部可见');
  assert(data.filter(row=>row.values[2]==='研发创新规划').every(row=>!row.values[3]));
  const groups=new Map();
  for(const {values:[,category,plan,brand]} of data){
   const key=category+'/'+plan,names=groups.get(key)||[];
   names.push(brand);groups.set(key,names);
  }
  assert.equal(groups.size,36);
  for(const [key,names] of groups)assert.deepEqual(names,key.endsWith('研发创新规划')?['']:['',...defaults]);
  const group=data.filter(row=>row.values[1]==='环境'&&row.values[2]==='自研上品计划');
  const parent=group.find(row=>!row.values[3]),brand=group.find(row=>row.values[3]==='创维');
  assert.equal(brand.row,parent.row+1+defaults.indexOf('创维'));

  await open();
  assert.deepEqual(await download('[data-lt-template]'),workbook,'页面与导入弹窗提供同一份模板');
  await upload(workbook,'空模板.xlsx');await submit();await feedback.waitFor();
  assert.equal((await audit()).saved.years[2026].values[0][0][3],18);
  await upload(editImportWorkbookCells(workbook,{['H'+parent.row]:30,['H'+brand.row]:39}),'混合目标.xlsx');
  await submit();await dialog.waitFor({state:'hidden'});
  const saved=(await audit()).saved;
  assert.equal(saved.years[2026].values[0][0][3],30);
  assert.deepEqual(saved.years[2026].brandValues[0]['创维'][0],[8,9,9,39]);
  assert.equal(saved.history[0].rows,2);
  assert.match(await page.locator('#toast').textContent(),/共 2 条/,'预填的空白行不计入导入成功数');
  assert.deepEqual((await audit()).sourceActuals,actuals);

  await open();
  await file.setInputFiles(fileURLToPath(new URL('../fixtures/lifecycle-targets-formula.xlsx',import.meta.url)));
  await submit();await feedback.waitFor();
  assert.deepEqual((await audit()).saved,saved,'公式导致整批失败时，现有目标保持');
  await close();await open();
  await file.setInputFiles(fileURLToPath(new URL('../fixtures/lifecycle-targets-import.xlsx',import.meta.url)));
  await submit();await dialog.waitFor({state:'hidden'});
  assert.equal((await audit()).saved.years[2026].values[1][0][0],44,'七列旧版 Excel 模板仍可导入');
  assert.equal((await audit()).saved.years[2026].brandValues[0]['创维'][0][3],39);
  await open();
  const extra=[2026,'环境','自研上品计划','新增品牌','12','','',''];
  await upload(fillImportWorkbookRows(workbook,header.row,[...data.map(row=>row.values),extra]),'新增品牌.xlsx');
  await submit();await dialog.waitFor({state:'hidden'});
  await page.reload();await page.locator('[data-lt-plan-toggle="0"]').click();
  assert.equal(await page.locator('[data-lt-number="0:0"][data-lt-brand-name="新增品牌"]').inputValue(),'12');
  assert.equal((await audit()).saved.years[2026].values[0][0][3],30);
 }finally{
  await page.evaluate(({key,previous})=>{if(previous===null)localStorage.removeItem(key);else localStorage.setItem(key,previous)},{key,previous});
 }
}
