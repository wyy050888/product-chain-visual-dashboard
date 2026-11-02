import {resetDiagnosisFilters} from './diagnosis-filter-helpers.mjs';
import assert from 'node:assert/strict';
// 验证跨责任项/跨分页排序；夹具包含整单未完成但部分责任项已完成的任务。
export async function verifyDiagnosisHeaderSort(page){
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit());
 const snapshot=await audit(),base={...snapshot.coordination[0].task,start:snapshot.range.start,end:snapshot.range.end},prefix='sort-evidence-check-';
 const tasks=Array.from({length:10},(_,i)=>({...base,id:prefix+i,title:prefix+i,gdIssue:'',gdAutomatic:false,priority:'P'+(i%4),due:i===2?'':'2027-01-'+String(20-i).padStart(2,'0'),logs:[],
  responsibilities:[{id:'role-'+i,department:'项目部',assignee:'沈舟',action:'排序验证行动',status:i===3?'working':'done',feedback:'',completedAt:i===3?'':'2026-10-'+String(i+1).padStart(2,'0')+'T09:00:00+08:00'}]}));
 tasks[0].responsibilities.push({id:'role-empty',department:'采购部',assignee:'唐琪',action:'尚未完成的责任项',status:'pending',feedback:'',completedAt:''});
 await page.evaluate(items=>{const store=JSON.parse(localStorage.getItem('product-risk-todos-v1'));for(const t of items)store[t.id]=t;localStorage.setItem('product-risk-todos-v1',JSON.stringify(store))},tasks);
 await page.reload();await root.locator('[data-gd-part="closure"]').click();await root.locator('[data-gd-status="all"]').click();await root.locator('[data-gd-search]').fill(prefix);
 assert.equal(await root.locator('[data-gd-sort],[data-gd-progress],.gd-action-table td select').count(),0);
 assert.deepEqual(await root.locator('[data-gd-header-sort]').evaluateAll(es=>es.map(e=>e.dataset.gdHeaderSort)),['priority','due','completed']);
 const header=key=>root.locator('[data-gd-header-sort="'+key+'"]');
 const check=async(key,direction)=>{
  const entries=(await audit()).tableRows;
  assert.equal(entries.length,10);assert.equal(await header(key).locator('..').getAttribute('aria-sort'),direction==='asc'?'ascending':'descending');
  assert.equal(await root.locator('[data-gd-department="all"]>span').innerText(),'10','筛选角标按全部执行行计数，不只统计当前页');
  const value=e=>key==='priority'?Number(e.row.task.priority.slice(1)):key==='due'?(e.row.task.due||null):(e.row.task.status==='done'?e.row.task.completedAt?.slice(0,10):null);
  const values=entries.map(value),valid=values.filter(v=>v!==null),missing=values.length-valid.length;
  assert.deepEqual(values.slice(-missing||values.length),missing?Array(missing).fill(null):[],'空日期在两个方向均置后');
  assert.deepEqual(valid,[...valid].sort((a,b)=>String(a).localeCompare(String(b))*(direction==='asc'?1:-1)));
  assert.deepEqual(await root.locator('[data-gd-task]').evaluateAll(es=>es.map(e=>e.dataset.gdTask)),entries.slice(0,8).map(e=>e.row.task.id),'按全量责任项排序后展示第一页');
  assert.match(await root.locator('#gd-pager').innerText(),/共\s*10\s*条/);
 };
 await header('completed').click();await check('completed','desc');await header('completed').focus();await page.keyboard.press('Enter');await check('completed','asc');
 const complete=(await audit()).tableRows.filter(e=>e.row.task.id===prefix+'0');assert.equal(complete.length,1);assert.notEqual(complete[0].row.task.status,'done');assert.equal(complete[0].row.task.completedAt,'','部分人员完成不计为任务完成');
 for(const key of ['due','priority']){await header(key).click();await check(key,'asc');await header(key).click();await check(key,'desc')}
 await root.locator('[data-gd-part="resource"]').click();assert.equal(await header('priority').locator('..').getAttribute('aria-sort'),'ascending');await root.locator('[data-gd-part="closure"]').click();assert.equal(await header('priority').locator('..').getAttribute('aria-sort'),'descending','四模块独立记忆排序');
 await resetDiagnosisFilters(root);assert.equal(await header('priority').locator('..').getAttribute('aria-sort'),'ascending');
 await page.evaluate(prefix=>{const store=JSON.parse(localStorage.getItem('product-risk-todos-v1'));for(const id of Object.keys(store))if(id.startsWith(prefix))delete store[id];localStorage.setItem('product-risk-todos-v1',JSON.stringify(store))},prefix);
 await page.reload();console.log('通过：三列表头双向排序、责任项完成日期、缺失置后、全量排序后分页、键盘和模块记忆');
}
