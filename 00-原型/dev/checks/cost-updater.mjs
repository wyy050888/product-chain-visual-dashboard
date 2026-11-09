import assert from 'node:assert/strict';
export async function costUpdater(page){
 const keys=['cost-efficiency-config-v1','dashboard-import-history-v1'],previous=await page.evaluate(keys=>keys.map(key=>[key,localStorage.getItem(key)]),keys),audit=()=>page.evaluate(()=>costConfigAudit());
 const ready=async()=>{await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.dashboardBoot==='ready');await page.evaluate(()=>location.hash='#system-cost-efficiency')};
 try{
  await page.clock.setFixedTime(new Date('2026-10-30T04:00:00Z'));await page.evaluate(keys=>keys.forEach(key=>localStorage.removeItem(key)),keys);await ready();
  assert.deepEqual((await page.locator('#cec-head th').allTextContents()).slice(-3),['更新人','更新时间','操作']);
  assert(await page.locator('#cec-body .cec-updater').evaluateAll(nodes=>nodes.every(n=>n.textContent==='—')),'历史缺失不补造更新人');
  assert.equal(await page.locator('#cec-total tr').evaluate(row=>[...row.cells].reduce((n,cell)=>n+cell.colSpan,0)),9,'合计行九列对齐');
  const initial=await audit(),item=initial.metrics.find(row=>row.department==='warehouse'&&row.category==='packaging');assert(item);
  const headers=['责任部门','数据类型','降本分类','降本指标','年度',...Array.from({length:12},(_,i)=>(i+1)+'月'),'备注'];
  const row=(type,value)=>['仓储部',type,type==='部门目标'?'':'包装降本',type==='部门目标'?'':item.metric,'2026',...Array(9).fill(''),value,'','',''];
  const pick=async rows=>{await page.locator('#cec-import').click();await page.locator('#cec-file').setInputFiles({name:'更新人验证.csv',mimeType:'text/csv',buffer:Buffer.from('\uFEFF'+[headers,...rows].map(r=>r.join(',')).join('\r\n'))})};
  const snapshot=JSON.stringify(initial.store);
  await pick([row('部门目标','1200.34'),row('实际降本','-1')]);await page.locator('#cec-confirm-import').click();await page.locator('#cec-import-dialog .ui-import-feedback.is-error').waitFor();assert.equal(JSON.stringify((await audit()).store),snapshot,'字段校验失败不覆盖原更新信息');await page.locator('[data-cec-import-close]').first().click();
  await pick([row('部门目标','1200.34'),row('实际降本','450.12')]);
  await page.evaluate(()=>{window.cecUpdaterNativeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='cost-efficiency-config-v1')throw Error('blocked');return window.cecUpdaterNativeSet.call(this,k,v)}});
  await page.locator('#cec-confirm-import').click();await page.locator('#cec-import-dialog .ui-import-feedback.is-error').waitFor();assert.equal(JSON.stringify((await audit()).store),snapshot,'保存失败不记录新更新人');
  await page.evaluate(()=>{Storage.prototype.setItem=window.cecUpdaterNativeSet;delete window.cecUpdaterNativeSet});await page.locator('#cec-confirm-import').click();await page.locator('#cec-import-dialog').waitFor({state:'hidden'});
  const saved=await audit(),target=saved.store.departmentTargets['warehouse|2026-10'],actual=saved.store.months[item.id+'|2026-10'];assert.equal(target.targetCents,120034);assert.equal(actual.actualCents,45012);assert.equal(target.actor,'管理员');assert.equal(actual.actor,'管理员');assert.equal(target.updatedAt,actual.updatedAt);
  await page.locator('#cec-department').selectOption('warehouse');await page.locator('#cec-query').fill(item.metric);
  const parent=()=>page.locator('[data-cec-target-department="warehouse"]');if(await parent().locator('[data-cec-expand]').getAttribute('aria-expanded')==='false')await parent().locator('[data-cec-expand]').click();
  assert.equal(await parent().locator('.cec-updater').innerText(),'管理员');assert.equal(await page.locator('[data-cec-project="'+item.id+'"] .cec-updater').innerText(),'管理员');
  for(const mode of ['quarter','year','month']){await page.locator('[data-cec-time-mode="'+mode+'"]').click();assert.equal(await parent().locator('.cec-updater').innerText(),'管理员')}
  await ready();assert.equal(JSON.stringify((await audit()).store),JSON.stringify(saved.store),'更新人与时间刷新后保留');
  for(const width of [1920,390]){await page.setViewportSize({width,height:1080});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'新增更新人列不撑宽页面');}
 }finally{
  await page.evaluate(previous=>{if(window.cecUpdaterNativeSet){Storage.prototype.setItem=window.cecUpdaterNativeSet;delete window.cecUpdaterNativeSet}for(const [key,value]of previous)value===null?localStorage.removeItem(key):localStorage.setItem(key,value)},previous);await ready();
 }
 console.log('通过：更新人九列表头、历史缺失、成功导入/失败原子性、部门和细项展示、月季年与刷新持久化。');
}
