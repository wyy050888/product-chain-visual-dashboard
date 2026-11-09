import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectImportWorkbook,cleanTemplateHeader} from './import-template-workbook.mjs';

export async function supplierExport(page){
 const storage='strategic-supplier-roster-v1',history='dashboard-import-history-v1';
 const previous=await page.evaluate(keys=>keys.map(key=>[key,localStorage.getItem(key)]),[storage,history]);
 const audit=()=>page.evaluate(()=>strategicSupplierImportAudit());
 const reload=async()=>{await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await page.evaluate(()=>location.hash='#system-strategic-suppliers');await page.locator('#ssi-export').waitFor()};
 try{
  await page.evaluate(()=>location.hash='#system-strategic-suppliers');await page.locator('#ssi-export').waitFor();
  const fixtures=[];
  for(const tier of ['primary','secondary']){
   await page.locator('[data-ssi-tier="'+tier+'"]').click();await page.locator('#ssi-reset').click();
   const base=(await audit()).rows.find(row=>tier==='primary'||row.admissionMaterial);assert(base);
   for(let index=0;index<25;index++){
    const row={...base,name:tier==='primary'&&index===0?'=SUM(1,1)':'导出验证-'+tier+'-'+String(index).padStart(2,'0'),supplierId:'EXPORT-'+tier+'-'+index,actor:'导出核验',updatedAt:'2026-10-30T01:02:03.000Z'};
    delete row.sourceKey;fixtures.push(row);
   }
  }
  const beforeStore=(await audit()).store;
  await page.evaluate(({storage,store,fixtures})=>localStorage.setItem(storage,JSON.stringify({...store,revision:store.revision+1,rows:[...store.rows,...fixtures]})),{storage,store:beforeStore,fixtures});
  await reload();const historyBefore=await page.evaluate(key=>localStorage.getItem(key),history);
  const downloads=[];page.on('download',download=>downloads.push(download));
  const downloadRows=async(tier,expected)=>{
   const label=tier==='primary'?'一级核心战略合作供应商':'二级核心物料供应商',before=JSON.stringify(await audit()),currentPage=await page.locator('#ssi-pagination .list-pagination').getAttribute('data-list-current');
   const pending=page.waitForEvent('download');await page.locator('#ssi-export svg').click();const download=await pending;
   assert(download.suggestedFilename().startsWith(label+'_'));assert(download.suggestedFilename().endsWith('.xlsx'));
   const book=inspectImportWorkbook(fs.readFileSync(await download.path())),headers=book.rows[0].values.map(cleanTemplateHeader),data=book.rows.slice(1);
   assert.deepEqual(book.sheetNames,[label]);assert.deepEqual(headers,(await page.locator('#ssi-head th').allTextContents()).slice(0,-1));
   assert.equal(headers.length,tier==='primary'?10:14);assert(!headers.includes('操作'));assert(!headers.some(label=>label.startsWith('*')));
   assert.equal(data.length,expected.length,'导出全部匹配记录，不受当前页限制');assert.deepEqual(data.map(row=>row.values[0]),expected.map(row=>row.name),'保持列表筛选后的顺序');
   const code=headers.indexOf('合作产品SPU码'),cooperation=headers.indexOf('合作日期');
   for(const [index,row]of expected.entries()){
    assert.equal(data[index].values[code],row.productCode||'','SPU文本标识保留原值');
    assert.equal(data[index].values[cooperation],(row.cooperation||'').replaceAll('-','/'));
    if(row.actor==='导出核验')assert.deepEqual(data[index].values.slice(-2),['导出核验','2026/10/30 09:02:03']);
    if(!row.updatedAt)assert.equal(data[index].values.at(-1),'','历史未知时间保持空值');
    if(tier==='secondary')assert.equal(data[index].values[3],row.admissionMaterial||'');
   }
   assert.equal(JSON.stringify(await audit()),before,'导出不修改记录或筛选结果');assert.equal(await page.locator('#ssi-pagination .list-pagination').getAttribute('data-list-current'),currentPage);
  };
  for(const tier of ['primary','secondary']){
   await page.locator('[data-ssi-tier="'+tier+'"]').click();await page.locator('#ssi-reset').click();
   await page.locator('#ssi-pagination .list-page-size').selectOption('10');await page.locator('#ssi-pagination [aria-label="第2页"]').click();
   const all=(await audit()).rows;assert(all.length>20);await downloadRows(tier,all);
   await page.locator('#ssi-query').fill('导出验证-'+tier+'-');
   if(tier==='secondary'){
    const material=fixtures.find(row=>row.tier==='secondary').admissionMaterial,menu=page.locator('#ssi-material-field .pf-multi');
    await menu.locator('summary').click();await menu.locator('[data-pf-multi-option][value='+JSON.stringify(material)+']').check();await page.keyboard.press('Escape');
   }
   const filtered=(await audit()).rows;assert(filtered.length>10);await downloadRows(tier,filtered);
   await page.locator('#ssi-query').fill('不存在的导出记录-EMPTY');const count=downloads.length;
   await page.locator('#ssi-export').click();assert.equal(await page.locator('#toast').innerText(),'当前筛选下暂无可导出数据');assert.equal(downloads.length,count,'空结果不生成伪数据文件');
  }
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),history),historyBefore,'导出不写入导入历史');
  await page.locator('#ssi-reset').click();
  for(const width of [1920,390]){
   await page.setViewportSize({width,height:1080});const button=page.locator('#ssi-export'),box=await button.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  }
 }finally{await page.evaluate(previous=>previous.forEach(([key,value])=>value===null?localStorage.removeItem(key):localStorage.setItem(key,value)),previous);await reload()}
 console.log('通过：一级/二级Excel导出、完整筛选结果跨页导出、字段和元数据、文本标识、空结果、只读及宽窄屏。');
}
