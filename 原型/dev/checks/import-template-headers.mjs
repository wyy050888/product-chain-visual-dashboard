import fs from 'node:fs';
import assert from 'node:assert/strict';
import {inspectImportWorkbook,fillImportWorkbook,cleanTemplateHeader,importTemplateHeader} from './import-template-workbook.mjs';

const mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export async function importTemplateHeaders(page){
 const download=async selector=>{const pending=page.waitForEvent('download');await page.locator(selector).click();const file=await pending;assert.match(file.suggestedFilename(),/\.xlsx$/);return fs.readFileSync(await file.path())};
 const verify=(buffer,expected)=>{
  const book=inspectImportWorkbook(buffer),row=importTemplateHeader(book),headerRow=row.row,labels=row.values.map(cleanTemplateHeader);
  if(book.rows[0].values[0]==='填写说明')for(let i=1;i<headerRow;i++)assert(book.rows.find(row=>row.row===i)?.values.some(value=>String(value).trim()),'填写说明与表头之间没有空行');
  const required=book.marks.filter(cell=>new RegExp('[A-Z]'+headerRow+'$').test(cell.cell)&&cell.runs.some(run=>run.text==='*'));
  assert.deepEqual(required.map(cell=>cleanTemplateHeader(cell.text)),expected,'必填标记与校验规则一致');
  for(const cell of required){assert.equal(cell.runs[0].text,'*','必填红星位于字段名称前');assert(cell.text.startsWith('*')&&!cell.text.endsWith('*'),'字段名称后不重复星号');assert.equal(cell.runs.find(run=>run.text==='*').color,'FFD92848');assert(cell.runs.filter(run=>run.text!=='*').every(run=>run.color&&run.color!=='FFD92848'),'字段名称显式保留原字色');if(book.rows[0].values[0]==='填写说明')assert(cell.runs.filter(run=>run.text!=='*').every(run=>run.color==='FFFFFFFF'),'必填字段名称保留表头字色')}
  assert.equal(row.values.filter(value=>value.includes('*')).length,expected.length,'可选表头无星号');
  return {book,labels,headerRow};
 };
 const upload=async(selector,buffer,header,values)=>page.locator(selector).setInputFiles({name:'必填标记回归.xlsx',mimeType,buffer:fillImportWorkbook(buffer,header,values)});
 for(const config of [
  {route:'#system-lifecycle-targets',open:'[data-lt-import]',dialog:'#lt-import-dialog',template:'[data-lt-template]',input:'#lt-import-file',preview:'#lt-import-result',close:'[data-lt-import-close]',required:['年度','链群','计划'],values:book=>[book.rows.find(row=>row.row>1&&!String(row.values[0]).startsWith('【示例】')).values[0],'环境','自研上品计划','1','','','']},
  {route:'#system-cost-efficiency',open:'#cec-import',dialog:'#cec-import-dialog',template:'#cec-import-template',input:'#cec-file',preview:'#cec-import-result',close:'[data-cec-import-close]',required:['责任部门','一级类目','二级类目','数据类型','年度'],values:book=>['仓储部','','','部门目标',book.rows.find(row=>row.values[3]==='部门目标').values[4],'','1',...Array(11).fill(''),'']},
  {route:'#system-core-links',open:'#klc-import',dialog:'#klc-import-dialog',template:'[data-ui-upload-template]',input:'#klc-file',preview:'[data-klc-preview]',close:'[data-klc-close]',required:['月份','链接ID','店铺ID'],values:async()=>{const value=await page.evaluate(()=>coreLinkConfigSnapshot().rows[0]);return ['2026/10','模板回归','799999900987','店铺名称',value.shopId]}},
 ]){
  await page.evaluate(hash=>location.hash=hash,config.route);await page.locator(config.open).click();
  let selector=config.dialog+' '+config.template;
  if(!await page.locator(selector).count())selector=config.dialog+' .ui-import-template button:not([data-ui-import-history])';
  const buffer=await download(selector),{book,headerRow}=verify(buffer,config.required);assert.equal(book.rows.filter(row=>String(row.values[0]).startsWith('【示例】')).length,1,'每个模板有一行明显标记的示例');
  const data=fillImportWorkbook(buffer,headerRow,await config.values(book));
  await page.locator(config.input).setInputFiles({name:'必填标记回归.xlsx',mimeType,buffer:data});
  assert.equal(await page.locator(config.dialog+' .ui-upload-zone .ui-upload-file').count(),1);
  await page.locator(config.dialog+' '+config.close).first().click();
 }
 await page.evaluate(()=>location.hash='#ai');await page.locator('#ai [data-gd-part="tasks"]').click();await page.locator('[data-gd-task-import]').click();
 const taskBuffer=await download('[data-gd-task-template]'),taskBook=inspectImportWorkbook(taskBuffer),taskHeader=importTemplateHeader(taskBook).row;assert(taskBook.rows.find(row=>row.row===taskHeader+1).values[0].startsWith('【示例】'));verify(taskBuffer,['事项名称','问题描述','执行事项','负责人','计划完成日期']);
 const taskGuide=inspectImportWorkbook(taskBuffer).rows.filter(row=>row.row<taskHeader).map(row=>row.values.join(' ')).join('\n');
 assert.match(taskGuide,/负责人填写钉钉名称/);
 assert.match(taskGuide,/YYYY\/MM\/DD/);
 assert.doesNotMatch(taskGuide,/新任务状态|重复任务不导入|必填：|整批|最多1000条/,'说明只保留填写规则');
 assert.match(await page.locator('.gd-task-entry-dialog .ui-import-template').innerText(),/负责人请填写钉钉名称/);
 await upload('[data-gd-task-file]',taskBuffer,taskHeader,['','','模板标记回归','P2','检查必填表头','核对下载与导入','林悦','2026/11/04']);
 assert(await page.locator('[data-gd-task-confirm]').isEnabled());await page.locator('[data-gd-entry-close]').first().click();
 await page.goto(new URL('../../采购部.html',import.meta.url).href);await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 await page.locator('[data-pb-action="risk-list"][data-key="1"]').first().click();
 const optional=['产品名称','产品型号','产品图片','单台累计降本率','实际完成进度','应完成进度','剩余摊销台数','剩余摊销金额','实际翻新费率','涨跌金额','涨跌幅度','30天均价波动'];
 for(let type=0;type<5;type++){
  await page.locator('#cw-type').selectOption(String(type));const buffer=await download('#cw-template'),book=inspectImportWorkbook(buffer),headers=book.rows[0].values.map(cleanTemplateHeader);
  verify(buffer,headers.filter(label=>!optional.includes(label)));assert.equal(book.rows.filter(row=>String(row.values[0]).startsWith('【示例】')).length,1);
  assert.match(book.rows[0].values.find(value=>value.includes('采购人员')),/钉钉名称/,'采购五类模板均提示填写钉钉名称');
  const pending=page.waitForEvent('download');await page.locator('#cw-demo-file').click();const sample=fs.readFileSync(await(await pending).path(),'utf8').replace(/^\uFEFF/,'');
  const sampleRows=sample.trim().split(/\r?\n/).map(line=>line.split(',').map(value=>JSON.parse(value))),values=sampleRows[1];
  await page.locator('#cw-import').click();assert.match(await page.locator('#dialog .ui-import-template').innerText(),/采购人员请填写钉钉名称/);await upload('#cw-file',buffer,1,values);await page.waitForFunction(()=>!document.getElementById('cw-confirm').disabled);
  await page.locator('#close').click();
  if(!await page.locator('#cw-type').isVisible())await page.locator('[data-pb-action="risk-list"][data-key="1"]').first().click();
 }
 await page.locator('#close').click();
 await page.goto(new URL('../../数智罗盘/目标管理/目标管理.html',import.meta.url).href);
 await page.waitForFunction(()=>window.GoalPrototype?.importSource);
 for(const kind of ['product','link']){
  const buffer=fs.readFileSync(new URL('../../数智罗盘/目标管理/assets/templates/'+kind+'-target.xlsx',import.meta.url)),book=inspectImportWorkbook(buffer),labels=book.rows.find(row=>row.row===2).values.filter(Boolean).map(cleanTemplateHeader);
  verify(buffer,labels.filter(label=>label!=='产品名称（SPU）'),2);
  assert.match(book.rows[0].values.join(' '),/钉钉名称/,'两类目标模板人员说明使用钉钉名称');
  assert.doesNotMatch(book.rows[0].values.join(' '),/系统姓名|组织架构姓名/);
  assert.match(book.rows[0].values.join(' '),/覆盖该周期目标/,'保留覆盖数据提醒');
  assert.match(book.rows[0].values.join(' '),/GSV单位万元；18.5%填18.5/,'保留金额及百分比填写口径');
  assert.doesNotMatch(book.rows[0].values.join(' '),/否则文件会导入失败|校验不通过|整批不导入/,'移除重复失败处理说明');
  assert.equal(await page.evaluate(({bytes,kind})=>GoalPrototype.importSource.read(XLSX.read(new Uint8Array(bytes),{type:'array'}),kind).headerError,{bytes:[...buffer],kind}),false,'独立目标管理可识别带红星模板 '+kind);
 }
 console.log('通过：12类模板示例覆盖、红色必填星号/可选与条件必填区分，10类应用模板实际下载、填写后导入校验');
}
