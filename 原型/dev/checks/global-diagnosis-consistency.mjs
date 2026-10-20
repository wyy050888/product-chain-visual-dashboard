import assert from 'node:assert/strict';

// 验证关联待办的期间、最新截止日和历史结果，办理仍全部使用现有待办弹窗。
export async function globalDiagnosisConsistency(page){
 await page.emulateMedia({reducedMotion:'reduce'});
 const saved=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit());
 const part=key=>root.locator('[data-gd-part="'+key+'"]').click();
 const action=(id,kind)=>root.locator('[data-gd-id="'+id+'"][data-gd-action="'+kind+'"]').click();
 const dialog=page.locator('.up-todo-dialog');
 try{
  // 临时记录验证现有业务关联单元格与依据头部；检查结束恢复原存储。
  const before=await page.evaluate(()=>localStorage.getItem('product-risk-todos-v1'));
  const initial=await audit(),base=initial.tasks.find(r=>!r.task.spuId.startsWith('GLOBAL|')).task;
  const fixtures=[{...base,id:'association-check-product',title:'关联展示产品检查',gdSource:'',gdIssue:'',objectName:initial.tasks.find(r=>r.id===base.id).objectName,source:'manual'},
   {...base,id:'association-check-empty',title:'关联展示空对象检查',spuId:'GLOBAL|association-check',gdSource:'invalid',gdIssue:'',objectName:'',source:'manual'}];
  await page.evaluate(items=>{const tasks=JSON.parse(localStorage.getItem('product-risk-todos-v1'));for(const task of items)tasks[task.id]=task;localStorage.setItem('product-risk-todos-v1',JSON.stringify(tasks))},fixtures);
  await page.reload();await part('closure');
  for(const task of fixtures){
   await root.locator('[data-gd-search]').fill(task.title);
   const cell=root.locator('td[data-label="业务关联"]'),expected=task.objectName||'未关联';
   assert.equal(await cell.locator('b').innerText(),expected);assert((await cell.locator('small').innerText()).startsWith('待确认 · '));
   await action(task.id,'evidence');assert((await page.locator('.gd-detail-head').innerText()).includes('待确认 · '+expected));await page.locator('#close').click();
  }
  await page.evaluate(value=>{if(value===null)localStorage.removeItem('product-risk-todos-v1');else localStorage.setItem('product-risk-todos-v1',value)},before);await page.reload();
  let data=await audit();const date=data.coordination[0].date;
  await root.locator('#gd-date-trigger').click();
  const day=page.locator('#up-date-popover [data-range-date="'+date+'"]:not(.outside)');
  await day.click();await day.click();
  data=await audit();assert.deepEqual(data.range,{start:date,end:date});
  const linked=[...data.focus,...data.coordination,...data.resource];
  assert(linked.some(r=>r.task.status!=='suggested'&&r.task.end>date),'覆盖统计截止日晚于所选日期的现有待办');
  for(const row of linked)assert(data.tasks.some(t=>t.id===row.task.id),'关联待办不能因统计日期被闭环列表遗漏：'+row.id);
  await part('closure');assert((await audit()).visible.some(r=>r.id===data.coordination[0].task.id));
  await page.locator('#refreshai').click();data=await audit();
  for(const row of [...data.coordination,...data.resource])assert.equal(data.tasks.filter(t=>t.id===row.task.id).length,1,'刷新后仍只保留一个关联待办');
  await root.locator('#gd-date-trigger').click();await page.locator('#up-date-popover [data-range-preset="30"]').click();
  await part('execution');await root.locator('[data-gd-tab="focus"]').click();
  const today=(await audit()).range.end,dates=[2,4,14].map(n=>{const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)});
  const owners=Object.fromEntries((await audit()).focus.map(r=>[r.id,r.owner]));
  for(const [id,due] of [['focus-direction-project',dates[0]],['focus-risk-product',dates[1]]]){
   await action(id,'task');await dialog.locator('[data-people-query]').fill('林悦');
   await page.getByRole('option',{name:'林悦 · 产品中心',exact:true}).click();
   await dialog.locator('[name="due"]').fill(due);await dialog.locator('[data-todo-action="assign"]').click();
   await dialog.waitFor({state:'detached'});
  }
  await root.locator('[data-gd-sort]').selectOption('due');
  const order=async()=>{const d=await audit();return d.visible.map(r=>r.id)};
  let ids=await order();assert(ids.indexOf('focus-direction-project')<ids.indexOf('focus-risk-product'));
  await action('focus-direction-project','task');await dialog.locator('[data-todo-field-edit="due"]').click();
  await dialog.locator('[data-inline-value]').fill(dates[2]);await dialog.locator('header h3').click();
  await dialog.locator('[data-todo-close]').click();
  ids=await order();assert(ids.indexOf('focus-risk-product')<ids.indexOf('focus-direction-project'),'修改截止日后立即按最新日期重排');
  data=await audit();
  for(const id of ['focus-direction-project','focus-risk-product']){const row=data.focus.find(r=>r.id===id);assert.equal(row.due,row.task.due);assert.equal(row.owner,owners[id],'聚焦仍观察原责任人的工作');}
  await part('closure');await root.locator('[data-gd-tab="all"]').click();
  const openEvidence=async row=>{await root.locator('[data-gd-search]').fill(row.title);await action(row.id,'evidence');};
  const empty=data.tasks.find(r=>r.task.status!=='suggested'&&!r.task.evidence?.trim());assert(empty);
  await openEvidence(empty);
  assert(!(await page.locator('.gd-text-section h4').allTextContents()).includes('处理结果'));
  assert(!(await page.locator('#dialogbody').innerText()).includes('暂无处理结果'));await page.locator('#close').click();
  const history=data.tasks.find(r=>r.task.evidence?.trim());assert(history);
  await openEvidence(history);assert((await page.locator('.gd-text-section h4').allTextContents()).includes('处理结果'));
  assert((await page.locator('#dialogbody').innerText()).includes(history.task.evidence.trim()));await page.locator('#close').click();
 }finally{await page.evaluate(storage=>{localStorage.clear();for(const [key,value] of Object.entries(storage))localStorage.setItem(key,value)},saved)}
}
