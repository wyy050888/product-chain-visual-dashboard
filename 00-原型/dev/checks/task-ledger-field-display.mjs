import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {inspectImportWorkbook,importTemplateHeader,cleanTemplateHeader,fillImportWorkbookRows} from './import-template-workbook.mjs';

export async function taskLedgerFieldDisplay(page){
 await page.clock.setFixedTime(new Date('2026-11-05T04:00:00Z'));await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');
 const root=page.locator('#ai'),entry=page.locator('.gd-task-entry-dialog'),saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('dashboard.global-manual-tasks.v1')||'[]'));
 await root.locator('[data-gd-part=tasks]').click();await root.locator('[data-gd-task-create]').click();
 const departments=['采购部','产品链','项目部','产品中心','订单履约部','发货部','风控中心','计划管理部','品质中心','研发中心','用户中心'];
 assert.deepEqual(await entry.locator('[name=department] option').allTextContents(),['请选择部门',...departments]);
 assert(await entry.locator('[name=department]').evaluate(n=>n.required));assert(await entry.locator('[data-ledger-field=department] .gd-task-required').isVisible());
 const info=await entry.locator('.gd-ledger-info [data-ledger-field]').evaluateAll(nodes=>nodes.map(n=>n.dataset.ledgerField));
 assert.equal(await entry.locator('.gd-ledger-info').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(245, 248, 253)');
 assert.equal(await entry.locator('[name=completedAt]').count(),0,'新建不显示实际完成日期');
 const choose=async(key,name)=>{const field=entry.locator('[data-ledger-field='+key+']');await field.locator('[data-gd-assignee-query]').fill(name);await field.locator('[data-gd-assignee-name="'+name+'"]').click()};
 for(const name of ['林悦','唐琪'])await choose('requestor',name);
 await choose('primaryOwner','刘畅');await entry.locator('[name=title]').fill('字段展示专项');await entry.locator('[name=due]').fill('2026-11-10');
 await entry.screenshot({path:fileURLToPath(new URL('../../../outputs/task-create-layout-20261105.png',import.meta.url))});
 const count=(await saved()).length;await entry.locator('[data-gd-entry-save]').click();assert.equal((await saved()).length,count,'新增部门为空不保存');
 await entry.locator('[name=department]').selectOption('产品链');await entry.locator('[data-gd-entry-save]').click();await entry.waitFor({state:'detached'});
 let task=(await saved()).find(t=>t.title==='字段展示专项');assert.equal(task.requestor,'林悦、唐琪');
 await page.evaluate(id=>{const rows=JSON.parse(localStorage.getItem('dashboard.global-manual-tasks.v1'));const row=rows.find(t=>t.id===id);row.secondaryOwner='/';localStorage.setItem('dashboard.global-manual-tasks.v1',JSON.stringify(rows));},task.id);
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await root.locator('[data-gd-part=tasks]').click();await root.locator('[data-gd-status=all]').click();await root.locator('[data-gd-search]').fill('字段展示专项');await root.locator('[data-gd-action=task-detail]').click();
 assert.deepEqual(await entry.locator('.gd-ledger-info [data-ledger-field]').evaluateAll(nodes=>nodes.map(n=>n.dataset.ledgerField).filter(key=>key!=='completedAt')),info,'新增和详情除实际完成日期外顺序一致');
 assert.equal(await entry.locator('.gd-ledger-field.is-editing').count(),0);assert.equal(await entry.locator('[name=secondaryOwner]').inputValue(),'');assert.equal(await entry.locator('[data-ledger-field=secondaryOwner] .gd-task-person-chip').count(),0,'占位符不作为人员');
 await entry.screenshot({path:fileURLToPath(new URL('../../../outputs/task-detail-display-20261105.png',import.meta.url))});
 const requestor=entry.locator('[data-ledger-field=requestor]');await requestor.locator('[data-ledger-display]').hover();assert.equal(await requestor.locator('[data-ledger-display]').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(237, 244, 255)');await requestor.locator('[data-ledger-display]').click();assert.equal(await requestor.locator('.gd-task-person-chip').count(),2);await requestor.locator('[data-gd-assignee-remove=唐琪]').click();assert.equal(await requestor.locator('[name=requestor]').inputValue(),'林悦');
 await entry.locator('header h3').click();assert.equal(await entry.locator('.gd-ledger-field.is-editing').count(),0,'移出字段恢复展示态');
 await entry.locator('header [data-gd-entry-close]').click();await entry.waitFor({state:'detached'});task=(await saved()).find(t=>t.id===task.id);assert.equal(task.requestor,'林悦');assert.equal(task.secondaryOwner,'');
 await root.locator('[data-gd-task-import]').click();const pending=page.waitForEvent('download');await entry.locator('[data-gd-task-template]').click();const download=await pending,buffer=fs.readFileSync(await download.path()),book=inspectImportWorkbook(buffer),header=importTemplateHeader(book);
 const required=book.marks.filter(cell=>cell.text.startsWith('*'));
 assert.deepEqual(required.map(cell=>cleanTemplateHeader(cell.text)),['登记日期','优先级','任务','状态','责任人','所属部门','计划完成日期']);
 for(const cell of required){assert.equal(cell.runs[0].text,'*');assert.equal(cell.runs[0].color,'FFD92848');assert.equal(cell.runs[1].color,'FFFFFFFF')}
 const guide=book.rows.filter(row=>row.row<header.row).flatMap(row=>row.values).join('\n');assert.match(guide,/责任人、所属部门必填/);assert.match(guide,/多人用/);assert.doesNotMatch(guide,/每格一人/);
 const invalid=['2026/11/01','一般','林悦、唐琪','测试','部门校验','','','未开始','刘畅','-','','环境','2026/11/10',''];
 await entry.locator('input[type=file]').setInputFiles({name:'部门为空.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:fillImportWorkbookRows(buffer,header.row,[invalid])});await entry.locator('[data-gd-task-confirm]').click();await entry.locator('.ui-import-feedback.is-error').waitFor();
 const history=await page.evaluate(()=>JSON.parse(localStorage.getItem('dashboard-import-history-v1')||'[]'));assert(history[0].errors.some(error=>error.field==='所属部门'&&/必填/.test(error.message)),'失败明细明确指出部门必填');
 assert.equal((await saved()).filter(t=>t.title==='部门校验').length,0,'导入部门为空不覆盖');
 console.log('通过：11部门必填、新增/详情布局同步、展示/悬浮/点击编辑、提需人多选及移除、空人员迁移、实际下载模板7处红星白字、多人填写说明、导入必填校验。');
}
