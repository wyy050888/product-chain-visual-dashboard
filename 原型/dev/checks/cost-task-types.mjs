import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export function verifyCostTaskTypes(){
 const store={},sandbox={localStorage:{getItem:()=>JSON.stringify(store),setItem:()=>{}},window:{}};
 vm.createContext(sandbox);
 for(const name of ['unified-product/07-todo-model.js','cost-control/04-opportunity-model.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/'+name,import.meta.url),'utf8'),sandbox);
 const run=code=>vm.runInContext(code,sandbox);
 assert.equal(run("upTodoType({source:'manual',department:'采购部'})"),'other','手工任务不按负责人部门误判类型');
 assert.equal(run("upTodoType({suggestionKey:'cost-reduction',department:'研发中心'})"),'cost-reduction','降本任务转交研发后仍为降本');
 assert.equal(run("upTodoType({suggestionDepartment:'采购部',department:'品质中心'})"),'supply-optimization','旧自动任务按原始规则部门兼容');
 assert.equal(run("upNormalizeTodo({id:'cost-reduction|p|date',logs:[],status:'working'}).taskType"),'cost-reduction','旧降本任务迁移类型');
 run("var row={spuId:'p',taskId:'cost-reduction|p|date'};upTodos={purchase:{id:'purchase',spuId:'p',taskType:'supply-optimization',status:'working'}}");
 assert.equal(run('Boolean(ccSavedOpportunityTask(row))'),false,'普通采购待办不会标记为降本已下发');
 for(const status of ['pending','working','done']){
  run(`upTodos.cost={id:'cost',spuId:'p',source:'manual',taskType:'cost-reduction',status:'${status}'}`);
  assert.equal(run('ccSavedOpportunityTask(row).id'),'cost','各执行状态均识别为关联降本任务');
 }
 run("upTodos.cost.spuId='other'");assert.equal(run('Boolean(ccSavedOpportunityTask(row))'),false,'不同SPU不串状态');
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/cost-control/04-opportunity-samples.js',import.meta.url),'utf8'),sandbox);
 run("var DATA_CUTOFF='2026-10-10';var shiftDate=(d,n)=>new Date(Date.parse(d)+n*86400000).toISOString().slice(0,10);ccCostProposal=row=>({id:row.taskId,spuId:row.spuId,department:'采购部',taskType:'cost-reduction',status:'suggested'});upTodos={};var sampleRows=['SPU-SOURCE-018','SPU-SOURCE-010','SPU-SOURCE-001'].map(spuId=>({spuId,taskId:'cost-reduction|'+spuId+'|2026-10-10'}));ccEnsureOpportunitySamples(sampleRows)");
 assert.deepEqual(Array.from(run('Object.values(upTodos).map(t=>t.status)')),['pending','working','done']);
 assert.equal(run("Object.values(upTodos).find(t=>t.status==='done').logs.at(-1).to"),'done');
 run("upTodos[sampleRows[0].taskId].title='用户已改标题';upTodos[sampleRows[0].taskId].status='done';upTodos[sampleRows[1].taskId].deletedAt='2026-10-10';delete upTodos[sampleRows[2].taskId];upTodos.manual={id:'manual',spuId:sampleRows[2].spuId,taskType:'cost-reduction',status:'working'};ccEnsureOpportunitySamples(sampleRows)");
 assert.equal(run('Object.keys(upTodos).length'),3);assert.equal(run('upTodos[sampleRows[0].taskId].title'),'用户已改标题');assert.equal(run('upTodos[sampleRows[0].taskId].status'),'done');assert.equal(run('upTodos[sampleRows[1].taskId].deletedAt'),'2026-10-10');assert.equal(run('Boolean(upTodos[sampleRows[2].taskId])'),false,'已有其他降本任务不再创建同SPU样例');

 console.log('通过：任务类型兼容、跨部门类型保留、普通采购排除及降本下发状态');
}

export async function verifyCostTaskFilters(list){
 assert.deepEqual(await list.locator('[data-cc-filter="status"] option').allTextContents(),['全部','待下发','待处理','处理中','已完成']);
 assert.equal(await list.locator('.cc-opportunity-filters.ui-business-filters .unified-input-group').count(),4);
 const styles=await list.locator('[data-cc-filter="status"]').evaluate(el=>({border:getComputedStyle(el).borderWidth,height:el.closest('label').getBoundingClientRect().height,label:el.previousElementSibling?.className}));
 assert.equal(styles.border,'0px');assert(styles.height>=34&&styles.height<=38);assert.equal(styles.label,'unified-field-name');
}

export async function verifyCostTaskLifecycle(page,list,row){
 const id=await row.getAttribute('data-cc-spu');
 for(const status of ['working','done','pending']){
  await row.locator('[data-cc-assign]').click();
  const dialog=page.locator('.up-todo-dialog');
  assert.equal(await dialog.locator('[data-todo-type]').innerText(),'降本优化');
  await dialog.locator('[data-todo-status-select]').selectOption(status);
  await dialog.locator('[data-todo-close]').first().click();
  await list.locator('[data-cc-filter="status"]').selectOption(status);
  assert.equal(await list.locator(`[data-cc-spu="${id}"]`).count(),1,'修改执行状态后清单筛选同步');
  assert.equal(await list.locator(`[data-cc-spu="${id}"] .up-todo-status`).innerText(),{pending:'待处理',working:'处理中',done:'已完成'}[status]);
 }
 await list.locator('[data-cc-reset]').click();
}

export async function verifyCostTaskSamples(page,list){
 const statuses={suggested:'待下发',pending:'待处理',working:'处理中',done:'已完成'};
 const pool=await page.evaluate(()=>window.costSavingAudit().map(row=>row.spuId));
 const tasks=await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('product-risk-todos-v1')||'{}')));
 const saved=tasks.filter(task=>task.source==='demo-cost-history');
 const allRows=[],pager=list.locator('.cc-opportunity-pages .list-pagination'),pages=Number(await pager.getAttribute('data-list-pages'));
 for(let number=1;number<=pages;number++){
  if(number>1)await pager.locator('[data-list-page="'+number+'"]:not(.list-page-arrow)').click();
  allRows.push(...await list.locator('[data-cc-spu]').evaluateAll(rows=>rows.map(row=>({id:row.dataset.ccSpu,status:row.dataset.ccTaskStatus}))));
 }
 if(pages>1)await pager.locator('[data-list-page="1"]:not(.list-page-arrow)').click();
 assert.deepEqual(allRows.map(row=>row.id).sort(),[...pool].sort());
 // 当前入池SPU可关联既有任务；样例不能覆盖用户及其他模块已经生成的任务。
 const eligible=['SPU-SOURCE-018','SPU-SOURCE-010','SPU-SOURCE-001'].filter(id=>pool.includes(id));
 assert(saved.every(task=>eligible.includes(task.spuId)));
 assert.equal(new Set(saved.map(task=>task.spuId)).size,saved.length);
 for(const id of eligible)assert(tasks.some(task=>task.spuId===id&&(task.taskType==='cost-reduction'||task.suggestionKey==='cost-reduction'||task.id.startsWith('cost-reduction|'))&&task.status!=='suggested'),'固定样例或既有降本任务关联：'+id);
 for(const [status,label] of Object.entries(statuses)){
  await list.locator('[data-cc-filter="status"]').selectOption(status);
  const expected=allRows.filter(row=>row.status===status),rows=list.locator('[data-cc-spu]');
  assert.equal(Number(await pager.getAttribute('data-list-total')),expected.length);
  assert.equal(await rows.count(),Math.min(expected.length,20));
  assert((await rows.locator('td:nth-child(6)').allTextContents()).every(text=>text===label));
  if(!expected.length){assert.match(await list.innerText(),/暂无符合条件的数据/);continue}
  const row=rows.first(),id=await row.getAttribute('data-cc-spu');
  assert.equal(await row.locator('[data-cc-assign]').innerText(),status==='suggested'?'下发任务':'跟进任务');
  if(status!=='suggested'){
   await row.locator('[data-cc-assign]').click();const dialog=page.locator('.up-todo-dialog');
   assert.equal(await dialog.locator('[data-todo-status-select]').inputValue(),status);assert.equal(await dialog.locator('[data-todo-type]').innerText(),'降本优化');
   if(saved.some(task=>task.spuId===id))assert.match(await dialog.innerText(),/唐琪/);
   if(status==='done')assert.notEqual(await dialog.locator('[data-todo-completed-date]').innerText(),'—');
   await dialog.locator('[data-todo-close]').first().click();
  }
 }
 await list.locator('[data-cc-reset]').click();
 console.log('通过：入池样例与既有任务去重、完整分页、四态筛选/空结果及详情同源');
}