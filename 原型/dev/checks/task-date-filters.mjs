import assert from 'node:assert/strict';

export async function taskDateFilters(page){
 await page.clock.setFixedTime(new Date('2026-10-30T04:00:00Z'));await page.reload();
 await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit());
 await root.locator('[data-gd-part="tasks"]').click();
 const storage='dashboard.global-manual-tasks.v1',original=await page.evaluate(key=>localStorage.getItem(key),storage);
 await page.evaluate(storage=>{
  const base=globalDiagnosisAudit().tasks[0].task,records=[];
  const add=(suffix,assignedAt,due)=>{
   const id='manual|date-filter-test|'+suffix,task={...structuredClone(base),id,title:suffix,assignedAt,due,source:'manual',gdManualEntry:true,start:'2026-09-01',end:'2026-09-30'};
   delete task.gdWorkKey;delete task.gdIssue;
   if(!assignedAt){task.createdAt="";task.logs=[]}
   task.responsibilities=task.responsibilities?.map((r,i)=>({...r,id:id+'|'+i,due}));records.push(task);
  };
  add('november','2026-10-15T04:00:00Z','2026-11-03');
  add('old-issue','2026-09-15T04:00:00Z','2026-11-03');
  add('december','2026-10-15T04:00:00Z','2026-12-01');
  add('beijing-boundary','2026-10-29T16:00:00Z','2026-11-04');
  add('missing-issue','','2026-11-03');
  localStorage.setItem(storage,JSON.stringify(records));
 },storage);
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
 await root.locator('[data-gd-part="tasks"]').click();
 await root.locator('[data-gd-mode="month"]').click();await root.locator('[data-gd-value]').selectOption('10');
 const ids=async()=>(await audit()).tasks.filter(r=>r.task.id.startsWith('manual|date-filter-test|')).map(r=>r.task.title).sort();
 try{
  assert.deepEqual(await ids(),['beijing-boundary','december','november'],'下发日在期间内，未来计划任务可见；不使用观察期补日期');
  assert.equal(await root.locator('.gd-date-caption').textContent(),'下发日期');
  const trigger=()=>root.locator('[data-gd-due-range]'),calendar=page.locator('#gd-task-due-popover');
  assert.match(await trigger().innerText(),/请选择/);
  assert.equal(await trigger().locator('.unified-field-name').innerText(),'计划完成日期','字段名在统一筛选框内');
  assert.equal(await trigger().locator('svg').count(),0,'不再使用独立日历图标样式');
  assert(await root.locator('[data-gd-due-clear]').isHidden(),'未选择周期时不显示清空');
  await trigger().click();
  assert.equal(await calendar.locator('.risk-calendar-month').count(),2,'复用双月日区间面板');
  await calendar.locator('[data-range-month="1"]').click();
  await calendar.locator('[data-range-date="2026-11-01"]:not(.outside)').click();
  assert(await calendar.isVisible(),'第一次只选开始日');
  await calendar.locator('[data-range-date="2026-11-30"]:not(.outside)').click();
  await calendar.waitFor({state:'detached'});
  assert.deepEqual(await ids(),['beijing-boundary','november'],'下发日期和计划日期取交集，不是或');
  assert.equal((await audit()).counts.at(-1).count,(await audit()).tasks.length,'卡片数量使用相同日期范围');
  await trigger().click();await page.keyboard.press('Escape');assert.equal(await calendar.count(),0);
  assert.deepEqual(await ids(),['beijing-boundary','november'],'取消保留已应用范围');
  await root.locator('[data-gd-value]').selectOption('9');
  assert.deepEqual(await ids(),['old-issue'],'更换下发期间保留计划日期条件');
  await trigger().hover();const clear=root.locator('[data-gd-due-clear]');
  assert.equal(await clear.evaluate(node=>getComputedStyle(node).opacity),'1','悬浮已选周期时显示X');
  await clear.click();assert.equal(await calendar.count(),0,'点击X不打开日历');
  assert.deepEqual(await ids(),['old-issue'],'清空计划日期不改变下发期间');
  assert.match(await trigger().innerText(),/请选择/);assert.equal((await audit()).state.taskDueRange.start,'');
  // 在历史下发期间及已有计划范围内新增未来期限任务，验证保存后可找到。
  await trigger().click();
  await calendar.locator('[data-range-date="2026-09-01"]:not(.outside)').click();
  await calendar.locator('[data-range-date="2026-09-30"]:not(.outside)').click();
  await root.locator('[data-gd-task-create]').click();
  const entry=page.locator('.gd-task-entry-dialog');
  await entry.locator('[name=title]').fill('日期筛选新建未来任务');
  await entry.locator('[name=description]').fill('核对后续交付计划');
  await entry.locator('[name=plan]').fill('确认交付安排');
  await entry.locator('[data-gd-assignee-query]').fill('林');
  await entry.locator('[data-gd-assignee-name="林悦"]').click();
  await entry.locator('[name=due]').fill('2026-11-03');
  await entry.locator('[data-gd-entry-save]').click();await entry.waitFor({state:'detached'});
  assert.equal((await audit()).state.taskDueRange.start,'','保存成功清空计划日期筛选');
  assert((await audit()).tasks.some(r=>r.task.title==='日期筛选新建未来任务'),'未来期限新任务可在本次下发期间找到');
  for(const width of [1920,1024,390]){
   await page.setViewportSize({width,height:1000});await trigger().click();
   const box=await calendar.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1,'公共下拉不超出屏幕 '+width);
   assert(await root.evaluate(n=>n.scrollWidth<=n.clientWidth+1),'任务区不横向溢出 '+width);
   await page.keyboard.press('Escape');
  }
  await page.setViewportSize({width:1920,height:1080});await root.screenshot({path:'outputs/task-date-filters-1920.png'});
 }finally{
  await page.evaluate(({storage,original})=>{if(original===null)localStorage.removeItem(storage);else localStorage.setItem(storage,original)},{storage,original});
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready',null,{timeout:60000});
  await page.setViewportSize({width:1920,height:1080});
 }
 console.log('通过：下发日筛选、计划日公共双月下拉/未来日期/清空、交集及计数、新增未来任务可见性、北京时间边界及宽窄屏。');
}
