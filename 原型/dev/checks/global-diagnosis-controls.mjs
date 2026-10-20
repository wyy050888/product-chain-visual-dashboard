import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
export async function globalDiagnosisControls(page){
 // 此检查的金额/日期期望基于固定样例截止日；动态跨日另由 dynamicDates 覆盖。
 await page.clock.setFixedTime(new Date('2026-10-10T04:00:00Z'));await page.reload({waitUntil:'domcontentloaded',timeout:30000});
 await page.emulateMedia({reducedMotion:'reduce'});
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>window.globalDiagnosisAudit()),part=key=>root.locator(`[data-gd-part="${key}"]`).click(),tab=key=>root.locator(`[data-gd-tab="${key}"]`).click(),search=root.locator('[data-gd-search]');
 assert.equal(await root.locator(':scope>.sectionhead #gd-date-trigger').count(),1);assert.equal(await root.locator('#ai-inline-controls').innerText(),'');assert.equal(await root.locator('#ai-inline-details .gd-filters [data-gd-search]').count(),1);
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
 // 任务闭环只保留状态Tab，逐项统计、组合搜索、重置与切换恢复。
 await part('closure');const closure=(await audit()).tasks;
 assert.equal(await root.locator('[data-gd-status]').count(),0);assert.equal((await audit()).state.filters.closure.status,undefined);assert.equal(await root.locator('[data-gd-issue-type]').count(),0);assert.equal((await audit()).state.filters.closure.issueType,undefined);assert(closure.every(r=>!('issueType' in r)));
 for(const key of ['all','suggested','overdue','pending','working','done']){
  await tab(key);const d=await audit(),expected=closure.filter(r=>key==='all'||(key==='overdue'?r.overdue:r.task.status===key));
  assert.deepEqual(d.visible.map(r=>r.id).sort(),expected.map(r=>r.id).sort());assert.equal(await root.locator('[data-gd-tab="'+key+'"] span').innerText(),String(expected.length));
  await search.fill('不会匹配的任务检索词');assert.equal((await audit()).visible.length,0);await root.locator('[data-gd-reset]').click();assert.equal((await audit()).state.tabs.closure,key);assert.equal((await audit()).visible.length,expected.length);assert.equal(await root.locator('[data-gd-status],[data-gd-issue-type]').count(),0);
 }
 await tab('pending');await part('resource');await part('closure');assert.equal((await audit()).state.tabs.closure,'pending');await tab('all');
 // 其他列表继续使用状态枚举，取值与状态列一致；空结果和独立恢复同样有效。
 for(const [section,sub,labels] of [['execution','reports',['未抓取到','内容待补齐','逾期补交']],['execution','focus',['待核实','待处理','处理中','已完成']],['coordination','all',['待下发','待处理','处理中','已完成']],['resource','all',['待下发','待处理','处理中','已完成']]]){
  await part(section);await tab(sub);const initial=await audit();const options=await root.locator('[data-gd-status] option').evaluateAll(es=>es.slice(1).map(e=>({value:e.value,label:e.textContent})));assert.deepEqual(options.map(o=>o.label),labels);
  for(const option of options){await root.locator('[data-gd-status]').selectOption(option.value);const filtered=await audit();assert.deepEqual(filtered.visible.map(r=>r.id),initial.visible.filter(r=>r.status===option.label).map(r=>r.id));assert.deepEqual(filtered.counts,initial.counts)}
  await root.locator('[data-gd-reset]').click();assert.equal(await root.locator('[data-gd-status]').inputValue(),'all');
 }
 await part('execution');await tab('reports');await root.locator('[data-gd-status]').selectOption('missing');await tab('focus');assert.equal(await root.locator('[data-gd-status]').inputValue(),'all');await root.locator('[data-gd-status]').selectOption('suggested');await part('coordination');await root.locator('[data-gd-status]').selectOption('working');await part('execution');assert.equal(await root.locator('[data-gd-status]').inputValue(),'suggested');await root.locator('[data-gd-reset]').click();await tab('reports');assert.equal(await root.locator('[data-gd-status]').inputValue(),'missing');await root.locator('[data-gd-reset]').click();await part('coordination');assert.equal(await root.locator('[data-gd-status]').inputValue(),'working');await root.locator('[data-gd-reset]').click();await part('execution');
 const totals=(await audit()).counts;
 assert.equal(await root.locator('[data-gd-issue-type]').count(),0);assert.equal((await audit()).state.filters['execution/reports'].issueType,undefined);assert((await audit()).reports.every(r=>!('issueType' in r)));await root.locator('[data-gd-status]').selectOption('missing');await tab('focus');assert.equal(await root.locator('[data-gd-issue-type]').inputValue(),'all');await root.locator('[data-gd-issue-type]').selectOption('focus-direction');
 // 协同和资源以Tab分类，不再派生相同分类的事项类型；独立状态仍可组合。
 for(const [section,keys] of [['coordination',['all','block','decision']],['resource',['all','capacity','conflict']]]){
  await part(section);const rows=(await audit())[section];assert(rows.every(r=>!('issueType' in r)));assert.equal((await audit()).state.filters[section].issueType,undefined);
  for(const key of keys){
   await tab(key);assert.equal(await root.locator('[data-gd-issue-type]').count(),0);assert.equal(await root.locator('[data-gd-status]').count(),1);
   const expected=rows.filter(r=>key==='all'||r.kind===key),ids=rs=>rs.map(r=>r.id).sort();assert.deepEqual(ids((await audit()).visible),ids(expected));assert.equal(await root.locator('[data-gd-tab="'+key+'"] span').innerText(),String(expected.length));
   await root.locator('[data-gd-status]').selectOption('working');assert.deepEqual(ids((await audit()).visible),ids(expected.filter(r=>r.task.status==='working')));
   await search.fill('不会匹配的检索词');assert.equal((await audit()).visible.length,0);await root.locator('[data-gd-reset]').click();assert.equal((await audit()).state.tabs[section],key);assert.deepEqual(ids((await audit()).visible),ids(expected));assert.equal((await audit()).state.filters[section].issueType,undefined);
  }
  await part('closure');await part(section);assert.equal((await audit()).state.tabs[section],keys.at(-1));await tab('all');
 }
 await part('execution');assert.equal(await root.locator('[data-gd-issue-type]').inputValue(),'focus-direction');await root.locator('[data-gd-reset]').click();await tab('reports');assert.equal(await root.locator('[data-gd-issue-type]').count(),0);assert.equal(await root.locator('[data-gd-status]').inputValue(),'missing');await root.locator('[data-gd-reset]').click();
 // 日志搜索抓取原文；工作聚焦保持另一组查询和部门、排序。
 await search.fill('已核对新品经营数据');let d=await audit();assert(d.visible.length>0);assert(d.visible.every(r=>r.progress.includes('已核对新品经营数据')));assert.deepEqual(d.counts,totals,'表格查询不改变模块总数');
 await tab('focus');assert.equal(await search.inputValue(),'');await search.fill('验收');await root.locator('[data-gd-filter="department"]').selectOption('产品中心');await root.locator('[data-gd-sort]').selectOption('due');assert((await audit()).visible.length>0);
 await tab('reports');assert.equal(await search.inputValue(),'已核对新品经营数据');await root.locator('[data-gd-report-type]').selectOption('月报');await search.fill('供应商储备');d=await audit();assert(d.visible.length>0);assert(d.visible.every(r=>r.type==='月报'&&r.progress.includes('供应商储备')));
 await tab('focus');assert.equal(await search.inputValue(),'验收');assert.equal(await root.locator('[data-gd-filter="department"]').inputValue(),'产品中心');assert.equal(await root.locator('[data-gd-sort]').inputValue(),'due');assert.equal(await root.locator('[data-gd-report-type]').count(),0);
 await part('closure');assert.equal(await search.inputValue(),'');assert((await search.getAttribute('placeholder')).includes('下发人'));await search.fill('林悦');d=await audit();assert(d.visible.some(r=>r.task.assignedBy==='林悦'&&r.owner!=='林悦'));
 await part('coordination');assert.equal(await search.inputValue(),'');await search.fill('研发中心');d=await audit();assert(d.visible.length>0);assert(d.visible.every(r=>r.departments.includes('研发中心')));
 await part('resource');assert.equal(await search.inputValue(),'');await search.fill('检测设备');d=await audit();assert.equal(d.visible.length,1);assert(d.visible[0].resource.includes('检测设备'));
 await part('coordination');assert.equal(await search.inputValue(),'研发中心');await root.locator('[data-gd-reset]').click();await part('resource');assert.equal(await search.inputValue(),'检测设备');await root.locator('[data-gd-reset]').click();
 await part('closure');assert.equal(await search.inputValue(),'林悦');await root.locator('[data-gd-reset]').click();await part('execution');await root.locator('[data-gd-reset]').click();await tab('reports');assert.equal(await root.locator('[data-gd-report-type]').inputValue(),'月报');await root.locator('[data-gd-reset]').click();
 for(const width of [1920,1440,1024,390]){
  await page.setViewportSize({width,height:1080});for(const key of ['month','quarter','year','day']){await mode(key);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'period overflow '+key+' '+width)}
  await root.locator('#gd-date-trigger').click();const bounds=await calendar.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width);await page.keyboard.press('Escape');
  await root.screenshot({path:fileURLToPath(new URL(`../../outputs/global-diagnosis-controls-${width}.png`,import.meta.url)),style:'.head,.navigation-toolbar{visibility:hidden!important}'});
 }
 await page.setViewportSize({width:1920,height:1080});await mode('day');
}
