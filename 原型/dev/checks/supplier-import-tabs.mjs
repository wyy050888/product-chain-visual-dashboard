import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectImportWorkbook,fillImportWorkbook,fillImportWorkbookRows,importTemplateHeader} from './import-template-workbook.mjs';
export async function supplierImportTabs(page){
 const keys=['strategic-supplier-roster-v1','dashboard-import-history-v1'],previous=await page.evaluate(keys=>keys.map(key=>[key,localStorage.getItem(key)]),keys),audit=()=>page.evaluate(()=>strategicSupplierImportAudit());
 const out=new URL('../../outputs/supplier-revision-20261030/',import.meta.url);fs.mkdirSync(out,{recursive:true});
 const open=async()=>{await page.locator('#ssi-import').click();await page.locator('#ssi-import-dialog').waitFor();assert(await page.locator('.ssi-import-coverage').isVisible());assert.match(await page.locator('.ssi-import-coverage').innerText(),/按(?:合作|准入)年份覆盖[\s\S]*未列记录会删除[\s\S]*其他年份和(?:一级|二级)名单保留/)};
 const upload=async(buffer,name='校验.xlsx')=>{await page.locator('#ssi-file').setInputFiles({name,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});await page.locator('#ssi-confirm').click()};
 const failed=async()=>{await page.locator('.ui-import-feedback button').waitFor();return page.evaluate(()=>JSON.parse(localStorage.getItem('dashboard-import-history-v1'))[0])};
 try{
  await page.evaluate(keys=>keys.forEach(key=>localStorage.removeItem(key)),keys);await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await page.evaluate(()=>location.hash='#system-strategic-suppliers');await page.locator('#ssi-template').waitFor();
  assert.deepEqual(await page.locator('[data-ssi-tier]').allTextContents(),['一级核心战略合作供应商','二级核心物料供应商']);
  const sourceBoard=await page.evaluate(()=>supplierPlanningAudit());const files={};
  for(const [tier,count,required]of [['primary',8,7],['secondary',12,5]]){
   await page.locator(`[data-ssi-tier="${tier}"]`).click();assert.equal(await page.locator('#ssi-head th').count(),count+3);
   const pending=page.waitForEvent('download');await page.locator('#ssi-template').click();const download=await pending,buffer=fs.readFileSync(await download.path()),book=inspectImportWorkbook(buffer),header=importTemplateHeader(book),sample=book.rows.find(row=>row.row===header.row+1);
   assert.equal(header.values.length,count);assert.equal(header.values.filter(v=>v.startsWith('*')&&!v.includes('有合作日期时必填')).length,required);assert.equal(book.marks.filter(c=>c.cell.endsWith(String(header.row))&&c.runs.some(r=>r.text==='*'&&r.color==='FFD92848')).length,tier==='secondary'?10:required);assert.equal(book.sheetNames.length,1);assert(book.sheetNames[0].startsWith(tier==='primary'?'一级':'二级'));
   assert(header.values.every(v=>!v.includes('多个')));assert.match(sample.values[0],/^【示例】/);assert(sample.values.every(Boolean),'示例补齐日期、物料、品牌、产品及评级');
   assert.match(book.rows.slice(0,header.row-1).flatMap(r=>r.values).join(' '),/每行一条关系/);assert.match(book.rows[1].values[0],/按(?:合作|准入)年份覆盖[\s\S]*未列记录会删除/);
   fs.copyFileSync(await download.path(),new URL(download.suggestedFilename(),out));files[tier]={buffer,header,sample,book};
  }
  await page.locator('[data-ssi-tier="primary"]').click();const primary=files.primary,secondary=files.secondary,before=await audit(),row=[...primary.sample.values];row[0]='一级导入验证';
  // Required date and wrong-tab schema both fail atomically, with per-tab batch histories.
  await open();const noDate=[...row];noDate[1]='';await upload(fillImportWorkbook(primary.buffer,primary.header.row,noDate,{keepExample:true}));let failure=await failed();assert(failure.errors.some(e=>e.message.includes('合作日期必填')));assert.deepEqual((await audit()).store,before.store);await page.locator('[data-ssi-close]').first().click();
  await open();await upload(secondary.buffer);failure=await failed();assert(failure.errors.some(e=>/表头不匹配/.test(e.message)));assert.equal(failure.module,'一级核心战略合作供应商');await page.locator('[data-ssi-close]').first().click();
  await open();await upload(fillImportWorkbook(primary.buffer,primary.header.row,row,{keepExample:true}));await page.locator('#ssi-import-dialog').waitFor({state:'hidden'});let saved=await audit();assert.equal(saved.store.rows.length,1);assert.equal(saved.store.rows[0].tier,'primary');assert.equal(saved.store.rows[0].cooperationRating,'二星');assert.equal(saved.store.rows[0].actor,'管理员');assert(Number.isFinite(Date.parse(saved.store.rows[0].updatedAt)),'成功导入记录实际保存时间');assert.equal(await page.evaluate(()=>supplierPlanningAudit().annual.newCooperation),1);
  assert.deepEqual((await audit()).rows.map(item=>item.name),[row[0]],'首次全覆盖不保留旧样例');
  const cleared=[...row];cleared[7]='';await open();await upload(fillImportWorkbook(primary.buffer,primary.header.row,cleared,{keepExample:true}));await page.locator('#ssi-import-dialog').waitFor({state:'hidden'});assert.equal((await audit()).store.rows[0].cooperationRating,'','选填留空清空旧评级');
  const covered=await audit(),coveredBoard=await page.evaluate(()=>supplierPlanningAudit());
  for(const original of sourceBoard.companies.filter(row=>row.cooperation?.startsWith('2025-')))assert.equal(coveredBoard.companies.find(row=>row.id===original.id).cooperation,original.cooperation,'一级覆盖2026不清空2025合作事实');
  for(const original of sourceBoard.capabilities.filter(item=>item.kind==='machine'))assert(coveredBoard.capabilities.some(item=>item.supplierId===original.supplierId&&item.kind===original.kind&&item.categoryId===original.categoryId&&item.brand===original.brand&&item.material===original.material&&item.productCode===original.productCode&&item.reserved===original.reserved&&item.admitted===original.admitted),'一级全覆盖保留独立意向/准入事实');
  assert(sourceBoard.companies.every(company=>coveredBoard.companies.some(item=>item.id===company.id)),'全覆盖不删除供应商主体');
  await open();await upload(primary.buffer);await failed();assert.deepEqual((await audit()).store,covered.store,'只有示例的空模板不能清空名单');await page.locator('[data-ssi-close]').first().click();
  const valid=[...row],bad=[...row];valid[0]='不应写入的有效行';bad[0]='';await open();await upload(fillImportWorkbookRows(primary.buffer,primary.header.row,[valid,bad]));await failed();assert.deepEqual((await audit()).store,covered.store,'含错误文件不能覆盖任何已有行');assert.deepEqual(await page.evaluate(()=>supplierPlanningAudit().capabilities),coveredBoard.capabilities);await page.locator('[data-ssi-close]').first().click();
  // Secondary admission is valid without cooperation fields and does not alter primary rows.
  await page.locator('[data-ssi-tier="secondary"]').click();const admitted=[...secondary.sample.values];admitted[0]='二级准入验证';for(let i=5;i<12;i++)admitted[i]='';
  await open();await upload(fillImportWorkbook(secondary.buffer,secondary.header.row,admitted,{keepExample:true}));await page.locator('#ssi-import-dialog').waitFor({state:'hidden'});saved=await audit();assert.equal(saved.store.rows.length,2);const record=saved.store.rows.find(r=>r.tier==='secondary');assert(record.admitted);assert.equal(record.cooperation,'');
  const board=await page.evaluate(()=>supplierPlanningAudit());const caps=board.capabilities.filter(c=>c.supplierId===record.supplierId);assert.equal(caps.length,1);assert.equal(caps[0].kind,'material');assert.equal(caps[0].material,'电机');assert.equal(caps[0].brand,admitted[4]);assert.equal(caps[0].cooperation,null);assert.equal(board.annual.newCooperation,1,'二级准入不增加一级合作');
  assert.equal((await audit()).rows.some(r=>r.name==='一级导入验证'),false);
  // 同一文件含两种物料才同时保留，两条关系仍属于同一供应商。
  const other=[...admitted];other[3]='电池';await open();await upload(fillImportWorkbookRows(secondary.buffer,secondary.header.row,[admitted,other],{keepExample:true}));await page.locator('#ssi-import-dialog').waitFor({state:'hidden'});
  saved=await audit();const same=saved.store.rows.filter(r=>r.name===admitted[0]);assert.equal(same.length,2);assert.equal(new Set(same.map(r=>r.supplierId)).size,1);
  const incomplete=[...admitted];incomplete[0]='合作信息不完整';incomplete[5]=admitted[1];await open();await upload(fillImportWorkbook(secondary.buffer,secondary.header.row,incomplete,{keepExample:true}));failure=await failed();for(const label of ['合作产品类目','合作核心零部件','合作产品SPU码','合作产品名称','合作品牌'])assert(failure.errors.some(e=>e.message.includes(label)&&e.message.includes('必填')));assert(!(await audit()).store.rows.some(r=>r.name===incomplete[0]));await page.locator('[data-ssi-close]').first().click();
  const complete=[...secondary.sample.values];complete[0]='二级完整合作验证';complete[11]='';await open();await upload(fillImportWorkbookRows(secondary.buffer,secondary.header.row,[admitted,other,complete],{keepExample:true}));await page.locator('#ssi-import-dialog').waitFor({state:'hidden'});assert((await audit()).store.rows.some(r=>r.name===complete[0]&&r.cooperation&&!r.cooperationRating));
  const multi=[...admitted];multi[0]='多值不应导入';multi[3]='电机、电池';await open();await upload(fillImportWorkbook(secondary.buffer,secondary.header.row,multi,{keepExample:true}));failure=await failed();assert(failure.errors.some(e=>/拆成多行/.test(e.message)));assert(!(await audit()).store.rows.some(r=>r.name===multi[0]));assert.equal(failure.failedRows[0].row,secondary.header.row+2);await page.locator('[data-ssi-close]').first().click();
  // Both tab templates use normalized Chinese/English punctuation, preserving SPU code separators.
  const invalid=[...admitted];invalid[0]='无效先后日期';invalid[5]='2000/01/01';await open();await upload(fillImportWorkbook(secondary.buffer,secondary.header.row,invalid,{keepExample:true}));assert((await failed()).errors.some(e=>/不得早于/.test(e.message)));await page.locator('[data-ssi-close]').first().click();
  await page.locator('#ssi-history').click();assert.match(await page.locator('#ui-import-history h2').innerText(),/二级核心物料供应商/);assert(!(await page.locator('#ui-import-history').innerText()).includes('一级核心战略合作供应商'));await page.keyboard.press('Escape');
  const persisted=(await audit()).store;await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');assert.deepEqual((await audit()).store,persisted);
  // 管理列不进入模板；同供应商两条物料关系独立移除，取消不改数量。
  await page.locator('[data-ssi-tier="secondary"]').click();
  assert.deepEqual((await page.locator('#ssi-head th').allTextContents()).slice(-3),['更新人','更新时间','操作']);
  await page.locator('#ssi-query').fill(admitted[0]);
  const motor=()=>page.locator('#ssi-body tr').filter({hasText:admitted[0]}).filter({hasText:'电机'});
  assert.equal(await motor().locator('.ssi-actor').innerText(),'管理员');
  assert.match(await motor().locator('.ssi-updatedAt').innerText(),/^\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/);
  const motorStamp=(await audit()).store.rows.find(row=>row.name===admitted[0]&&row.admissionMaterial==='电机').updatedAt;
  await motor().locator('[data-ssi-remove]').click();await page.locator('#ssi-remove-dialog [data-ssi-remove-close]').last().click();
  assert.equal((await audit()).store.rows.filter(row=>row.name===admitted[0]).length,2);
  await motor().locator('[data-ssi-remove]').click();await page.locator('#ssi-remove-confirm').click();
  assert.equal(await motor().count(),0);assert.equal(await page.locator('#ssi-query').inputValue(),admitted[0]);
  let remaining=(await audit()).store.rows;assert(remaining.some(row=>row.name===admitted[0]&&row.admissionMaterial==='电池'));assert(remaining.some(row=>row.name==='一级导入验证'));
  assert.equal((await page.evaluate(()=>supplierPlanningAudit())).capabilities.filter(cap=>cap.supplierId===record.supplierId).length,1,'统计去掉电机，保留电池');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
  assert(!(await audit()).store.rows.some(row=>row.name===admitted[0]&&row.admissionMaterial==='电机'),'刷新不恢复');
  // 成功重导入可恢复，并记录本次操作时间。
  await page.locator('[data-ssi-tier="secondary"]').click();await page.locator('#ssi-query').fill(admitted[0]);
  await open();await upload(fillImportWorkbook(secondary.buffer,secondary.header.row,admitted,{keepExample:true}));await page.locator('#ssi-import-dialog').waitFor({state:'hidden'});
  assert.equal(await motor().count(),1);assert((await audit()).store.rows.find(row=>row.name===admitted[0]&&row.admissionMaterial==='电机').updatedAt>=motorStamp);
  // 单行重新全覆盖后，文件未列的旧物料和合作记录都必须消失，刷新也不回填。
  await page.locator('#ssi-query').fill('');assert.deepEqual((await audit()).rows.map(item=>[item.name,item.admissionMaterial]),[[admitted[0],'电机']]);
  assert(!(await audit()).store.rows.some(item=>item.tier==='secondary'&&item.admissionMaterial==='电池'));
  assert(!(await audit()).rows.some(item=>item.sourceKey));
  const primaryBefore=(await audit()).store.rows.filter(item=>item.tier==='primary');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await page.locator('[data-ssi-tier="secondary"]').click();
  assert.deepEqual((await audit()).rows.map(item=>[item.name,item.admissionMaterial]),[[admitted[0],'电机']]);assert.deepEqual((await audit()).store.rows.filter(item=>item.tier==='primary'),primaryBefore,'二级全覆盖及刷新不改一级');
  const afterBoard=await page.evaluate(()=>supplierPlanningAudit());assert.deepEqual(afterBoard.capabilities.filter(row=>row.kind==='material'&&!row.admitted?.startsWith('2026-')),sourceBoard.capabilities.filter(row=>row.kind==='material'&&!row.admitted?.startsWith('2026-')),'二级覆盖2026保留其他年份及无准入日期的来源关系');assert.equal(afterBoard.capabilities.filter(item=>item.kind==='material'&&item.admitted?.startsWith('2026-')).length,1,'本年旧二级能力不回填，其他年份保留');assert.equal(afterBoard.annual.newCooperation,1,'一级年度合作数只来自覆盖后的文件');
  // 同一主体跨一级、二级时，二级的更早合作日期不能改写一级合作日期和统计。
  const shared=[...secondary.sample.values];shared[0]=row[0];shared[1]='2024/01/01';shared[5]='2025/01/01';
  await open();await upload(fillImportWorkbook(secondary.buffer,secondary.header.row,shared));await page.locator('#ssi-import-dialog').waitFor({state:'hidden'});
  assert.deepEqual((await audit()).store.rows.filter(item=>item.tier==='primary'),primaryBefore);assert.equal(await page.evaluate(()=>supplierPlanningAudit().annual.newCooperation),1);
  const beforeFailure=(await audit()).store,beforeFailureCaps=await page.evaluate(()=>supplierPlanningAudit().capabilities);
  await page.evaluate(()=>{window.__ssiOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='strategic-supplier-roster-v1')throw new DOMException('test','QuotaExceededError');return window.__ssiOriginalSetItem.call(this,key,value)}});
  const unsaved=[...admitted];unsaved[0]='保存失败不得替换';await open();await upload(fillImportWorkbook(secondary.buffer,secondary.header.row,unsaved));
  assert((await failed()).errors.some(error=>error.message.includes('保存失败')));assert.deepEqual((await audit()).store,beforeFailure);assert.deepEqual(await page.evaluate(()=>supplierPlanningAudit().capabilities),beforeFailureCaps,'写入失败不能先改统计');
  await page.evaluate(()=>{Storage.prototype.setItem=window.__ssiOriginalSetItem;delete window.__ssiOriginalSetItem});await page.locator('[data-ssi-close]').first().click();
  for(const width of [1920,390]){await page.setViewportSize({width,height:1080});await page.evaluate(()=>location.hash='#system-strategic-suppliers');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));}
 }finally{
  await page.evaluate(()=>{if(window.__ssiOriginalSetItem){Storage.prototype.setItem=window.__ssiOriginalSetItem;delete window.__ssiOriginalSetItem}});
  await page.evaluate(previous=>previous.forEach(([key,value])=>value===null?localStorage.removeItem(key):localStorage.setItem(key,value)),previous);await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 }
 console.log('通过：8/12列及7/5必填、双Tab模板/历史隔离、必填及日期失败、全覆盖/类型隔离/空白清除/整批失败/空模板保护、物料统计、更新信息、取消/移除/重导入及刷新持久化。');
}
