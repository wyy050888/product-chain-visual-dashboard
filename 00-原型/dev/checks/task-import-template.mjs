import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {inspectImportWorkbook,cleanTemplateHeader,fillImportWorkbook} from './import-template-workbook.mjs';

// 在实际下载件的空白输入行填值，保留说明区、空行、格式与原始行号。
const fillWorkbook=String.raw`
import base64, io, json, sys, zipfile, xml.etree.ElementTree as E
p=json.loads(sys.stdin.buffer.read().decode('utf-8')); raw=base64.b64decode(p['workbook']); ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
E.register_namespace('',ns['s'])
with zipfile.ZipFile(io.BytesIO(raw)) as z:
 shared=E.fromstring(z.read('xl/sharedStrings.xml')) if 'xl/sharedStrings.xml' in z.namelist() else None
 strings=[''.join(n.itertext()) for n in shared] if shared is not None else []
 sheet=E.fromstring(z.read('xl/worksheets/sheet1.xml'))
 def text(c):
  v=c.find('s:v',ns)
  return strings[int(v.text)] if c.get('t')=='s' and v is not None else ''.join(c.itertext())
 assert text(sheet.find('.//s:c[@r="A1"]',ns))=='填写说明'
 assert text(sheet.find('.//s:c[@r="C9"]',ns)).strip(' *')=='事项名称'
 for rowNumber,values in p['rows']:
  data=sheet.find('s:sheetData',ns); row=data.find('s:row[@r="%s"]'%rowNumber,ns)
  if row is None: row=E.SubElement(data,'{'+ns['s']+'}row',{'r':str(rowNumber)})
  for child in list(row): row.remove(child)
  for index,value in enumerate(values):
   c=E.SubElement(row,'{'+ns['s']+'}c',{'r':chr(65+index)+str(rowNumber),'t':'inlineStr'})
   E.SubElement(E.SubElement(c,'{'+ns['s']+'}is'),'{'+ns['s']+'}t').text=value
 out=io.BytesIO()
 with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as result:
  for name in z.namelist(): result.writestr(name,E.tostring(sheet,encoding='utf-8',xml_declaration=True) if name=='xl/worksheets/sheet1.xml' else z.read(name))
 sys.stdout.buffer.write(out.getvalue())
`;

export async function verifyTaskImportTemplate(page,dialog,download){
 assert.equal(download.suggestedFilename(),'任务导入模板.xlsx');
 const downloadPath=await Promise.race([download.path(),new Promise((_,reject)=>setTimeout(()=>reject(Error('模板下载未完成')),20000))]);
 const workbook=fs.readFileSync(downloadPath);assert.equal(workbook.subarray(0,2).toString(),'PK');
 const template=inspectImportWorkbook(workbook);
 assert.deepEqual(template.rows.find(row=>row.row===9).values.map(cleanTemplateHeader),['业务对象类型','业务对象ID','事项名称','优先级','问题描述','执行事项','负责人','计划完成日期']);
 assert.doesNotMatch(template.rows.map(row=>row.values.join(' ')).join('\n'),/主数据|链群/,'模板不再要求填写系统可自动带出的链群');
 assert.match(template.rows.map(row=>row.values.join(' ')).join('\n'),/负责人填写钉钉名称/,'人员填写说明明确使用钉钉名称');
 const upload=async buffer=>{
  await dialog().locator('[data-gd-task-file]').setInputFiles({name:'填写说明模板.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
  await Promise.race([dialog().locator('[data-gd-task-import-preview]').getByText(/校验通过|处错误/).first().waitFor(),dialog().locator('[data-gd-entry-error]').filter({hasText:/\S/}).waitFor().then(async()=>{throw Error(await dialog().locator('[data-gd-entry-error]').innerText())})]);
 };
 await upload(workbook);assert.match(await dialog().innerText(),/没有任务数据/);
 const python=process.env.DASHBOARD_PYTHON_PATH||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
 const make=rows=>execFileSync(python,['-c',fillWorkbook],{input:JSON.stringify({workbook:workbook.toString('base64'),rows}),maxBuffer:5*1024*1024});
 const values=['','','说明模板回归','P2','核对来源数据','确认处理安排','林悦、唐琪','2026/11/04'];
 await upload(make([[12,[...values.slice(0,6),'系统外姓名',...values.slice(7)]]]));
 assert(await dialog().locator('[data-gd-task-confirm]').isDisabled());
 assert.match(await dialog().locator('[data-gd-task-import-preview]').innerText(),/钉钉名称/,'人员校验提示与模板一致');
 assert.equal(await dialog().locator('[data-gd-task-import-preview] tbody tr td').first().innerText(),'12','错误定位Excel原始行号');
 await upload(make([[12,values]]));assert(!(await dialog().locator('[data-gd-task-confirm]').isDisabled()));
 assert.match(await dialog().locator('[data-gd-task-import-preview]').innerText(),/校验通过，共1条/);
 assert.match(await dialog().innerText(),/说明模板回归/);
 assert.match(await dialog().locator('[data-gd-task-import-preview]').innerText(),/林悦、唐琪/);
}

export async function taskImportTemplate(page){
 await page.clock.setFixedTime(new Date('2026-10-26T04:00:00Z'));await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 const dialog=()=>page.locator('.gd-task-entry-dialog');await page.locator('#ai [data-gd-part="tasks"]').click();await page.locator('[data-gd-task-import]').click();const download=page.waitForEvent('download');await dialog().locator('[data-gd-task-template]').click();await verifyTaskImportTemplate(page,dialog,await download);
 const workbook=fs.readFileSync(new URL('../../assets/templates/任务导入模板.xlsx',import.meta.url));
 const objects=await page.evaluate(()=>['product','project'].map(type=>globalDiagnosisAudit().tasks.flatMap(row=>(row.task.businessObjects||[]).map(object=>({...object,category:object.category||row.task.gdCategory,code:object.type==='product'?referenceSampleAudit().spus.find(p=>p.spuId===(object.spuId||object.id))?.spuCode:object.id}))).find(object=>object.type===type&&object.category)));
 for(const [index,object]of objects.entries()){
  assert(object,'具有关联链群的样例对象');
  if(index)await page.locator('[data-gd-task-import]').click();
  const title='无链群列关联回归-'+object.type,values=[object.type==='product'?'产品':'项目',object.type==='product'?object.code:object.id,title,'P2','验证关联对象','确认处理安排','林悦','2026/11/04'];
  await dialog().locator('[data-gd-task-file]').setInputFiles({name:'自动关联.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:fillImportWorkbook(workbook,9,values)});
  await dialog().locator('[data-gd-task-import-preview]').getByText(/校验通过，共1条/).waitFor();await dialog().locator('[data-gd-task-confirm]').click();await dialog().waitFor({state:'detached'});
  const task=await page.evaluate(title=>globalDiagnosisAudit().tasks.find(row=>row.task.title===title)?.task,title);
  assert.equal(task?.gdCategory,object.category,'产品/项目链群自动带出');assert.equal(task.businessObjects[0].category,object.category);
 }
}
