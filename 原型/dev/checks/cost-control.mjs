import {verifyCostHeaderSort} from './cost-header-sort.mjs';
import {verifyCostDataStates} from './cost-data-states.mjs';
import {verifyCostTaskTypes,verifyCostTaskFilters,verifyCostTaskLifecycle,verifyCostTaskSamples} from './cost-task-types.mjs';
import {verifyCostSaving} from './cost-saving.mjs';
import {verifyCostCardProgress} from './cost-card-progress.mjs';
import assert from 'node:assert/strict';
function verifyLedger(audit){
 const {period,ledger,metrics,totals,rows}=audit,cutoff=audit.cutoff,anchor=period.mode==='month'?period.value:period.mode==='quarter'?period.value*3:12;
 assert.equal(new Set(metrics.map(i=>i.id)).size,metrics.length);
 for(const [mode,tot] of Object.entries(totals)){
  const first=mode==='month'?anchor:mode==='quarter'?Math.floor((anchor-1)/3)*3+1:1,last=mode==='month'?anchor:mode==='quarter'?Math.floor((anchor-1)/3)*3+3:12;
  const month=m=>`${period.year}-${String(m).padStart(2,'0')}`;
  const end=new Date(Date.UTC(period.year,anchor,0)).toISOString().slice(0,10),asOf=end<cutoff?end:cutoff;
  const records=ledger.filter(r=>r.month>=month(first)&&r.month<=month(last)),target=records.reduce((n,r)=>n+r.targetCents,0),actual=records.flatMap(r=>r.confirmations).filter(e=>e.date<=asOf).reduce((n,e)=>n+e.cents,0);
  assert.equal(tot.target,target);assert.equal(tot.actual,actual);assert.equal(tot.gap,actual-target);assert.equal(tot.rate,actual/target*100);
  assert.equal(rows.reduce((n,r)=>n+r.values[mode].target,0),target);assert.equal(rows.reduce((n,r)=>n+r.values[mode].actual,0),actual);
 }
}
export async function costControl(page){

 verifyCostDataStates();verifyCostTaskTypes();
 await page.locator('a[href="#cost"]').click();const root=page.locator('#cost'),period=root.locator('[data-time-scope="cost"]');
 const audit=()=>page.evaluate(()=>({...window.costControlAudit(),cutoff:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date())}));
 let initial=await audit();verifyLedger(initial);await verifyCostCardProgress(page);assert.equal(initial.departments.length,9);assert(initial.totals.year.target>0);
 assert.deepEqual(await root.locator('[data-cc-card] h3').allTextContents(),['10月降本','Q4降本','26年降本']);
 assert.equal(await root.locator('#costtable tbody tr').count(),9);assert.equal(await root.locator('#costtable th').count(),11);
 assert.equal(await root.locator('#costtable tfoot').count(),0);assert.equal(await root.locator('#costtable .cc-money-unit').count(),53);assert(await root.locator('#costtable .cc-money-unit').evaluateAll(nodes=>nodes.every(node=>node.textContent==='w'&&getComputedStyle(node).display==='inline'&&getComputedStyle(node).color===getComputedStyle(node.parentElement).color)));
 assert.equal(await root.locator('.metric-help,[title],[data-metric-rule]').count(),0);
 await verifyCostHeaderSort(page);
 const monthly=initial.totals.month.actual;
 await period.locator('[data-time-value]').selectOption('9');initial=await audit();verifyLedger(initial);await verifyCostCardProgress(page);assert.notEqual(initial.totals.month.actual,monthly);
 await period.locator('[data-time-mode="quarter"]').click();assert.deepEqual(await root.locator('[data-cc-card] h3').allTextContents(),['Q3降本','26年降本']);assert.equal(await root.locator('#costtable th').count(),8);verifyLedger(await audit());await verifyCostCardProgress(page);
 await period.locator('[data-time-mode="year"]').click();assert.equal(await root.locator('[data-cc-card]').count(),1);assert.equal(await root.locator('#costtable th').count(),5);verifyLedger(await audit());await verifyCostCardProgress(page);
 await period.locator('[data-time-year]').selectOption('2025');verifyLedger(await audit());await verifyCostCardProgress(page);assert((await audit()).totals.year.actual>0);
 await period.locator('[data-time-year]').selectOption('2026');await period.locator('[data-time-mode="month"]').click();await period.locator('[data-time-value]').selectOption('9');
 // 每个部门一个tab；只保留截图指标，每个指标一行，无事项或第二层查看。
 assert.equal(initial.metrics.length,29);
 assert.deepEqual(initial.departments.filter(d=>['purchase','shipping'].includes(d.id)).map(d=>d.name),['采购部（去计划）','发货部（去仓储）']);
 assert.deepEqual(initial.departments.find(d=>d.id==='research').metrics,['工艺降本','产品迭代降本','设计方案降本（含物料降本）','关键器件替代料降本（含塑胶原料降本）']);
 for(const dept of initial.departments){
  await root.locator(`[data-cc-department="${dept.id}"]`).click();
  assert.equal(await page.locator('#dialogtitle').innerText(),'降本明细');
  assert.deepEqual(await page.locator('#drawer-tabs button').allTextContents(),initial.departments.map(d=>d.name));
  assert.equal(await page.locator('#drawer-tabs [aria-selected="true"]').getAttribute('data-drawer-tab'),dept.id);
  assert.deepEqual(await page.locator('.cc-department-table tbody td:first-child').allTextContents(),dept.metrics);
  assert.equal(await page.locator('.cc-department-table th').count(),10);assert.equal(await page.locator('.cc-department-table th').nth(1).innerText(),'9月目标/实际降本');
  assert.equal(await page.locator('.cc-department-unit').count(),0);
  assert(await page.locator('.cc-department-table .cc-money-unit').count()>0);
  assert(await page.locator('.cc-department-table .cc-money-unit').evaluateAll(nodes=>nodes.every(node=>node.textContent==='w'&&getComputedStyle(node).display==='inline')));
  assert.equal(await page.locator('.cc-department-table button:not(.ui-column-handle),[data-cc-item],.cc-item-info').count(),0);
  assert.equal(await page.locator('#dialogsub [data-cc-value]').inputValue(),'9');
  assert.equal(await page.locator('.cc-drawer .metric-help,[data-cc-drawer] [title]').count(),0);
  const expected=initial.rows.find(row=>row.id===dept.id).values.month;
  const money=value=>Number.isFinite(value)?(value/1000000).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})+'w':'--';
  assert.equal((await page.locator('.cc-department-table tfoot [data-cc-value="month-amount"]').innerText()).replaceAll(' ',''),money(expected.target)+'/'+money(expected.actual));
  await page.locator('#close').click();
 }
 await root.locator('[data-cc-department="warehouse"]').click();
 const monthText=await page.locator('.cc-department-table').innerText();
 await page.locator('#drawer-tabs [data-drawer-tab="risk"]').click();assert.equal(await page.locator('.cc-department-table tbody tr').count(),7);assert.equal(await page.locator('#dialog').getAttribute('data-drawer-depth'),'0');
 await page.locator('#dialogsub [data-cc-mode="quarter"]').click();assert.equal(await page.locator('.cc-department-table th').count(),7);
 await page.locator('#drawer-tabs [data-drawer-tab="warehouse"]').click();assert.notEqual(await page.locator('.cc-department-table').innerText(),monthText);assert.equal(await page.locator('#dialogsub [data-cc-mode="quarter"]').getAttribute('aria-pressed'),'true');
 await page.locator('#dialogsub [data-cc-mode="year"]').click();assert.equal(await page.locator('.cc-department-table th').count(),4);
 await page.locator('#dialogsub [data-cc-year]').selectOption('2025');await page.locator('#drawer-tabs [data-drawer-tab="research"]').click();assert.equal(await page.locator('#dialogsub [data-cc-year]').inputValue(),'2025');
 await page.locator('#drawer-tabs [data-drawer-tab="research"]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#drawer-tabs [aria-selected="true"]').getAttribute('data-drawer-tab'),'purchase');
 await page.setViewportSize({width:390,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'部门标签及宽表在抽屉内部滚动');await page.setViewportSize({width:1920,height:1080});
 await page.locator('#close').click();assert.equal(await period.locator('[data-time-value]').inputValue(),'9');
 await root.locator('#costopportunity').click();let list=page.locator('[data-cc-drawer="opportunity"]');
 const today=(await audit()).cutoff,from=new Date(today+'T00:00:00Z');from.setUTCDate(from.getUTCDate()-29);
 const short=date=>date.slice(2).replaceAll('-','/');
 assert.equal((await page.locator('#dialogsub').innerText()).replaceAll(' ',''),short(from.toISOString().slice(0,10))+'—'+short(today));
 assert.deepEqual(await list.locator('th').allTextContents(),['SPU信息','近30天GSV','近30天利润率','预计单台降本空间','AI 建议降本方向','任务状态','操作']);assert.equal(await list.locator('.notice,[title]:not(.pf-multi-value)').count(),0);await verifyCostSaving(page,list);await verifyCostTaskFilters(list);await verifyCostTaskSamples(page,list);await list.locator('[data-cc-filter="status"]').selectOption('pending');const pendingSamples=Number(await list.locator('.cc-opportunity-pages .list-pagination').getAttribute('data-list-total'));await list.locator('[data-cc-reset]').click();
 await list.locator('[data-cc-query]').fill('不存在的SPU');assert.equal(await list.locator('[data-cc-spu]').count(),0);await list.locator('[data-cc-reset]').click();
 const spuId=await list.locator('[data-cc-spu][data-cc-task-status="suggested"]').first().getAttribute('data-cc-spu');
 const first=list.locator('[data-cc-spu="'+spuId+'"]'),name=await first.locator('strong').first().innerText();
 const brand=await list.locator('[data-cc-filter="brand"] option').nth(1).getAttribute('value');await list.locator('[data-pf-multi-label="品牌"] summary').click();await list.locator(`[data-pf-multi-label="品牌"] [data-pf-multi-option][value="${brand}"]`).check();await list.locator('[data-pf-multi-label="品牌"] summary').click();assert((await list.locator('tbody').innerText()).includes(brand));await list.locator('[data-cc-reset]').click();
 await first.locator('[data-cc-view]').click();assert.equal(await page.locator('.up-detail').getAttribute('data-up-spu'),spuId);assert.equal(await page.locator('.up-detail').getAttribute('data-up-tab'),'operating');
 await page.locator('[data-drawer-tab="handling"]').click();await page.locator('[data-todo-tab="suggestions"]').click();await page.locator('#up-todo-query').fill('降本方案');assert(await page.locator('#up-todo-table').innerText().then(t=>t.includes(name)),'产品详情在下发前识别相同降本建议');
 await page.locator('.drawer-back').click();assert.equal(await first.getAttribute('data-cc-spu'),spuId);
 await first.locator('[data-cc-assign]').click();let form=page.locator('.up-todo-dialog');assert.equal(await form.count(),1);assert.equal(await form.locator('[name="taskType"]').inputValue(),'cost-reduction');assert(await form.locator('[name="taskType"]').isDisabled());
 await form.locator('[data-todo-action="assign"]').click();assert.equal(await form.count(),1,'必填校验阻止空提交');
 await form.locator('[data-people-query]').fill('唐琪');await page.locator('.up-todo-people-options [role="option"]').filter({hasText:'唐琪'}).click();await form.locator('[name="due"]').fill('2026-12-30');await form.locator('[data-todo-action="assign"]').click();assert.equal(await form.count(),0);
 assert.equal(await first.locator('[data-cc-assign]').innerText(),'跟进任务');
 let saved=await page.evaluate(spuId=>Object.values(JSON.parse(localStorage.getItem('product-risk-todos-v1'))).filter(t=>t.suggestionKey==='cost-reduction'&&t.source!=='demo-cost-history'&&t.spuId===spuId),spuId);assert.equal(saved.length,1);const task=saved[0];assert.equal(task.taskType,'cost-reduction');assert.equal(task.spuId,spuId);assert.equal(task.assignee,'唐琪');
 await first.locator('[data-cc-assign]').click();assert.equal(await page.locator('.up-todo-dialog [data-todo-action="assign"]').count(),0);assert.equal(await page.locator('.up-todo-dialog [data-todo-type]').innerText(),'降本优化');await page.locator('.up-todo-dialog [data-todo-close]').first().click();
 await verifyCostTaskLifecycle(page,list,first);
 await first.locator('[data-cc-view]').click();await page.locator('[data-drawer-tab="handling"]').click();await page.locator('#up-todo-query').fill('降本方案');assert.equal(await page.locator('#up-todo-table [data-todo-id]').first().getAttribute('data-todo-id'),task.id);await page.locator('[data-todo-tab="suggestions"]').click();await page.locator('#up-todo-query').fill('降本方案');assert.equal(await page.locator('#up-todo-table [data-todo-id]').count(),0,'已下发后AI建议不重复');await page.locator('.drawer-back').click();
 await list.locator('[data-cc-filter="status"]').selectOption('suggested');assert.equal(await list.locator(`[data-cc-spu="${spuId}"]`).count(),0);await list.locator('[data-cc-filter="status"]').selectOption('pending');assert.equal(await list.locator('[data-cc-spu]').count(),pendingSamples+1);await page.locator('#close').click();
 await page.reload();await page.locator('a[href="#cost"]').click();await page.locator('#costopportunity').click();list=page.locator('[data-cc-drawer="opportunity"]');await list.locator('[data-cc-query]').fill(name);assert.equal(await list.locator('[data-cc-assign]').innerText(),'跟进任务');
 // 反向入口：从产品AI建议下发另一条，回清单也应立即显示跟进，不生成第二套任务。
 await list.locator('[data-cc-reset]').click();const other=list.locator('[data-cc-spu][data-cc-task-status="suggested"]').first(),otherId=await other.getAttribute('data-cc-spu');await other.locator('[data-cc-view]').click();await page.locator('[data-drawer-tab="handling"]').click();await page.locator('[data-todo-tab="suggestions"]').click();await page.locator('#up-todo-query').fill('降本方案');await page.locator('#up-todo-table [data-todo-open="assign"]').click();form=page.locator('.up-todo-dialog');await form.locator('[data-people-query]').fill('唐琪');await page.locator('.up-todo-people-options [role="option"]').filter({hasText:'唐琪'}).click();await form.locator('[name="due"]').fill('2026-12-30');await form.locator('[data-todo-action="assign"]').click();await page.locator('.drawer-back').click();assert.equal(await list.locator(`[data-cc-spu="${otherId}"] [data-cc-assign]`).innerText(),'跟进任务');
 await page.locator('#close').click();
 for(const width of [1366,1024,390]){await page.setViewportSize({width,height:900});await page.locator('#cost').scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'宽表只在模块内部滚动');}
 await page.setViewportSize({width:1920,height:1080});
 // 清理本测试下发记录，保留其余模块的历史样例。
 await page.evaluate(()=>{const key='product-risk-todos-v1',todos=JSON.parse(localStorage.getItem(key)||'{}');for(const [id,t] of Object.entries(todos))if(t.suggestionKey==='cost-reduction')delete todos[id];localStorage.setItem(key,JSON.stringify(todos))});
}
