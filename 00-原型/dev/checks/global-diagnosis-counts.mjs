import {resetDiagnosisFilters} from './diagnosis-filter-helpers.mjs';
import {setTodoRoleStatus} from './todo-inline-helpers.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

export async function globalDiagnosisCounts(page){
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit());
 const number=async selector=>Number(await root.locator(selector).innerText());
 const department=key=>number('[data-gd-department="'+key+'"]>span'),priority=key=>number('[data-gd-priority="'+key+'"] .gd-filter-count'),status=key=>number('[data-gd-status="'+key+'"] .gd-filter-count');
 await root.locator('[data-gd-part="resource"]').click();await resetDiagnosisFilters(root);await root.locator('[data-gd-tab="priority"]').click();
 const current=await audit(),expected=current.tableRows.length;
 assert.equal(expected,1,'同一任务的三条行动合并为一行');assert.equal(current.tableRows[0].roles.length,3);
 assert.equal(await number('[data-gd-tab="priority"]>span'),expected);assert.equal(await department('all'),expected);assert.equal(await priority('all'),expected);
 assert.equal(await status('pending')+await status('working'),expected);assert.equal(await root.locator('[data-gd-task]').count(),expected);
 assert.match(await root.locator('#gd-pager').innerText(),/共\s*1\s*条/);
 for(const key of ['coordination','resource','execution','closure']){
  const rows=key==='execution'?[...current.reports,...current.focus]:key==='closure'?current.tasks:current[key];
  const open=new Set(rows.filter(row=>['pending','working'].includes(row.task.status)).map(row=>row.task.id));
  assert.equal(current.counts.find(card=>card.key===key).count,open.size,'卡片按未完成任务去重 '+key);
 }
 const id='count-mixed-status-check',base=current.coordination[0].task;
 const task={...base,id,title:id,gdIssue:'',gdAutomatic:false,priority:'P2',status:'working',completedAt:'',logs:[],responsibilities:[
  {id:'pending',department:'产品中心',assignee:'林悦',action:'共同确认方案',status:'pending',feedback:'',completedAt:''},
  {id:'working',department:'采购部',assignee:'唐琪',action:'共同确认方案',status:'working',feedback:'',completedAt:''},
  {id:'done',department:'产品中心',assignee:'周铭',action:'检查交付记录',status:'done',feedback:'核对完成',completedAt:'2026-10-09T09:10:11+08:00'}
 ]};
 await page.evaluate(task=>{const saved=JSON.parse(localStorage.getItem('product-risk-todos-v1'));saved[task.id]=task;localStorage.setItem('product-risk-todos-v1',JSON.stringify(saved))},task);
 try{
  await page.reload();await root.locator('[data-gd-part="closure"]').click();await root.locator('[data-gd-search]').fill(id);
  const row=root.locator('[data-gd-task="'+id+'"]'),owner=row.locator('.gd-owner-summary');
  assert.equal(await row.count(),1);assert.equal(await owner.locator('.gd-owner-line').count(),2);assert((await owner.innerText()).endsWith('…'));
  assert.equal(await row.locator('.gd-action-content').count(),2,'相同执行事项不重复');
  assert.equal(await department('all'),1);assert.equal(await department('产品中心'),1,'同部门多人仍是一条任务');assert.equal(await priority('P2'),1);
  assert.equal(await status('pending'),0);assert.equal(await status('working'),1);assert.equal(await status('done'),0);
  assert.equal(await row.locator('[data-label="实际完成日期"]').innerText(),'—','部分人员完成不显示任务完成日期');
  const before=await page.evaluate(()=>localStorage.getItem('product-risk-todos-v1'));
  await owner.hover();const tooltip=page.locator('#metric-tooltip');await tooltip.waitFor({state:'visible'});
  for(const role of task.responsibilities)assert((await tooltip.innerText()).includes(role.department+' / '+role.assignee));
  assert.equal(await tooltip.evaluate(e=>getComputedStyle(e).whiteSpace),'pre-line');
  await tooltip.hover();assert(await tooltip.isVisible(),'移入名单浮层保持显示');await page.mouse.move(1,1);await tooltip.waitFor({state:'hidden'});
  await owner.focus();await page.keyboard.press('Enter');assert(await tooltip.isVisible(),'键盘也可查看完整人员');await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>localStorage.getItem('product-risk-todos-v1')),before,'悬浮只读');
  await row.screenshot({path:fileURLToPath(new URL('../../outputs/diagnosis-task-owners.png',import.meta.url))});
  await root.locator('[data-gd-department="产品中心"]').click();assert.equal(await row.count(),1);assert.equal(await status('working'),1,'部门只限制关联人员，状态按任务');
  await row.locator('[data-gd-action="task-detail"]').click();const detail=page.locator('.up-todo-dialog[open]');
  for(const key of ['pending','working'])await setTodoRoleStatus(detail.locator('[data-responsibility-row="'+key+'"]'),'done');
  await detail.locator('[data-todo-close]').click();assert.equal(await row.count(),0,'整单完成后默认隐藏');assert.equal(await status('done'),1);
  await root.locator('[data-gd-status="all"]').click();await root.locator('[data-gd-status="done"]').click();assert.equal(await row.count(),1);assert.notEqual(await row.locator('[data-label="实际完成日期"]').innerText(),'—');
  for(const width of [1920,1440,390,320]){await page.setViewportSize({width,height:1000});assert(await owner.evaluate(e=>e.getBoundingClientRect().height<=45),'最多两行 '+width);assert(await owner.evaluate(e=>e.scrollWidth<=e.clientWidth+1));await owner.focus();await page.keyboard.press('Enter');const box=await tooltip.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1);await page.keyboard.press('Escape')}
 }finally{
  await page.setViewportSize({width:1920,height:1080});await page.evaluate(id=>{const saved=JSON.parse(localStorage.getItem('product-risk-todos-v1'));delete saved[id];localStorage.setItem('product-risk-todos-v1',JSON.stringify(saved))},id);await page.reload();
 }
 console.log('通过：任务行去重、两行负责人/省略、完整名单悬浮/键盘/只读、任务级卡片/筛选/分页、整单完成日期及窄屏');
}
