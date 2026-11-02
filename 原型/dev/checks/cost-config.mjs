import {verifyCombinedCostImport} from './cost-config-combined.mjs';
import {inspectImportWorkbook,cleanTemplateHeader} from './import-template-workbook.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
export async function costConfig(page){
 const key='cost-efficiency-config-v1',route='#system-cost-efficiency',audit=()=>page.evaluate(()=>costConfigAudit()),cost=()=>page.evaluate(()=>costControlAudit({year:2026,mode:'month',value:10}));
 const reload=async()=>{await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await page.locator('#lt-system-nav').click();await page.locator('[data-system-route="'+route+'"]').click()};
 await page.evaluate(key=>localStorage.removeItem(key),key);await reload();
 const baseline=await cost(),initial=await audit(),item=baseline.items.find(row=>row.department==='warehouse'&&row.category==='packaging');
 assert.equal(initial.store.version,4);assert.equal(Object.values(initial.store.departmentTargets).filter(cell=>Number.isFinite(cell.targetCents)).length>12,true);
 // 已存细项目标迁移一次，按部门月份汇总；实际零值和备注保留。
 await page.evaluate(({key,id,ids})=>localStorage.setItem(key,JSON.stringify({version:3,metrics:{},months:Object.fromEntries(ids.map(itemId=>[itemId+'|2026-10',itemId===id?{targetCents:12345,actualCents:0,note:'保留旧记录',updatedAt:'2026-10-20 10:00:00'}:{targetCents:0}]))})),{key,id:item.id,ids:baseline.items.filter(row=>row.department==='warehouse').map(row=>row.id)});await reload();
 let data=await audit();assert.equal(data.store.version,4);assert.equal(data.store.departmentTargets['warehouse|2026-10'].targetCents,12345);assert.equal(data.store.months[item.id+'|2026-10'].actualCents,0);assert.equal(data.store.months[item.id+'|2026-10'].note,'保留旧记录');assert(!Object.hasOwn(data.store.months[item.id+'|2026-10'],'targetCents'));
 assert.deepEqual(await page.locator('#cec-head th').allTextContents(),['责任部门','一级类目','二级类目','年度目标（元）','月度目标金额（元）','月度实际降本金额（元）','更新人','更新时间','操作']);
 assert.equal(await page.locator('#cec-body>tr[data-cec-target-department]').count(),9);
 const manual='#cec-new,[data-cec-target-edit],[data-cec-add-actual],[data-cec-edit],#cec-start-edit,#cec-save,#cec-department-editor';
 assert.equal(await page.locator(manual).count(),0,'无手动新增、编辑与保存入口');
 assert.equal(await page.locator('[data-cec-config-view],#cec-category').count(),0);
 const download=async()=>{const pending=page.waitForEvent('download');await page.locator('#cec-template').click();const file=await pending;assert.match(file.suggestedFilename(),/\.xlsx$/);return inspectImportWorkbook(fs.readFileSync(await file.path())).rows.map(row=>row.values.map(cleanTemplateHeader).join(',')).join('\n')};
 const targetTemplate=await download();assert.match(targetTemplate,/责任部门,一级类目,二级类目,数据类型,年度,年度目标（元）,1月/);assert.match(targetTemplate,/部门目标/);assert.match(targetTemplate,/实际降本/);
 const upload=async(rows)=>{await page.locator('#cec-import').click();await page.locator('#cec-file').setInputFiles({name:'降本.csv',mimeType:'text/csv',buffer:Buffer.from('\uFEFF'+rows.map(row=>row.join(',')).join('\r\n'))});await page.locator('#cec-import-result .cec-import-summary').waitFor()};
 const confirm=async()=>{if(await page.locator('#cec-overwrite').count())await page.locator('#cec-overwrite').check();await page.locator('#cec-confirm-import').click()};
 const months=Array.from({length:12},(_,i)=>(i+1)+'月'),targetHeaders=['责任部门','年度',...months],targetRow=['仓储部','2026',...Array(9).fill(''),'500.01','',''];
 const untouched=(await audit()).store.departmentTargets['warehouse|2026-11'].targetCents;await upload([targetHeaders,targetRow]);assert.match(await page.locator('#cec-import-result').innerText(),/部门目标/);await confirm();assert.equal((await audit()).store.departmentTargets['warehouse|2026-10'].targetCents,50001);assert.equal((await audit()).store.departmentTargets['warehouse|2026-11'].targetCents,untouched);
 await upload([targetHeaders,targetRow,targetRow]);assert.match(await page.locator('#cec-import-result').innerText(),/重复/);assert(await page.locator('#cec-confirm-import').isDisabled());await page.locator('[data-cec-import-close]').first().click();
 // 展开及月度明细只读；查看、切换年份不改变目标或实际。
 await page.locator('#cec-department').selectOption('warehouse');await page.locator('#cec-query').fill(item.metric);
 assert.equal(await page.locator('#cec-body>tr[data-cec-target-department]').count(),1);
 if(await page.locator('[data-cec-expand="warehouse"]').getAttribute('aria-expanded')==='false')await page.locator('[data-cec-expand="warehouse"]').click();
 assert.equal(await page.locator('.cec-no-target').filter({hasText:/目标|达成|差额|\d/}).count(),0,'细项不显示目标数据');
 assert.equal(await page.locator(manual).count(),0,'展开后无手动入口');
 const beforeTargets=JSON.stringify((await audit()).store.departmentTargets),beforeView=JSON.stringify((await audit()).store),editor=page.locator('#cec-editor');
 await page.locator('[data-cec-view="'+item.id+'"]').click();
 assert.equal(await editor.locator('input:not(:disabled),select:not(:disabled):not(#cec-editor-year),#cec-start-edit,#cec-save').count(),0,'明细不能转入编辑');
 await editor.locator('#cec-editor-year').selectOption('2027');await editor.locator('#cec-editor-year').selectOption('2026');
 await page.keyboard.press('Escape');assert.equal(JSON.stringify((await audit()).store),beforeView,'只读查看没有写入');
 const actualTemplate=await download();assert.match(actualTemplate,/责任部门,一级类目,二级类目,数据类型,年度,年度目标（元）,1月/);assert.match(actualTemplate,/部门目标/);assert.match(actualTemplate,/实际降本/);
 const actualHeaders=['责任部门','降本分类','降本指标','年度',...months,'备注'],actualRow=['仓储部','包装降本',item.metric,'2026',...Array(9).fill(''),'9000.12','','','价格执行'];
 await upload([actualHeaders,actualRow]);assert.match(await page.locator('#cec-import-result').innerText(),/实际降本/);await confirm();assert.equal((await audit()).store.months[item.id+'|2026-10'].actualCents,900012);assert.equal(JSON.stringify((await audit()).store.departmentTargets),beforeTargets);

 const addedRow=['仓储部','包装降本','导入新增实际降本样例','2026',...Array(9).fill(''),'100.25','','',''];
 await upload([actualHeaders,addedRow]);assert.match(await page.locator('#cec-import-result').innerText(),/校验通过/);await confirm();data=await audit();
 const added=data.metrics.find(row=>row.metric==='导入新增实际降本样例');assert(added,'导入可以新增降本指标');assert.equal(data.store.months[added.id+'|2026-10'].actualCents,10025);assert.equal(JSON.stringify(data.store.departmentTargets),beforeTargets);
 assert(data.store.months&&Object.values(data.store.months).every(cell=>!Object.hasOwn(cell,'targetCents')));assert((await cost()).ledger.every(row=>!Object.hasOwn(row,'targetCents')));
 // 新目标台账刷新后保持稳定；分类与细项不再派生目标或差额。
 await reload();assert.equal(JSON.stringify((await audit()).store.departmentTargets),beforeTargets);const totals=await cost();for(const mode of ['month','quarter','year']){assert.equal(totals.rows.reduce((n,row)=>n+(row.values[mode].target??0),0),totals.totals[mode].target);assert.equal(totals.categoryRows.reduce((n,row)=>n+(row.values[mode].actual??0),0),totals.totals[mode].actual);assert(totals.categoryRows.every(row=>Object.keys(row.values[mode]).join()==='actual'))}
 await verifyCombinedCostImport(page,item);
 for(const width of [1920,390]){await page.setViewportSize({width,height:1080});await page.locator('#cec-department').selectOption('warehouse');await page.locator('#cec-query').fill('');const toggle=page.locator('[data-cec-expand="warehouse"]');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();assert(await page.locator('#cec-page').evaluate(e=>e.scrollWidth<=e.clientWidth+1));assert(await page.locator('#cec-page .cec-table-scroll').evaluate(e=>e.scrollWidth>0));}
 await page.setViewportSize({width:1920,height:1080});await page.evaluate(key=>localStorage.removeItem(key),key);await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 console.log('通过：降本目标与实际仅导入维护，无新增/编辑/保存入口；只读明细、导入新增、原子更新与失败回滚、历史迁移、刷新及宽窄屏。');
}
