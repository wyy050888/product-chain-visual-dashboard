import {resetDiagnosisFilters} from './diagnosis-filter-helpers.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

export async function selectDiagnosisStatus(root,key){
 await root.locator('[data-gd-status="all"]').click();if(key!=='all')await root.locator('[data-gd-status="'+key+'"]').click();
}
export async function verifyDiagnosisTagCounts(root,rows,filter){
 const entries=[...new Map(rows.map(row=>[row.task.id,{row}])).values()],statusMatches=row=>filter.status==='all'||(Array.isArray(filter.status)?filter.status:[filter.status]).includes(row.task.status);
 const priorities=entries.filter(({row})=>statusMatches(row)),statuses=entries.filter(({row})=>filter.priority==='all'||row.task.priority===filter.priority);
 for(const key of ['all','P0','P1','P2','P3'])assert.equal(await root.locator('[data-gd-priority="'+key+'"] .gd-filter-count').innerText(),String(key==='all'?priorities.length:priorities.filter(({row})=>row.task.priority===key).length),'优先级角标按执行行计数，忽略自身筛选');
 for(const key of ['all','pending','working','done'])assert.equal(await root.locator('[data-gd-status="'+key+'"] .gd-filter-count').innerText(),String(key==='all'?statuses.length:statuses.filter(({row})=>row.task.status===key).length),'状态角标按整条任务计数，忽略自身筛选');
}
export async function verifyDiagnosisStatusMulti(page,rows){
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit()),ids=rs=>rs.map(r=>r.id).sort();
 await resetDiagnosisFilters(root);
 assert.deepEqual(await root.locator('[data-gd-status][aria-pressed="true"]').evaluateAll(es=>es.map(e=>e.dataset.gdStatus)),['pending','working']);
 assert.deepEqual(ids((await audit()).visible),ids(rows.filter(row=>['pending','working'].includes(row.task.status))),'默认隐藏已完成任务');
 await verifyDiagnosisTagCounts(root,rows,{priority:'all',status:['pending','working']});
 await root.locator('[data-gd-status="done"]').click();assert.equal(await root.locator('[data-gd-status="all"]').getAttribute('aria-pressed'),'true','三个状态全选归为全部');assert.deepEqual(ids((await audit()).visible),ids(rows));
 await root.locator('[data-gd-status="done"]').click();await root.locator('[data-gd-status="pending"]').click();assert.deepEqual(ids((await audit()).visible),ids(rows.filter(row=>['done','pending'].includes(row.task.status))),'同一组多状态取并集');
 await resetDiagnosisFilters(root);await root.locator('[data-gd-status="pending"]').focus();await page.keyboard.press('Space');assert.equal(await root.locator('[data-gd-status="pending"]').getAttribute('aria-pressed'),'false');assert.equal(await root.locator('[data-gd-status="working"]').getAttribute('aria-pressed'),'true','支持空格切换');
 await root.locator('[data-gd-status="working"]').click();assert.equal(await root.locator('[data-gd-status="all"]').getAttribute('aria-pressed'),'true','取消最后一项恢复全部');
 await resetDiagnosisFilters(root);
 const colors=await root.locator('[data-gd-priority] .up-todo-priority').evaluateAll(es=>es.map(e=>getComputedStyle(e).color));assert.equal(new Set(colors).size,4,'四级优先级各自着色');
 assert.deepEqual(await root.locator('[data-gd-priority] .gd-filter-label').allTextContents(),['全部','P0','P1','P2','P3']);
 await root.screenshot({path:fileURLToPath(new URL('../../outputs/global-diagnosis-filter-tags.png',import.meta.url))});
}
