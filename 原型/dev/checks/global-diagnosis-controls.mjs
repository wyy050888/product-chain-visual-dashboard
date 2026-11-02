import {resetDiagnosisFilters} from './diagnosis-filter-helpers.mjs';
import {verifyDiagnosisHeaderSort} from './global-diagnosis-header-sort.mjs';
import {globalDiagnosisWidth} from './global-diagnosis-layout.mjs';
import {selectDiagnosisStatus,verifyDiagnosisTagCounts,verifyDiagnosisStatusMulti} from './global-diagnosis-tag-filters.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
export async function globalDiagnosisControls(page){
 // 此检查的金额/日期期望基于固定样例截止日；动态跨日另由 dynamicDates 覆盖。
 await page.clock.setFixedTime(new Date('2026-10-10T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded',timeout:30000});
 await page.emulateMedia({reducedMotion:'reduce'});
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>window.globalDiagnosisAudit()),part=key=>root.locator(`[data-gd-part="${key}"]`).click(),tab=key=>root.locator(`[data-gd-tab="${key}"]`).click(),search=root.locator('[data-gd-search]');
 const resetAll=async()=>{await resetDiagnosisFilters(root);await selectDiagnosisStatus(root,'all')};
 assert.equal(await root.locator(':scope>.sectionhead #gd-date-trigger').count(),1);assert.equal(await root.locator('#ai-inline-controls').innerText(),'');assert.equal(await root.locator('#ai-inline-details .gd-filters [data-gd-search]').count(),1);
 assert.equal(await root.locator('[data-gd-filter="owner"]').count(),0);assert.match(await search.getAttribute('placeholder'),/负责人/);
 // 与高危预警复用日/月/季/年组件；自然周期、日区间、取消及筛选隔离。
 const mode=key=>root.locator('[data-gd-mode="'+key+'"]').click(),calendar=page.locator('#up-date-popover');
 const riskBefore=await page.locator('#time-risk').innerHTML();
 assert.deepEqual(await root.locator('[data-gd-mode]').allTextContents(),['日','月','季','年']);
 assert.equal(await root.locator('[data-gd-mode="week"],[data-gd-mode="range"],[data-gd-mode="all"],#gd-range-form,[data-gd-date],.follow-time').count(),0);
 const dayRange=(await audit()).range;
 await root.locator('#gd-date-trigger').click();await calendar.locator('[data-range-date="2026-10-01"]:not(.outside)').click();await page.keyboard.press('Escape');assert.deepEqual((await audit()).range,dayRange);
 await root.locator('#gd-date-trigger').click();assert(await calendar.locator('[data-range-date="2026-10-11"]:not(.outside)').isDisabled());
 await calendar.locator('[data-range-date="2026-10-10"]:not(.outside)').click();await calendar.locator('[data-range-date="2026-10-01"]:not(.outside)').click();assert.deepEqual((await audit()).range,{start:'2026-10-01',end:'2026-10-10'});assert.equal(await calendar.count(),0);
 await root.locator('#gd-date-trigger').click();await calendar.locator('[data-range-date="2026-10-08"]:not(.outside)').click();await calendar.locator('[data-range-date="2026-10-08"]:not(.outside)').click();assert.deepEqual((await audit()).range,{start:'2026-10-08',end:'2026-10-08'});
 await mode('month');assert.deepEqual((await audit()).range,{start:'2026-10-01',end:'2026-10-10'});assert(await root.locator('[data-gd-value] option[value="7"]').isDisabled());await root.locator('[data-gd-value]').selectOption('9');assert.deepEqual((await audit()).range,{start:'2026-09-01',end:'2026-09-30'});assert.equal((await audit()).focus.length,0);
 await mode('quarter');assert.deepEqual((await audit()).range,{start:'2026-07-01',end:'2026-09-30'});assert(await root.locator('[data-gd-value] option[value="2"]').isDisabled());await root.locator('[data-gd-value]').selectOption('4');assert.deepEqual((await audit()).range,{start:'2026-10-01',end:'2026-10-10'});
 await mode('year');assert.deepEqual((await audit()).range,{start:'2026-01-01',end:'2026-10-10'});assert.equal(await root.locator('[data-gd-value]').count(),0);assert.deepEqual(await root.locator('[data-gd-year] option').evaluateAll(es=>es.map(e=>e.value)),['2026']);
 await mode('day');assert.deepEqual((await audit()).range,{start:'2026-10-08',end:'2026-10-08'});await root.locator('#gd-date-trigger').click();await calendar.locator('[data-range-preset="30"]').click();assert.deepEqual((await audit()).range,dayRange);assert.equal(await page.locator('#time-risk').innerHTML(),riskBefore);
 const placement=await root.evaluate(e=>({time:e.querySelector('.gd-header-tools').getBoundingClientRect().left,title:e.querySelector('h2').getBoundingClientRect().right,filters:e.querySelector('.gd-filters').getBoundingClientRect().top,cards:e.querySelector('#aigrid').getBoundingClientRect().bottom}));assert(placement.time>placement.title);assert(placement.filters>placement.cards);

 for(const [section,sub] of [['coordination','all'],['resource','all'],['execution','reports'],['execution','focus'],['closure',null]]){
  await part(section);if(sub)await tab(sub);await resetAll();const initial=await audit(),rows=initial.visible,ids=rs=>rs.map(r=>r.id).sort();
  if(section==='coordination'){await verifyDiagnosisStatusMulti(page,rows);await resetAll()}
  for(const status of ['pending','working','done']){await selectDiagnosisStatus(root,status);assert.deepEqual(ids((await audit()).visible),ids(rows.filter(r=>r.participants.some(role=>role.status===status))));assert.deepEqual((await audit()).counts,initial.counts);await verifyDiagnosisTagCounts(root,rows,{priority:'all',status:[status]})}
  await resetAll();
  assert.equal(await root.locator('[data-gd-filter="businessType"],select[data-gd-priority]').count(),0,'业务对象筛选移除，优先级直接展示');
  assert.deepEqual(await root.locator('[data-gd-priority] .gd-filter-label').allTextContents(),['全部','P0','P1','P2','P3']);
  for(const priority of ['P0','P1','P2','P3','all']){await root.locator('[data-gd-priority="'+priority+'"]').click();const current=await audit();assert.deepEqual(ids(current.visible),ids(rows.filter(r=>priority==='all'||r.task.priority===priority)));assert.deepEqual(current.counts,initial.counts);assert.equal(await root.locator('[data-gd-priority="'+priority+'"]').getAttribute('aria-selected'),'true');await verifyDiagnosisTagCounts(root,rows,{priority,status:'all'})}
  await resetAll();const owner=rows[0]?.participants.find(p=>p.assignee)?.assignee;
  if(owner){
   await search.fill(owner);const exact=ids((await audit()).visible);assert(exact.length>0);assert(rows.filter(r=>r.participants.some(p=>p.assignee===owner)).every(row=>exact.includes(row.id)),'输入姓名可找到所有相关负责人的待办');
   await search.fill(owner.slice(-1));const partial=ids((await audit()).visible);assert(exact.every(id=>partial.includes(id)),'支持输入部分姓名');assert(await search.evaluate(e=>e===document.activeElement),'输入时保持焦点');
  }
  await search.fill('不会匹配的检索词');assert.equal((await audit()).visible.length,0);assert((await root.locator('.gd-filter-count').allTextContents()).every(n=>n==='0'),'角标跟随搜索条件');await resetAll();assert.deepEqual(ids((await audit()).visible),ids(rows));
  if(rows[0]){await search.fill(rows[0].participants[0].action);assert((await audit()).visible.some(r=>r.id===rows[0].id));await resetAll()}
 }
 await part('closure');assert.equal(await root.locator('[data-gd-tab]').count(),0);
 await selectDiagnosisStatus(root,'pending');await root.locator('[data-gd-priority="P1"]').click();await part('resource');await search.fill('唐琪');await root.locator('[data-gd-priority="P2"]').click();await part('closure');assert.equal(await root.locator('[data-gd-status="pending"]').getAttribute('aria-pressed'),'true');assert.equal(await root.locator('[data-gd-status="working"]').getAttribute('aria-pressed'),'false');assert.equal(await root.locator('[data-gd-priority="P1"]').getAttribute('aria-selected'),'true','优先级按模块独立保存');await resetDiagnosisFilters(root);assert.equal(await root.locator('[data-gd-priority="all"]').getAttribute('aria-selected'),'true');assert.deepEqual(await root.locator('[data-gd-status][aria-pressed="true"]').evaluateAll(es=>es.map(e=>e.dataset.gdStatus)),['pending','working'],'重置回默认未完成状态');await part('resource');assert.equal(await search.inputValue(),'唐琪');assert.equal(await root.locator('[data-gd-priority="P2"]').getAttribute('aria-selected'),'true');await resetDiagnosisFilters(root);assert.equal(await search.inputValue(),'');
 await part('execution');await tab('reports');await search.fill('日志');await tab('focus');assert.equal(await search.inputValue(),'');await tab('reports');assert.equal(await search.inputValue(),'日志');await resetDiagnosisFilters(root);
 await verifyDepartmentTabs(page);
 await verifyDiagnosisHeaderSort(page);
 for(const width of [1920,1440,1024,390]){
  await page.setViewportSize({width,height:1080});for(const key of ['month','quarter','year','day']){await mode(key);await globalDiagnosisWidth(page,key+' '+width)}
  await root.locator('.gd-filters').screenshot({path:fileURLToPath(new URL('../../outputs/global-diagnosis-filters-'+width+'.png',import.meta.url))});
  await root.locator('#gd-date-trigger').click();const bounds=await calendar.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width);await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1920,height:1080});await mode('day');
}

async function verifyDepartmentTabs(page){
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit()),departments=['产品中心','项目部','品质中心','研发中心','采购部'];
 const ids=rows=>rows.map(r=>r.id).sort(),matches=(row,department)=>['pending','working'].includes(row.task.status)&&row.participants.some(role=>role.department===department);
 const select=department=>root.locator('[data-gd-department="'+department+'"]').click();
 for(const [part,tab] of [['coordination','all'],['resource','all'],['execution','reports'],['execution','focus'],['closure',null]]){
  await root.locator('[data-gd-part="'+part+'"]').click();if(tab)await root.locator('[data-gd-tab="'+tab+'"]').click();await resetDiagnosisFilters(root);
  const initial=await audit(),rows=initial.visible;
  assert.deepEqual(await root.locator('[data-gd-department]:not([data-gd-department="all"])').evaluateAll(es=>es.map(e=>e.dataset.gdDepartment)),departments,'四个模块均显示五部门');
  assert.equal(await root.locator('[data-gd-filter="businessType"]').count(),0);
  assert.doesNotMatch(await root.locator('.gd-filters').innerText(),/业务类型/);
  for(const department of departments){
   await select(department);const data=await audit(),expected=rows.filter(r=>matches(r,department));
   assert.deepEqual(ids(data.visible),ids(expected),'按参与责任项过滤，而非仅牵头部门：'+part+'/'+department);
   assert.deepEqual(data.counts,initial.counts,'部门筛选不改变总诊断卡片总量');
   assert.equal(await root.locator('[data-gd-department="'+department+'"]').getAttribute('aria-selected'),'true');
   const shown=await root.locator('[data-gd-task]').evaluateAll(es=>es.map(e=>e.dataset.gdTask));
   assert.deepEqual(shown,data.tableRows.slice(0,8).map(e=>e.row.task.id),'选中部门后仍按任务显示完整人员');
   for(const name of departments)assert.equal(await root.locator('[data-gd-department="'+name+'"]>span').innerText(),String(new Set(rows.filter(row=>matches(row,name)).map(row=>row.task.id)).size),'部门角标按任务去重，忽略自身选择');
  }
  const current=(await audit()).visible,priority=current[0]?.task.priority;
  if(priority){await root.locator('[data-gd-priority="'+priority+'"]').click();assert.deepEqual(ids((await audit()).visible),ids(current.filter(r=>r.task.priority===priority)),'部门与优先级取交集')}
  await resetDiagnosisFilters(root);assert.deepEqual(ids((await audit()).visible),ids(rows));assert.equal(await root.locator('[data-gd-department="all"]').getAttribute('aria-selected'),'true');
 }
 await root.locator('[data-gd-part="coordination"]').click();await select('研发中心');await root.locator('[data-gd-part="resource"]').click();await select('采购部');await root.locator('[data-gd-part="coordination"]').click();assert.equal(await root.locator('[data-gd-department="研发中心"]').getAttribute('aria-selected'),'true','模块分别保存部门');
 await resetDiagnosisFilters(root);await root.locator('[data-gd-part="resource"]').click();await resetDiagnosisFilters(root);
 for(const width of [1920,1024,390]){await page.setViewportSize({width,height:900});await root.locator('[data-gd-department="all"]').focus();await page.keyboard.press('End');assert.equal(await root.locator('[data-gd-department="采购部"]').getAttribute('aria-selected'),'true');assert(await root.locator('.gd-panel-navigation').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'部门Tab不溢出 '+width);await select('all');await root.locator('[data-gd-priority="all"]').focus();await page.keyboard.press('End');assert.equal(await root.locator('[data-gd-priority="P3"]').getAttribute('aria-selected'),'true');assert(await root.locator('.gd-priority-filter').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'优先级标签不溢出 '+width);await root.locator('[data-gd-priority="all"]').click()}
 await page.setViewportSize({width:1920,height:1080});
 console.log('通过：五部门Tab、实际责任项/优先级交集、计数、独立记忆、重置、键盘和窄屏');
}
