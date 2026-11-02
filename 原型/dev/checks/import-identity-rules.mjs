import assert from 'node:assert/strict';
import fs from 'node:fs';
const csv=rows=>Buffer.from('\uFEFF'+rows.map(row=>row.map(value=>'"'+String(value??'').replaceAll('"','""')+'"').join(',')).join('\r\n'));
export async function importIdentityRules(page){
 await page.clock.setFixedTime(new Date('2026-10-28T04:00:00Z'));await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const samples=await page.evaluate(()=>referenceSampleAudit()),product=samples.spus.find(p=>samples.spus.filter(v=>v.spuCode===p.spuCode).length===1);
 const upload=async(selector,rows)=>page.locator(selector).setInputFiles({name:'标识规则.csv',mimeType:'text/csv',buffer:csv(rows)});
 await page.evaluate(()=>location.hash='#ai');await page.locator('#ai [data-gd-part="tasks"]').click();await page.locator('[data-gd-task-import]').click();
 const taskHeaders=['业务对象类型','业务对象ID','事项名称','优先级','问题描述','执行事项','负责人','计划完成日期'];
 for(const [reference,due,valid]of [[product.spuCode,'2026/11/04',true],[product.name,'2026/11/04',false],[product.spuCode,'2026-11-04',false],[product.spuCode,'2026/02/30',false]]){
  await upload('[data-gd-task-file]',[taskHeaders,['产品',reference,'标识回归','P2','核对标识','核对档案','林悦',due]]);await page.locator('[data-gd-task-import-preview]').getByText(/校验通过|处错误/).first().waitFor();assert.equal(await page.locator('[data-gd-task-confirm]').isEnabled(),valid,'任务 '+reference+' '+due);
 }
 await page.locator('[data-gd-entry-close]').first().click();await page.evaluate(()=>location.hash='#system-core-links');
 const core=await page.evaluate(()=>{const row=coreLinkConfigSnapshot().rows[0];return {...row,product:referenceSampleAudit().spus.find(p=>p.spuId===row.spuId)}});
 await page.locator('#klc-import').click();
 for(const [shop,month,valid]of [[core.shopId,'2026/10',true],['KONKA康佳健康电器旗舰店','2026/10',false],[core.shopId,'2026-10',false]]){
  await upload('#klc-file',[['月份','商品链接名称','链接ID','店铺名称','店铺ID'],[month,'导入商品链接名称','799999900986','店铺展示名称',shop]]);await page.locator('[data-klc-preview] table').waitFor();assert.equal(await page.locator('[data-klc-preview] .klc-error').count()===0,valid,'核心链接 '+shop+' '+month);if(valid){if(await page.locator('#klc-overwrite').count())await page.locator('#klc-overwrite').check();assert((await page.locator('[data-klc-preview]').innerText()).includes('导入商品链接名称'));await page.locator('#klc-confirm-import').click();const saved=await page.evaluate(()=>coreLinkConfigSnapshot().rows.find(row=>row.linkId==='799999900986'));assert.equal(saved.name,'导入商品链接名称');assert.equal(saved.shopId,core.shopId);await page.locator('#klc-import').click()}
 }
 await page.locator('[data-klc-close]').first().click();await page.evaluate(()=>location.hash='#system-strategic-suppliers');await page.locator('#ssi-import').click();
 const supplierCategory=await page.evaluate(()=>strategicSupplierImportAudit().cooperations.find(row=>row.categoryPath).categoryPath);
 const supplierHeaders=['供应商名称','合作日期','合作产品类目（到三级）','合作产品SPU码','合作产品名称','合作品牌','引入评级','合作评级'];
 for(const [code,name,date,valid]of [[product.spuCode,'不参与匹配的旧名称','2026/01/02',true],['',product.name,'2026/01/02',false],[product.name,product.name,'2026/01/02',false],[product.spuCode,'','2026-01-02',false]]){
  await upload('#ssi-file',[supplierHeaders,['标识规则供应商',date,supplierCategory,code,name,product.brand,'一星','二星']]);await page.locator('#ssi-result .cec-import-summary').waitFor();assert.equal(await page.locator('#ssi-confirm').isEnabled(),valid,'供应商 '+code+' '+date);if(valid){assert((await page.locator('#ssi-result').innerText()).includes(product.name));await page.locator('#ssi-confirm').click();const saved=await page.evaluate(()=>strategicSupplierImportAudit().store.rows.find(row=>row.name==='标识规则供应商'));assert.equal(saved.productCode,product.spuCode);assert.equal(saved.productName,product.name);assert.equal(saved.cooperation,'2026-01-02');await page.locator('#ssi-import').click()}
 }
 await page.locator('[data-ssi-close]').first().click();await page.goto(new URL('../../采购部.html',import.meta.url).href);await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await page.locator('[data-pb-action="risk-list"][data-key="1"]').first().click();
 for(let type=0;type<5;type++){
  await page.locator('#cw-type').selectOption(String(type));const pending=page.waitForEvent('download');await page.locator('#cw-demo-file').click();const raw=fs.readFileSync(await(await pending).path(),'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).map(line=>line.split(',').map(value=>JSON.parse(value)));
  const headers=raw[0],original=raw[1],date=headers.indexOf('数据日期'),code=headers.indexOf('SPU码'),name=headers.indexOf('产品名称');assert.match(original[date],/^\d{4}\/\d{2}\/\d{2}$/);if(type!==4)assert(code>=0&&original[code]);
  const baseline=[...original];if(name>=0)baseline[name]='不参与匹配的旧名称';const badDate=[...baseline];badDate[date]='2026-01-02';const variants=[[baseline,true],[badDate,false]];if(type!==4){const wrong=[...baseline],missing=[...baseline];wrong[code]=original[name];missing[code]='';variants.push([wrong,false],[missing,false])}
  await page.locator('#cw-import').click();for(const [values,valid]of variants){await upload('#cw-file',[headers,values]);await page.locator('#cw-preview .cw-summary').waitFor();assert.equal(await page.locator('#cw-confirm').isEnabled(),valid,'成本类型'+type);if(valid&&name>=0)assert(!(await page.locator('#cw-preview').innerText()).includes('不参与匹配'))}
  await upload('#cw-file',[headers,baseline]);await page.locator('#cw-preview .cw-summary').waitFor();await page.locator('#cw-confirm').click();const saved=await page.evaluate(type=>JSON.parse(localStorage.getItem('procurement-cost-import-v1')).records.find(row=>row.type===type),type);assert(saved);if(type!==4)assert.equal(saved.productCode,original[code]);assert.match(saved.date,/^\d{4}-\d{2}-\d{2}$/);
  await page.locator('#close').click();if(!await page.locator('#cw-type').isVisible())await page.locator('[data-pb-action="risk-list"][data-key="1"]').first().click();
 }
 await page.locator('#close').click();await page.goto(new URL('../../数智罗盘/目标管理/目标管理.html',import.meta.url).href);await page.waitForFunction(()=>window.GoalPrototype?.importSource);
 for(const kind of ['product','link']){
  const buffer=fs.readFileSync(new URL('../../数智罗盘/目标管理/assets/templates/'+kind+'-target.xlsx',import.meta.url));const result=await page.evaluate(({bytes,kind})=>{
   const app=GoalPrototype,source=app.importSource.read(XLSX.read(new Uint8Array(bytes),{type:'array'}),kind),checked=app.entryImportData.validate(kind,source.matrix,'一类不含 CID',source),input=Object.fromEntries(app.entrySchema.fields(kind).map(([key],i)=>[key,source.matrix[1][i]])),parse=value=>app.entrySchema.normalize(kind,value,{validateBrand:true,importMode:true});
   const plan=checked.errors.length?null:app.targetStore.importPlan(kind,checked.rows.map(row=>row.record),'一类不含 CID');
   return {months:plan?.months,header:source.headerError,errors:checked.errors,required:app.entrySchema.headers(kind),valid:parse({...input,product:'不参与匹配的旧名称'}),wrongShop:parse({...input,shop:app.entrySchema.catalog().shops.find(s=>s.shopId===input.shop)?.shop}).errors,wrongCode:parse({...input,productCode:input.product}).errors,missingCode:parse({...input,productCode:''}).errors};
  },{bytes:[...buffer],kind});assert.deepEqual(result.months,[10,11,12]);assert.equal(result.header,false);assert.deepEqual(result.errors,[],kind+'模板示例可导入');assert.deepEqual(result.valid.errors,{});assert(!result.valid.record.product.includes('不参与匹配'));assert(result.required.includes('*SPU码'));assert(result.required.includes('*店铺ID'));assert(!result.required.includes('*产品名称（SPU）'));assert(Object.keys(result.wrongShop).length);assert(Object.keys(result.wrongCode).length);assert(Object.keys(result.missingCode).length);
 }
 console.log('通过：任务、核心链接、供应商、成本和两类目标按SPU码/店铺ID匹配，名称不参与关联；斜杠日期、错误标识拒绝及下载样例可导入。');
}
