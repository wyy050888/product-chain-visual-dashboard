import {verifyCostHeaderSort} from './cost-header-sort.mjs';
import {verifyCostCategories} from './cost-categories.mjs';
import {verifyCostDataStates} from './cost-data-states.mjs';
import {verifyCostTaskTypes} from './cost-task-types.mjs';
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
  const records=ledger.filter(r=>r.month>=month(first)&&r.month<=month(last)),target=Object.entries(audit.departmentTargets).filter(([key])=>{const month=key.split('|')[1];return month>=period.year+'-'+String(first).padStart(2,'0')&&month<=period.year+'-'+String(last).padStart(2,'0')}).reduce((n,[,cell])=>n+(cell.targetCents??0),0),actual=records.flatMap(r=>r.confirmations).filter(e=>e.date<=asOf).reduce((n,e)=>n+e.cents,0);
  assert.equal(tot.target,target);assert.equal(tot.actual,actual);assert.equal(tot.gap,actual-target);assert.equal(tot.rate,actual/target*100);
  assert.equal(rows.reduce((n,r)=>n+r.values[mode].target,0),target);assert.equal(rows.reduce((n,r)=>n+r.values[mode].actual,0),actual);
 }
}
export async function costControl(page){

 verifyCostDataStates();verifyCostTaskTypes();
 await page.locator('a[href="#cost"]').click();const root=page.locator('#cost'),period=root.locator('[data-time-scope="cost"]');
 await verifyCostCategories(page);
 const audit=()=>page.evaluate(()=>({...window.costControlAudit(),cutoff:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date())}));
 let initial=await audit();verifyLedger(initial);
 for(const row of initial.rows)for(const mode of ['month','quarter'])assert(Number.isFinite(row.values[mode].actual),'部门月季实际均有样例：'+row.id+' '+mode);
 assert.equal(initial.rows.find(row=>row.id==='shipping').values.month.actual,0,'明确零值示例应显示0，不能显示缺失');
 const supplements=initial.ledger.filter(row=>row.confirmations.some(event=>event.id.startsWith('DEMO-SUPPLEMENT-')));
 assert(supplements.length>0&&supplements.every(row=>!row.actualMissing&&row.confirmations.every(event=>event.date<=initial.cutoff)),'补充样例均已确认且不进入未来日期');
 const future=await page.evaluate(()=>window.costControlAudit({year:2026,mode:'month',value:11}));assert(future.rows.every(row=>row.values.month.actual===null),'未来月份实际仍为缺失');
await verifyCostCardProgress(page);assert.equal(initial.departments.length,9);assert(initial.totals.year.target>0);
 assert.deepEqual(await root.locator('[data-cc-card] h3').allTextContents(),['10月降本','Q4降本','26年降本']);
 assert.equal(await root.locator('#costtable tbody tr').count(),9);assert.equal(await root.locator('#costtable th').count(),11);
 assert.equal(await root.locator('#costtable tfoot').count(),0);assert.equal(await root.locator('#costtable .cc-money-unit').count(),81);assert(await root.locator('#costtable .cc-money-unit').evaluateAll(nodes=>nodes.every(node=>node.textContent==='w'&&getComputedStyle(node).display==='inline'&&getComputedStyle(node).color===getComputedStyle(node.parentElement).color)));
 assert.equal(await root.locator('.metric-help,[title],[data-metric-rule]').count(),0);
 assert.equal(await root.locator('#costopportunity,#costcallout,.callout').count(),0,'AI建议条与入口已移除');
 assert.equal(await page.evaluate(()=>typeof ccOpenOpportunity),'undefined','清单抽屉实现不再加载');
 await verifyCostSaving(page);
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
  assert.deepEqual(await page.locator('.cc-department-table tbody .cc-row-name').allTextContents(),dept.metrics.map(name=>name.replaceAll('渠道','平台')));
  assert.equal(await page.locator('.cc-department-table th').count(),5);assert.equal(await page.locator('.cc-department-table th').nth(2).innerText(),'9月实际降本');
  assert.equal(await page.locator('.cc-department-unit').count(),0);
  assert(await page.locator('.cc-department-table .cc-money-unit').count()>0);
  assert(await page.locator('.cc-department-table .cc-money-unit').evaluateAll(nodes=>nodes.every(node=>node.textContent==='w'&&getComputedStyle(node).display==='inline')));
  assert.equal(await page.locator('.cc-department-table button:not(.ui-column-handle),[data-cc-item],.cc-item-info').count(),0);
  assert.equal(await page.locator('#dialogsub [data-cc-value]').inputValue(),'9');
  assert.equal(await page.locator('.cc-drawer .metric-help,[data-cc-drawer] [title]').count(),0);
  const expected=initial.rows.find(row=>row.id===dept.id).values.month;
  const money=value=>Number.isFinite(value)?(value/1000000).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})+'w':'--';
  assert.equal((await page.locator('.cc-department-table tfoot [data-cc-value="month-actual"]').innerText()).replaceAll(' ',''),money(expected.actual));
  await page.locator('#close').click();
 }
 await root.locator('[data-cc-department="warehouse"]').click();
 const monthText=await page.locator('.cc-department-table').innerText();
 await page.locator('#drawer-tabs [data-drawer-tab="risk"]').click();assert.equal(await page.locator('.cc-department-table tbody tr').count(),7);assert.equal(await page.locator('#dialog').getAttribute('data-drawer-depth'),'0');
 await page.locator('#dialogsub [data-cc-mode="quarter"]').click();assert.equal(await page.locator('.cc-department-table th').count(),4);
 await page.locator('#drawer-tabs [data-drawer-tab="warehouse"]').click();assert.notEqual(await page.locator('.cc-department-table').innerText(),monthText);assert.equal(await page.locator('#dialogsub [data-cc-mode="quarter"]').getAttribute('aria-pressed'),'true');
 await page.locator('#dialogsub [data-cc-mode="year"]').click();assert.equal(await page.locator('.cc-department-table th').count(),3);
 await page.locator('#dialogsub [data-cc-year]').selectOption('2025');await page.locator('#drawer-tabs [data-drawer-tab="research"]').click();assert.equal(await page.locator('#dialogsub [data-cc-year]').inputValue(),'2025');
 await page.locator('#drawer-tabs [data-drawer-tab="research"]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#drawer-tabs [aria-selected="true"]').getAttribute('data-drawer-tab'),'purchase');
 await page.setViewportSize({width:390,height:900});assert(await page.locator('#dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'部门标签及宽表在抽屉内部滚动');await page.setViewportSize({width:1920,height:1080});
 await page.locator('#close').click();assert.equal(await period.locator('[data-time-value]').inputValue(),'9');
 for(const width of [1366,1024,390]){await page.setViewportSize({width,height:900});await page.locator('#cost').scrollIntoViewIfNeeded();assert(await root.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'宽表只在模块内部滚动');}
 await page.setViewportSize({width:1920,height:1080});
}
