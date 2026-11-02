import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {inspectImportWorkbook,fillImportWorkbook,cleanTemplateHeader,importTemplateHeader} from './import-template-workbook.mjs';

export async function costStructuredTemplate(page){
 const storage='cost-efficiency-config-v1',original=await page.evaluate(key=>localStorage.getItem(key),storage),audit=()=>page.evaluate(()=>costConfigAudit());
 try{
  await page.evaluate(()=>location.hash='#system-cost-efficiency');await page.locator('#cec-page').waitFor({state:'visible'});
  const before=await audit();
  assert.equal(await page.locator('#cec-body table').count(),0,'部门和细项使用同一张表，不嵌套小表');
  assert.equal(await page.locator('[data-cec-project]').count(),before.metrics.length);
  assert(await page.locator('.cec-category-cell[rowspan="2"]').count()>0,'同类细项合并分类单元格');
  await page.locator('[data-cec-expand-all="false"]').click();assert.equal(await page.locator('[data-cec-project]').count(),0);
  await page.locator('[data-cec-expand-all="true"]').click();assert.equal(await page.locator('[data-cec-project]').count(),before.metrics.length);
  const pending=page.waitForEvent('download');await page.locator('#cec-template').click();const buffer=fs.readFileSync(await(await pending).path()),book=inspectImportWorkbook(buffer);
  const books=book.sheetNames.map((name,index)=>({name,...inspectImportWorkbook(buffer,{sheet:index+1})}));
  assert.deepEqual(book.sheetNames,['研发中心','采购部（去计划）','仓储部','风控中心','发货部（去仓储）','计划部','品质中心','用户中心','产品中心']);
  const headerRow=importTemplateHeader(book).row,headers=importTemplateHeader(book).values.map(cleanTemplateHeader),rows=books.flatMap(sheet=>sheet.rows.filter(row=>row.row>headerRow).map(row=>row.values).filter(row=>!String(row[0]).startsWith('【示例】')));
  for(const sheet of books){
   assert.equal(sheet.rows.filter(row=>String(row.values[0]).startsWith('【示例】')).length,0,'降本模板不包含示例行');
   assert(!sheet.rows.filter(row=>row.row<headerRow).some(row=>row.values.some(value=>String(value).includes('示例'))),'填写说明不再提及示例行');
   assert(sheet.rows.filter(row=>row.row>headerRow).every(row=>row.values[0]===sheet.name),'每张Sheet只包含对应部门');
   assert.deepEqual(importTemplateHeader(sheet).values.map(cleanTemplateHeader),headers);
   for(let i=1;i<headerRow;i++)assert(sheet.rows.find(row=>row.row===i)?.values.some(Boolean),'每个部门说明与表头之间没有空行');
  }
  for(let index=0;index<books.length;index++){
   const colors=inspectImportWorkbook(buffer,{sheet:index+1,styles:true}),target=books[index].rows.find(row=>row.values[3]==='部门目标'),actual=books[index].rows.find(row=>row.values[3]==='实际降本');
   assert.equal(colors.defaultFill,null,'默认单元格保留无填充，不覆盖护眼显示');
   assert.equal(colors.cellFills.A1,null,'填写说明标题保留原无填充');
   assert.equal(colors.cellFills.A2,'FFF4F7FC','填写说明正文保持浅色');
   assert.equal(colors.cellFills['A'+headerRow],'FF294D79','表头深蓝，与浅色说明区明显区分');
   const requiredMarks=books[index].marks.filter(mark=>mark.cell.match(/\d+$/)?.[0]===String(headerRow));
   assert(requiredMarks.length>=5,'必填字段标记保留');
   for(const mark of requiredMarks){assert.equal(mark.runs[0].color,'FFD92848','必填星号保持红色');assert.equal(mark.runs[1].color,'FFFFFFFF','深蓝表头文字使用白色');}
   for(const col of ['A','F','G'])assert.equal(colors.cellFills[col+target.row],'FFDFEAF7','部门目标及金额使用独立的加深浅蓝，与说明区分');
   if(actual)for(const col of ['A','F','G'])assert.equal(colors.cellFills[col+actual.row],null,'实际行及留空金额保持原无填充');
  }
  assert.equal(book.rows[0].values[0],'填写说明');assert.match(book.rows[2].values.join(' '),/年度目标须等于各月合计/);
  assert.deepEqual(await page.locator('#cec-head th').allTextContents().then(labels=>labels.slice(0,3)),headers.slice(0,3));
  assert.deepEqual(await page.locator('.cec-metric-cell strong').allTextContents(),rows.filter(row=>row[3]==='实际降本').map(row=>row[2]),'页面和模板细项名称及顺序一致');
  assert.deepEqual(headers.slice(0,6),['责任部门','一级类目','二级类目','数据类型','年度','年度目标（元）']);
  assert.equal(rows.filter(row=>row[3]==='部门目标').length,9);
  assert.equal(rows.filter(row=>row[3]==='实际降本').length,before.metrics.length);
  for(const row of rows){
   if(row[3]==='部门目标'){const summary=page.locator('[data-cec-target-department]').filter({hasText:row[0]}).first();assert.equal(await summary.locator('[data-cec-annual-target]').innerText(),Number(row[5]).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}),'页面和模板年度目标一致')}
   if(row[3]==='部门目标')assert.equal(Math.round(Number(row[5])*100),row.slice(6,18).reduce((sum,value)=>sum+Math.round(Number(value)*100),0),'年度目标与月度目标精确到分');
   else assert(row[1]&&row[2]&&row[5]==='无须填写'&&row.slice(6,18).every(value=>value===''),'实际细项目录预填、年度目标无须填写、月度金额留空');
  }
  fs.mkdirSync(new URL('../../outputs/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../../outputs/降本目标与实际年度导入模板-检查.xlsx',import.meta.url),buffer);
  await page.screenshot({path:fileURLToPath(new URL('../../outputs/降本目标模板对齐-检查.png',import.meta.url))});
  await page.locator('#cec-import').click();await page.locator('#cec-file').setInputFiles({name:'原模板.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
  assert(await page.locator('#cec-confirm-import').isEnabled());
  const last=books.at(-1),lastActual=[...last.rows.find(row=>row.row>headerRow+1&&row.values[3]==='实际降本').values];
  lastActual[15]='bad';
  const invalidBook=fillImportWorkbook(buffer,headerRow,lastActual,{sheet:books.length});
  await page.locator('#cec-file').setInputFiles({name:'最后部门错误.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:invalidBook});
  await page.locator('#cec-confirm-import').click();await page.locator('.ui-import-feedback button').waitFor();
  assert.deepEqual((await audit()).store,before.store,'末尾Sheet失败时前面部门也不保存');
  let record=await page.evaluate(()=>JSON.parse(localStorage.getItem('dashboard-import-history-v1'))[0]);
  assert(record.errors.some(error=>String(error.row)===last.name+'!'+(headerRow+1)),'错误保留工作表和原始行号');
  assert(record.failedRows.find(row=>row.row===last.name+'!'+(headerRow+1)).reason.includes('金额'),'同一行号跨Sheet不串错误');
  await page.locator('.ui-import-feedback button').click();await page.locator('#ui-import-failure-pages select').selectOption('50');assert.match(await page.locator('#ui-import-history').innerText(),new RegExp('产品中心!'+(headerRow+1)));
  await page.locator('#ui-import-history [data-ui-history-close]').first().click();
  lastActual[15]='123.45';
  const filledBook=fillImportWorkbook(buffer,headerRow,lastActual,{sheet:books.length});
  await page.locator('#cec-file').setInputFiles({name:'全部部门.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:filledBook});
  await page.locator('#cec-confirm-import').click();await page.locator('#cec-import-dialog').waitFor({state:'hidden'});
  const allSaved=await audit(),lastItem=allSaved.metrics.find(item=>item.department==='product'&&item.metric===lastActual[2]);
  assert.equal(allSaved.store.months[lastItem.id+'|'+lastActual[4]+'-10'].actualCents,12345,'读取末尾部门Sheet的实际');
  assert(Object.keys(allSaved.store.departmentTargets).some(key=>key.startsWith('research|')),'同时读取首张Sheet的目标');
  await page.locator('#cec-import').click();
  const target=[...rows.find(row=>row[0]==='仓储部'&&row[3]==='部门目标')],actual=[...rows.find(row=>row[0]==='仓储部'&&row[1]==='包装降本'&&row[3]==='实际降本')];
  const upload=async values=>{
   const csv=[headers,...values].map(row=>row.map(value=>'"'+String(value??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
   await page.locator('#cec-file').setInputFiles({name:'层级模板.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  };
  target[5]=(Number(target[5])+1).toFixed(2);actual[15]='45.12';
  await upload([target,actual]);await page.locator('#cec-confirm-import').click();await page.locator('.ui-import-feedback button').waitFor();const failure=await page.evaluate(()=>JSON.parse(localStorage.getItem('dashboard-import-history-v1'))[0]);assert(failure.errors.some(row=>/年度目标须等于12个月/.test(row.message)));assert.deepEqual((await audit()).store,allSaved.store);
  target[15]=(Number(target[15])+1).toFixed(2);await upload([target,actual]);await page.locator('#cec-confirm-import').click();await page.locator('#cec-import-dialog').waitFor({state:'hidden'});
  const saved=await audit(),item=saved.metrics.find(item=>item.department==='warehouse'&&item.metric===actual[2]);
  assert.equal(saved.store.departmentTargets['warehouse|'+target[4]+'-10'].targetCents,Math.round(Number(target[15])*100));
  assert.equal(saved.store.months[item.id+'|'+actual[4]+'-10'].actualCents,4512);
  assert.equal(await page.locator('[data-cec-project="'+item.id+'"] .cec-number').innerText(),'45.12');
  const parent=page.locator('[data-cec-target-department="warehouse"] [data-cec-department-actual]'),child=page.locator('[data-cec-project="'+item.id+'"] .cec-number');
  const [a,b]=await Promise.all([parent.boundingBox(),child.boundingBox()]);assert(Math.abs(a.x+a.width-b.x-b.width)<2,'汇总和细项实际金额在同一列');
  assert(Object.values(saved.store.months).every(cell=>!Object.hasOwn(cell,'targetCents')),'细项不维护目标');
 }finally{
  await page.evaluate(({storage,original})=>original===null?localStorage.removeItem(storage):localStorage.setItem(storage,original),{storage,original});
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 }
 console.log('通过：部门/一级/二级月度展示、全部展开收起、目录与年度/月目标预填、下载件直接导入、年度核对和目标实际原子保存。');
}
