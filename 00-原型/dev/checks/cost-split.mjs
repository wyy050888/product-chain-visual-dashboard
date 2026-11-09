import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {inspectImportWorkbook,fillImportWorkbookRows,importTemplateHeader,cleanTemplateHeader} from './import-template-workbook.mjs';
import {modelClock} from './model-clock.mjs';
const keys=['cost-efficiency-config-v1','dashboard-import-history-v1'],mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const actual=fs.readFileSync(new URL('../../assets/templates/降本实际值导入模板.xlsx',import.meta.url));
const target=fs.readFileSync(new URL('../../assets/templates/降本目标值导入模板.xlsx',import.meta.url));
const clean=value=>cleanTemplateHeader(value).replace(/（填报目标时必填）$/,'');
const audit=page=>page.evaluate(()=>costConfigAudit());
async function ready(page){await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await page.evaluate(()=>location.hash='#system-cost-efficiency');await page.locator('#cec-page').waitFor()}
async function isolated(page,run){
 const before=await page.evaluate(keys=>keys.map(key=>localStorage.getItem(key)),keys);
 try{await page.clock.setFixedTime(new Date('2026-11-09T04:00:00Z'));await page.evaluate(keys=>keys.forEach(key=>localStorage.removeItem(key)),keys);await ready(page);await run()}
 finally{await page.evaluate(({keys,before})=>{if(window.cecNativeSet){Storage.prototype.setItem=window.cecNativeSet;delete window.cecNativeSet}keys.forEach((key,i)=>before[i]===null?localStorage.removeItem(key):localStorage.setItem(key,before[i]))},{keys,before})}
}
async function select(page,buffer,name='降本回归.xlsx'){await page.locator('#cec-import').click();await page.locator('#cec-file').setInputFiles({name,mimeType,buffer});assert(await page.locator('#cec-confirm-import').isEnabled())}
async function confirm(page,success=true){await page.locator('#cec-confirm-import').evaluate(button=>{button.click();button.click()});if(success){await page.waitForFunction(()=>!document.querySelector('#cec-import-dialog').open||document.querySelector('#cec-import-dialog .ui-import-feedback.is-error'));assert.equal(await page.locator('#cec-import-dialog').isVisible(),false,JSON.stringify(await page.evaluate(()=>JSON.parse(localStorage.getItem('dashboard-import-history-v1')||'[]')[0]?.errors)))}else await page.locator('#cec-import-dialog .ui-import-feedback.is-error').waitFor()}
async function closeImport(page){await page.locator('#cec-import-dialog .ui-upload-file button').click();await page.locator('[data-cec-import-close]').first().click()}
const researchRows=(rows,buffer=actual)=>fillImportWorkbookRows(buffer,6,rows,{sheet:2,keepExample:true});
async function download(page,selector){const pending=page.waitForEvent('download');await page.locator(selector).click();const file=await pending;return {name:file.suggestedFilename(),buffer:fs.readFileSync(await file.path())}}

export async function costConfig(page){await isolated(page,async()=>{
 assert.equal(await page.locator('#cec-page h2').innerText(),'降本增效');
 assert.deepEqual(await page.locator('.cec-tabs button').allTextContents(),['实际值','目标值']);
 assert.equal(await page.locator('#cec-tab-actual').getAttribute('aria-selected'),'true');
 assert.equal(await page.locator('[data-cec-project]').count(),20);assert.equal(await page.locator('[data-cec-department]').count(),10);assert.equal(await page.locator('[data-cec-expand],#cec-body [rowspan],#cec-department').count(),0);
 assert.equal(await page.locator('#cec-head th').count(),17);assert.doesNotMatch(await page.locator('#cec-head').innerText(),/目标/);
 await page.locator('[data-cec-department=research]').click();await page.locator('#cec-query').fill('工艺');
 await page.locator('#cec-tab-target').click();assert.equal(await page.locator('#cec-head th').count(),16);assert.doesNotMatch(await page.locator('#cec-head').innerText(),/实际|类目/);assert.equal(await page.locator('[data-cec-department]').count(),0);assert.equal(await page.locator('#cec-page .cec-filters').isVisible(),false);assert.equal(await page.locator('.cec-tree-tools').count(),0);assert.equal(await page.locator('#cec-body tr').count(),9);
 await page.locator('#cec-tab-actual').click();assert.equal(await page.locator('#cec-departments [aria-selected=true]').getAttribute('data-cec-department'),'research');assert.equal(await page.locator('#cec-query').inputValue(),'工艺');
 await page.locator('#cec-reset').click();await page.locator('[data-cec-time-year]').selectOption('2026');
 const before=await audit(page),targets=JSON.stringify(before.store.departmentTargets);
 let input=researchRows([['2026/10','工艺降本','工艺一','100.01',''],['2026/10','工艺降本','工艺二','23.44',''],['2026/09','工艺降本','其他月份','9','']]);
 // 用户中心字段无需供应商编码，仍需SPU档案。使用模板中的真实产品示例。
 const user=inspectImportWorkbook(actual,{sheet:8}),userHeader=importTemplateHeader(user),example=user.rows.find(row=>row.row===userHeader.row+1).values;
 const userRow=[...example];userRow[0]='2026/10';userRow[1]='工厂违规处罚';userRow[2]='自由填写的发货仓';userRow[5]='0';
 input=fillImportWorkbookRows(input,userHeader.row,[userRow],{sheet:8,keepExample:true});
 await select(page,input);assert.match(await page.locator('.cec-import-notice').innerText(),/整月覆盖所有部门.*未列出.*其他月份和目标值保留/);await confirm(page);
 let saved=await audit(page);assert.equal(saved.store.details.length,4);assert.equal(saved.store.months['research-0|2026-10'].actualCents,12345);assert.equal(saved.store.months['purchase-0|2026-10'].actualCents,null,'未列出的其他部门也清空当月实际');assert.equal(JSON.stringify(saved.store.departmentTargets),targets);
 const imported=saved.store.details.find(row=>row.sheet==='用户中心');assert(imported.productId);assert.equal(imported.values[4],userRow[4]);assert(saved.metrics.some(row=>row.department==='user'&&row.metric==='工厂违规处罚'),'二级类目全局存在即可，不按部门限制');
 await page.locator('[data-cec-department=user]').click();assert.equal(await page.locator('[data-cec-view],#cec-editor').count(),0);assert.equal(await page.locator('[data-cec-project="'+imported.itemId+'"] [data-cec-actual-period=month-10]').innerText(),'0.00');
 // 重传只有一条10月明细，旧当月记录全部移除，9月和所有目标不变。
 input=researchRows([['2026/10','工艺降本','替换后','2.50','']]);await select(page,input);await confirm(page);saved=await audit(page);
 assert.equal(saved.store.details.filter(row=>row.month==='2026-10').length,1);assert.equal(saved.store.details.find(row=>row.month==='2026-09').amountCents,900);assert.equal(saved.store.months['research-0|2026-10'].actualCents,250);assert.equal(JSON.stringify(saved.store.departmentTargets),targets);
 const actualBefore=JSON.stringify(saved.store.months),detailsBefore=JSON.stringify(saved.store.details);
 await page.locator('#cec-tab-target').click();const monthly=Array(12).fill('0');monthly[9]='-10.25';const targetInput=fillImportWorkbookRows(target,8,[['研发中心','2026','-10.25',...monthly]],{keepExample:true});await select(page,targetInput);await confirm(page);
 saved=await audit(page);assert.equal(saved.store.departmentTargets['research|2026-10'].targetCents,-1025);assert.equal(saved.store.departmentTargets['research|2026-11'].targetCents,0);assert.equal(JSON.stringify(saved.store.months),actualBefore);assert.equal(JSON.stringify(saved.store.details),detailsBefore);
 assert.equal(await page.locator('#cec-history').getAttribute('data-ui-import-history'),'降本目标值');
 await page.locator('#cec-tab-actual').click();await page.locator('#cec-history').click();assert.match(await page.locator('#ui-import-history h2').innerText(),/降本实际值/);assert.equal(await page.locator('#ui-import-history tbody tr').count(),2);await page.locator('[data-ui-history-close]').first().click();
 const persisted=JSON.stringify(saved.store);await ready(page);assert.equal(JSON.stringify((await audit(page)).store),persisted);
 for(const tab of ['target','actual']){await page.locator('#cec-tab-'+tab).click();for(const mode of ['quarter','year','month']){await page.locator('[data-cec-time-mode="'+mode+'"]').click();const columns=tab==='actual'?(mode==='month'?17:mode==='quarter'?9:6):mode==='month'?16:mode==='quarter'?8:4;assert.equal(await page.locator('#cec-total tr').evaluate(row=>[...row.cells].reduce((sum,cell)=>sum+cell.colSpan,0)),columns)}for(const width of [1920,390]){await page.setViewportSize({width,height:1080});assert(await page.locator('#cec-page').evaluate(node=>node.scrollWidth<=node.clientWidth+1))}}
 await page.setViewportSize({width:1920,height:1080});await page.screenshot({path:fileURLToPath(new URL('../../../outputs/cost-import-template-20261109/原型-实际值.png',import.meta.url))});await page.locator('#cec-tab-target').click();await page.screenshot({path:fileURLToPath(new URL('../../../outputs/cost-import-template-20261109/原型-目标值.png',import.meta.url))});
 });console.log('通过：实际/目标独立页签、筛选、月季年展示、整月覆盖、SPU明细保留、目标与实际隔离、刷新和宽窄屏。')}

export async function costStructuredTemplate(page){await isolated(page,async()=>{
 const file=await download(page,'#cec-template'),book=inspectImportWorkbook(file.buffer);assert.equal(file.name,'降本实际值导入模板.xlsx');assert.deepEqual(book.sheetNames,['采购部','研发中心','产品中心','计划部','发货部','仓储部','品质中心','用户中心','风控中心']);assert.deepEqual(file.buffer,actual);
 const spu=[],suppliers=[];
 for(let i=0;i<book.sheetNames.length;i++){const sheet=inspectImportWorkbook(actual,{sheet:i+1}),header=importTemplateHeader(sheet),fields=header.values.map(clean),notes=sheet.rows.filter(row=>row.row<header.row).map(row=>row.values.join(' ')).join('\n');
  assert.equal(sheet.rows.filter(row=>String(row.values[0]).startsWith('【示例】')).length,1);
  assert.match(notes,new RegExp('从第'+(header.row+2)+'行'));assert.match(notes,/降本类型须存在于二级类目/);assert.doesNotMatch(notes,/本部门降本类型单选|规范为/);
  if(fields.includes('产品名称（SPU）')){spu.push(book.sheetNames[i]);assert.equal(fields[fields.indexOf('产品名称（SPU）')+1],'SPU码')}
  if(fields.includes('T+供应商名称')){suppliers.push(book.sheetNames[i]);assert.match(notes,/财务结算编码-供应商名称/);assert.match(notes,/6652-瑞安市联鑫机电有限公司/)}
  if(['发货部','仓储部'].includes(book.sheetNames[i])){assert.equal(header.row,8);assert.match(sheet.rows.find(row=>row.row===6).values[0],/^5\. T\+供应商名称/);assert.match(sheet.rows.find(row=>row.row===7).values[0],/^6\. 执行日期/)}
  if(['计划部','用户中心'].includes(book.sheetNames[i]))assert.doesNotMatch(notes,/财务结算编码/);
 }
 assert.deepEqual(spu,['采购部','发货部','仓储部','用户中心']);assert.deepEqual(suppliers,['采购部','发货部','仓储部','品质中心']);
 await page.locator('#cec-tab-target').click();const targetFile=await download(page,'#cec-template');assert.equal(targetFile.name,'降本目标值导入模板.xlsx');assert.deepEqual(targetFile.buffer,target);const targetBook=inspectImportWorkbook(targetFile.buffer);assert.deepEqual(targetBook.sheetNames,['部门目标']);assert.deepEqual(importTemplateHeader(targetBook).values.map(clean),['责任部门','年度','年度目标（元）',...Array.from({length:12},(_,i)=>(i+1)+'月（元）')]);
 // 错入口不允许混入另一种模板。
 const before=JSON.stringify((await audit(page)).store);await select(page,actual);await confirm(page,false);assert.equal(JSON.stringify((await audit(page)).store),before);await closeImport(page);
 await page.locator('#cec-tab-actual').click();await select(page,target);await confirm(page,false);assert.equal(JSON.stringify((await audit(page)).store),before);await closeImport(page);
 await select(page,actual);await confirm(page,false);assert.equal(JSON.stringify((await audit(page)).store),before,'示例和预置公式行不会形成覆盖月份');await closeImport(page);
 });console.log('通过：9部门实际模板、独立目标模板、填写说明、供应商豁免、SPU列、示例跳过与错误入口隔离。')}

export async function costUpdater(page){await isolated(page,async()=>{
 const before=JSON.stringify((await audit(page)).store),valid=['2026/10','工艺降本','有效事项','123.45',''],invalid=['2026/10','工艺降本','','-1',''];
 let input=researchRows([valid,invalid]);const user=inspectImportWorkbook(actual,{sheet:8}),header=importTemplateHeader(user).row,row=[...user.rows.find(row=>row.row===header+1).values];row[0]='2026/10';row[4]='不存在的SPU';input=fillImportWorkbookRows(input,header,[row],{sheet:8,keepExample:true});
 await select(page,input,'失败场景.xlsx');await confirm(page,false);assert.equal(JSON.stringify((await audit(page)).store),before);
 await page.locator('.ui-import-feedback button').click();const history=page.locator('#ui-import-history');assert.equal(await history.locator('[data-ui-history-sheet] option').count(),2);
 assert.deepEqual(await history.locator('th').allTextContents(),['原始行号','月份','降本类型','降本明细','金额（元）','备注','失败原因']);assert.match(await history.innerText(),/同批文件含错误，本行未导入/);
 const failed=await download(page,'[data-ui-history-errors]');assert.match(failed.name,/失败数据\.xlsx$/);assert.deepEqual(inspectImportWorkbook(failed.buffer).sheetNames,['研发中心','用户中心']);
 await history.locator('[data-ui-history-sheet]').selectOption('1');assert.match(await history.innerText(),/不存在的SPU/);await history.locator('[data-ui-history-close]').first().click();await closeImport(page);
 input=researchRows([valid]);await select(page,input);
 await page.evaluate(()=>{window.cecNativeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='cost-efficiency-config-v1')throw Error('quota');return window.cecNativeSet.call(this,key,value)}});
 await confirm(page,false);assert.equal(JSON.stringify((await audit(page)).store),before,'保存失败不清空旧月度记录，也不写入更新人');
 await page.evaluate(()=>{Storage.prototype.setItem=window.cecNativeSet;delete window.cecNativeSet});await confirm(page);const saved=await audit(page),stamp=saved.store.months['research-0|2026-10'];assert.equal(stamp.actor,'管理员');assert.equal(saved.store.details[0].updatedAt,stamp.updatedAt);assert.equal(saved.store.details[0].actor,'管理员');assert.equal(stamp.actualCents,12345);
 const rowView=page.locator('[data-cec-project="research-0"]');assert.equal(await rowView.locator('.cec-updater').innerText(),'管理员');
 await ready(page);assert.equal(JSON.stringify((await audit(page)).store),JSON.stringify(saved.store));
 });console.log('通过：整批失败回滚、同批未导入行、原始字段及行号、单个多Sheet失败文件、存储失败重试、更新人与刷新。')}

export async function costDetailRules(){
 const box={...modelClock('2026-11-09'),DATA_CUTOFF:'2026-11-09',localStorage:{getItem:()=>null},window:{},crypto:webcrypto};vm.createContext(box);
 const read=file=>fs.readFileSync(new URL('../../src/'+file,import.meta.url),'utf8');
 for(const name of ['00-categories','00-samples','00-monthly-reference','00-monthly-samples','00-department-directory'])vm.runInContext(read('modules/cost-control/'+name+'.js'),box);
 vm.runInContext(read('data/sample-spus.js'),box);
 for(const name of ['00-metric-catalog','00-directory-migration','01-department-targets','01-model','02-detail-schema','02-detail-validation','02-detail-store','02-split-import'])vm.runInContext(read('modules/cost-config/'+name+'.js'),box);
 const schemas=JSON.parse(vm.runInContext('JSON.stringify(cecDetailSchemas)',box)),products=JSON.parse(vm.runInContext('JSON.stringify(sampleSpus)',box));
 const registry={products,categories:new Set(['除螨仪']),suppliers:[{financialSettlementCode:'6652',name:'瑞安市联鑫机电有限公司'}]};
 let checks=0;
 for(let i=0;i<schemas.length;i++){
  const schema=schemas[i],sheet=inspectImportWorkbook(actual,{sheet:i+1}),header=importTemplateHeader(sheet).row,base=[...sheet.rows.find(row=>row.row===header+1).values];base[0]=String(base[0]).replace('【示例】','').trim();
  const validate=row=>box.cecValidateDetail(schema,row,registry).errors;
  assert.equal(validate(base).length,0,schema.name+'示例规则有效');checks++;
  for(const field of schema.required){const row=[...base];row[schema.headers.indexOf(field)]='';assert(validate(row).some(error=>error.field===field));checks++}
  for(const field of ['干线供应商','T+供应商名称/发货仓'])if(schema.headers.includes(field)){const row=[...base];row[schema.headers.indexOf(field)]='任意名称/仓库';assert.equal(validate(row).length,0);checks++}
  for(const bad of ['-1','1.001','1000000000','1万元']){const row=[...base];row[schema.headers.indexOf(schema.amount)]=bad;assert(validate(row).some(error=>error.field===schema.amount));checks++}
  for(const type of ['工厂违规处罚','云仓快递问题处罚（发货/仓储）']){const row=[...base];row[schema.headers.indexOf('降本类型')]=type;assert.equal(validate(row).length,0);checks++}
  if(schema.headers.includes('SPU码')){const row=[...base];row[schema.headers.indexOf('SPU码')]='无此SPU';assert(validate(row).some(error=>error.field==='SPU码'));checks++}
  if(schema.headers.includes('T+供应商名称')){const row=[...base];row[schema.headers.indexOf('T+供应商名称')]='6652-名称不符';assert(validate(row).some(error=>error.field==='T+供应商名称'));const noCode={...registry,suppliers:[{name:'瑞安市联鑫机电有限公司'}]};assert(box.cecValidateDetail(schema,base,noCode).errors.some(error=>/尚未维护财务结算编码/.test(error.message)));checks+=2}
  const formula=[...base];formula[schema.headers.indexOf(schema.amount)]={formula:'1+1',cached:'2'};assert(validate(formula).some(error=>error.field===schema.amount));checks++;
  formula[schema.headers.indexOf(schema.amount)]={formula:'',cached:'2'};assert(validate(formula).some(error=>error.field===schema.amount));checks++;
 }
 assert.equal(box.cecValidDate('2026/02/30'),false);assert.equal(box.cecValidDate('2026/03',true),true);assert.equal(box.cecValidDate('2026/03',false),false);
 const targetHeaders=['责任部门','年度','年度目标（元）',...Array.from({length:12},(_,i)=>(i+1)+'月（元）')],targetRow=['研发中心','2026','12',...Array(12).fill('1')];
 const validateTarget=rows=>box.cecValidateSplitTarget({sheets:[{name:'部门目标',rows:[targetHeaders,...rows]}]});
 assert.equal(validateTarget([targetRow]).errors.length,0);
 const oldHeaders=targetHeaders.map(header=>header.replace(/（元）$/,'').match(/^\d+月$/)?header.replace(/（元）$/,'（填报目标时必填）'):header);
 assert.equal(box.cecValidateSplitTarget({sheets:[{name:'部门目标',rows:[oldHeaders,targetRow]}]}).errors.length,0,'旧月度表头继续兼容');
 for(let i=0;i<targetRow.length;i++){const row=[...targetRow];row[i]='';assert(validateTarget([row]).errors.length,'目标必填字段 '+targetHeaders[i]);checks++}
 for(const bad of ['12.001','1000000000','13']){const row=[...targetRow];row[2]=bad;assert(validateTarget([row]).errors.length);checks++}
 assert(validateTarget([targetRow,targetRow]).errors.some(error=>/重复/.test(error.message)));
 const negative=['研发中心','2026','-12',...Array(12).fill('-1')];assert.equal(validateTarget([negative]).errors.length,0);
 const zero=['研发中心','2026','0',...Array(12).fill('0')];assert.equal(validateTarget([zero]).errors.length,0);
 console.log('通过：'+checks+'项九部门字段、全局二级类目、SPU、供应商校验/豁免、财务结算编码待维护、金额和日期边界。');
}

export async function costTargetGrid(page){await isolated(page,async()=>{
 const original=await audit(page),store=original.store;store.departmentTargets={};
 for(let month=1;month<=12;month++)store.departmentTargets['research|2026-'+String(month).padStart(2,'0')]={targetCents:month*100,actor:'目标测试员',updatedAt:'2026-10-29 12:00:00'};
 store.departmentTargets['purchase|2026-01']={targetCents:0};store.departmentTargets['research|2027-01']={targetCents:12345};
 await page.evaluate(store=>localStorage.setItem('cost-efficiency-config-v1',JSON.stringify(store)),store);await ready(page);await page.locator('#cec-tab-target').click();
 const before=JSON.stringify((await audit(page)).store),research=()=>page.locator('[data-cec-target-department=research]');
 assert.doesNotMatch(await page.locator('#cec-body').innerText(),/去计划|去仓储/);assert.equal(await page.locator('#cec-body tr').count(),9);
 assert.equal(await page.locator('#cec-department,[data-cec-time-value]').count(),0);assert.equal(await research().locator('[data-cec-target-period]').count(),12);
 assert.deepEqual((await page.locator('#cec-head th').allTextContents()).slice(2,14),Array.from({length:12},(_,index)=>(index+1)+'月（元）'));
 assert.deepEqual(await research().locator('[data-cec-target-period]').allTextContents(),Array.from({length:12},(_,i)=>(i+1)+'.00'));
 assert.equal(await research().locator('[data-cec-annual-target]').innerText(),'78.00');
 assert.equal(await page.locator('[data-cec-target-department=purchase] [data-cec-target-period=month-1]').innerText(),'0.00');
 assert.equal(await page.locator('[data-cec-target-department=warehouse] [data-cec-target-period=month-1]').innerText(),'');assert.equal(await page.locator('[data-cec-target-department=warehouse] [data-cec-annual-target]').innerText(),'');
 const first=research().locator('td').first(),x=(await first.boundingBox()).x;await page.locator('#cec-table-content').evaluate(node=>node.scrollLeft=600);assert(Math.abs((await first.boundingBox()).x-x)<2,'横向滚动保留责任部门');
 await page.locator('[data-cec-time-mode=quarter]').click();assert.equal(await page.locator('[data-cec-time-value]').count(),0);assert.deepEqual(await research().locator('[data-cec-target-period]').allTextContents(),['6.00','15.00','24.00','33.00']);
 assert.deepEqual(await page.locator('[data-cec-target-department=warehouse] [data-cec-target-period]').allTextContents(),['','','','']);
 await page.locator('[data-cec-time-mode=year]').click();assert.equal(await research().locator('[data-cec-target-period]').count(),1);assert.equal(await research().locator('[data-cec-target-period]').innerText(),'78.00');assert.equal(await page.locator('#cec-head th').count(),4,'年度只展示一列目标');
 assert.equal(await page.locator('[data-cec-target-department=warehouse] [data-cec-target-period]').innerText(),'');
 await page.locator('[data-cec-time-year]').selectOption('2027');assert.equal(await research().locator('[data-cec-target-period]').innerText(),'123.45');
 await page.locator('[data-cec-time-year]').selectOption('2026');await page.locator('[data-cec-time-mode=month]').click();
 assert.equal(await page.locator('#cec-body tr').count(),9);assert.equal(await page.locator('[data-cec-department]').count(),0);assert.equal(await page.locator('#cec-page .cec-filters').isVisible(),false);assert.equal(await page.locator('#cec-total [data-cec-target-period=month-12]').innerText(),'12.00');
 assert.equal(JSON.stringify((await audit(page)).store),before,'切换年月季、部门与滚动都不写入数据');
 await page.locator('#cec-tab-actual').click();assert.equal(await page.locator('[data-cec-time-value]').count(),0);await page.locator('[data-cec-department=warehouse]').click();assert.equal(await page.locator('[data-cec-project]').count(),5);
 assert.equal(await page.locator('#cec-body [rowspan],#cec-body [colspan],[data-cec-expand],[data-cec-expand-all]').count(),0,'普通表格没有层级、合并或展开操作');
 assert.equal(await page.locator('#cec-body tr').evaluateAll(rows=>rows.every(row=>row.cells.length===17)),true);
 await page.locator('#cec-query').fill('运费');assert.equal(await page.locator('[data-cec-project]').count(),1);assert.equal(await page.locator('#cec-body tr td').first().innerText(),'仓储部');
 await page.locator('#cec-reset').click();assert.equal(await page.locator('#cec-departments [aria-selected=true]').getAttribute('data-cec-department'),'');assert.equal(await page.locator('#cec-query').inputValue(),'');
 await page.setViewportSize({width:1920,height:1080});await page.screenshot({path:fileURLToPath(new URL('../../../outputs/cost-import-template-20261109/原型-实际值-普通表格.png',import.meta.url))});
 await page.locator('#cec-tab-target').click();await page.screenshot({path:fileURLToPath(new URL('../../../outputs/cost-import-template-20261109/原型-目标值-全年月份.png',import.meta.url))});
 for(const tab of ['actual','target']){await page.locator('#cec-tab-'+tab).click();await page.setViewportSize({width:390,height:844});assert(await page.locator('#cec-page').evaluate(node=>node.scrollWidth<=node.clientWidth+1));if(tab==='actual')assert(await page.locator('#cec-departments').evaluate(node=>node.scrollWidth>node.clientWidth));else assert.equal(await page.locator('#cec-departments').isVisible(),false)}
 });console.log('通过：目标全年12月/4季/1年、年度切换、空白和0、汇总及固定部门列；实际平铺分页与部门Tab、搜索重置、切换不写数据和窄屏。')}

export async function costActualGrid(page){await isolated(page,async()=>{
 const snapshot=await audit(page),store=snapshot.store;store.months={};
 for(const metric of snapshot.metrics)for(const year of [2026,2027])for(let month=1;month<=12;month++)store.months[metric.id+'|'+year+'-'+String(month).padStart(2,'0')]={actualCents:null};
 for(const [month,cents]of [[1,100],[3,200],[7,0],[12,400]])store.months['research-0|2026-'+String(month).padStart(2,'0')]={actualCents:cents,actor:'实际测试员',updatedAt:'2026-10-29 12:00:00'};
 store.months['research-0|2027-01']={actualCents:5555};
 await page.evaluate(store=>localStorage.setItem('cost-efficiency-config-v1',JSON.stringify(store)),store);await ready(page);await page.locator('[data-cec-time-year]').selectOption('2026');await page.locator('[data-cec-department=research]').click();
 const before=JSON.stringify((await audit(page)).store),row=()=>page.locator('[data-cec-project=research-0]'),blank=()=>page.locator('[data-cec-project=research-1]');
 assert.equal(await page.locator('[data-cec-time-value],#cec-editor,[data-cec-view]').count(),0);assert.doesNotMatch(await page.locator('#cec-head').innerText(),/操作/);
 assert.deepEqual(await row().locator('[data-cec-actual-period]').allTextContents(),['1.00','','2.00','','','','0.00','','','','','4.00']);
 assert.equal(await blank().locator('[data-cec-actual-period]').evaluateAll(nodes=>nodes.every(node=>node.textContent==='')),true);
 assert.deepEqual((await page.locator('#cec-head th').allTextContents()).slice(3,15),Array.from({length:12},(_,index)=>(index+1)+'月（元）'));
 assert.equal(await page.locator('#cec-total [data-cec-actual-period=month-2]').innerText(),'');assert.equal(await page.locator('#cec-total [data-cec-actual-period=month-7]').innerText(),'0.00');
 await page.locator('[data-cec-time-mode=quarter]').click();assert.equal(await page.locator('[data-cec-time-value]').count(),0);assert.deepEqual(await row().locator('[data-cec-actual-period]').allTextContents(),['3.00','','0.00','4.00']);
 assert.deepEqual(await page.locator('#cec-total [data-cec-actual-period]').allTextContents(),['3.00','','0.00','4.00']);
 await page.locator('[data-cec-time-mode=year]').click();assert.equal(await page.locator('#cec-head th').count(),6);assert.equal(await row().locator('[data-cec-actual-period]').innerText(),'7.00');assert.equal(await blank().locator('[data-cec-actual-period]').innerText(),'');
 await page.locator('[data-cec-time-year]').selectOption('2027');assert.equal(await row().locator('[data-cec-actual-period]').innerText(),'55.55');
 await page.locator('[data-cec-time-year]').selectOption('2026');await page.locator('[data-cec-time-mode=month]').click();
 const first=row().locator('td').first(),left=(await first.boundingBox()).x;await page.locator('#cec-table-content').evaluate(node=>node.scrollLeft=1200);assert(Math.abs((await first.boundingBox()).x-left)<2);
 await page.locator('#cec-tab-target').click();assert.equal(await page.locator('#cec-body tr').count(),9);await page.locator('#cec-tab-actual').click();assert.equal(await page.locator('#cec-departments [aria-selected=true]').getAttribute('data-cec-department'),'research');
 assert.equal(JSON.stringify((await audit(page)).store),before,'周期、年份、Tab和滚动只改变展示');
 await page.setViewportSize({width:1920,height:1080});await page.locator('#cec-table-content').evaluate(node=>node.scrollLeft=0);await page.screenshot({path:fileURLToPath(new URL('../../../outputs/cost-import-template-20261109/原型-实际值-全年展开.png',import.meta.url))});
 for(const mode of ['month','quarter','year']){await page.locator('[data-cec-time-mode="'+mode+'"]').click();await page.setViewportSize({width:390,height:844});assert(await page.locator('#cec-page').evaluate(node=>node.scrollWidth<=node.clientWidth+1));assert.equal(await page.locator('[data-cec-time-value],#cec-editor,[data-cec-view]').count(),0)}
 });console.log('通过：实际12月/4季/1年、空白与零值、部分月份汇总、跨年、筛选及目标隔离、固定责任部门、无查看/抽屉和窄屏。')}
