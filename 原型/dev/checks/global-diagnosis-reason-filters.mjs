import {resetDiagnosisFilters} from './diagnosis-filter-helpers.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

export async function globalDiagnosisReasonFilters(page){
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit()),read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('product-risk-todos-v1')));
 const button=key=>root.locator('[data-gd-reason-filter="'+key+'"]');
 const ids=entries=>entries.map(({row})=>row.task.id).sort();
 const matches=(row,key)=>{
  if(key==='all')return true;if(row.kind==='focus')return row.issueType===key;
  if(row.missing)return key==='log-missing';if(key==='log-late')return row.late;
  return key.startsWith('log-empty-')&&row.incomplete&&!String(row[key.slice(10)]||'').trim();
 };
 await root.locator('[data-gd-part="execution"]').click();await root.locator('[data-gd-tab="reports"]').click();await resetDiagnosisFilters(root);
 const initial=await audit(),entries=initial.tableRows,before=await read();
 const check=async key=>{const data=await audit();assert.deepEqual(ids(data.tableRows),ids(entries.filter(({row})=>matches(row,key))));assert.equal(await button(key).getAttribute('aria-pressed'),'true');for(const reason of await root.locator('[data-gd-reason-filter]').evaluateAll(es=>es.map(e=>e.dataset.gdReasonFilter)))assert.equal(await button(reason).locator('b').innerText(),String(entries.filter(({row})=>matches(row,reason)).length),'原因计数忽略自身筛选：'+reason)};
 for(const key of ['log-missing','log-empty-next','log-late']){await button(key).click();await check(key);assert(await button(key).evaluate(e=>e===document.activeElement));await button(key).click();await check('all')}
 await button('log-missing').focus();await page.keyboard.press('Enter');await check('log-missing');await page.keyboard.press('Space');await check('all');
 await button('log-missing').click();await root.locator('[data-gd-priority="P3"]').click();assert.equal((await audit()).tableRows.length,0,'原因与优先级取交集');assert(await button('log-missing').isVisible(),'空结果保留取消入口');await button('log-missing').click();assert((await audit()).tableRows.every(({row})=>row.task.priority==='P3'));await resetDiagnosisFilters(root);
 await button('log-missing').click();await root.locator('[data-gd-department="采购部"]').click();assert((await audit()).tableRows.every(({row,roles})=>row.missing&&roles.some(role=>role.department==='采购部')));await resetDiagnosisFilters(root);
 await button('log-missing').click();await root.locator('[data-gd-search]').fill('不会匹配的原因筛选搜索词');assert.equal((await audit()).tableRows.length,0);assert((await root.locator('[data-gd-reason-filter] b').allTextContents()).every(n=>n==='0'));await button('log-missing').click();assert.equal((await audit()).state.filters['execution/reports'].reason,'all');await resetDiagnosisFilters(root);
 await button('log-missing').click();await root.locator('[data-gd-tab="focus"]').click();assert.equal(await button('all').getAttribute('aria-pressed'),'true');
 const focus=(await audit()).tableRows;
 for(const key of ['focus-direction','focus-risk-response','focus-interruption']){await button(key).click();assert.deepEqual(ids((await audit()).tableRows),ids(focus.filter(({row})=>row.issueType===key)));await button(key).click();assert.equal(await button('all').getAttribute('aria-pressed'),'true')}
 await button('focus-risk-response').click();await root.locator('[data-gd-tab="reports"]').click();assert.equal(await button('log-missing').getAttribute('aria-pressed'),'true');await check('log-missing');
 await root.locator('[data-gd-tab="focus"]').click();assert.equal(await button('focus-risk-response').getAttribute('aria-pressed'),'true');await resetDiagnosisFilters(root);assert.equal(await button('all').getAttribute('aria-pressed'),'true');
 await root.locator('[data-gd-tab="reports"]').click();assert.equal(await button('log-missing').getAttribute('aria-pressed'),'true','只重置当前页签');await resetDiagnosisFilters(root);await check('all');
 for(const width of [1920,1024,390,320]){await page.setViewportSize({width,height:1080});assert(await root.locator('.gd-reason-summary').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await root.locator('[data-gd-execution-context]').screenshot({path:fileURLToPath(new URL('../../outputs/diagnosis-reason-filter-'+width+'.png',import.meta.url))})}
 assert.deepEqual(await read(),before,'原因筛选只读，不改待办、分工或反馈');
 console.log('通过：日志/聚焦原因筛选、再次点击取消、交集/空结果、独立记忆/重置、计数、键盘及窄屏');
}
