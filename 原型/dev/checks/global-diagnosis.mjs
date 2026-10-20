import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root='#ai';
const audit=page=>page.evaluate(()=>window.globalDiagnosisAudit());
const action=(page,id,kind)=>page.locator(root+' [data-gd-id="'+id+'"][data-gd-action="'+kind+'"]');
const part=(page,key)=>page.locator('[data-gd-part="'+key+'"]').click();
const tab=(page,key)=>page.locator(root+' [data-gd-tab="'+key+'"]').click();
const close=page=>page.locator('#close').click();
const noSourceLinks=async page=>assert.equal(await page.locator('#dialogbody [data-gd-origin],#dialogbody [data-gd-product],#dialogbody [data-gd-project],#dialogbody .gd-detail-links').count(),0);
const future=page=>page.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+7);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')});
export async function globalDiagnosis(page){
 await page.emulateMedia({reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 assert.deepEqual(await page.locator('#aigrid h3').allTextContents(),['执行诊断','任务闭环','产品链紧急协同','资源建议']);
 let d=await audit(page);assert.equal(d.sources.length,9);assert(d.sources.every(s=>s.total>0));assert.equal(new Set(d.tasks.map(t=>t.id)).size,d.tasks.length);
 assert.equal(await page.locator('[data-gd-sources]').count(),0);
 assert(d.reports.every(r=>r.missing||r.incomplete||r.late));assert.equal(d.issueTypes['log-normal'],undefined);assert.equal(d.counts[0].stats[0][1],d.reports.length);
 // 类型只在筛选器中展示；各表选项固定枚举，筛选有实际结果。
 for(const [section,sub] of [['execution','reports'],['execution','focus'],['closure','all'],['coordination','all'],['resource','all']]){
  await part(page,section);await tab(page,sub);d=await audit(page);
  assert.deepEqual(await page.locator('[data-gd-table] th').allTextContents(),['事项','业务关联','责任人','日期','状态','操作']);
  const scope=section==='execution'?section+'/'+sub:section;
  const expected=Object.entries(d.issueTypes).filter(([,t])=>t.scope===scope).map(([key])=>key);
  if(section!=='execution'||sub==='reports'){assert.equal(await page.locator('[data-gd-issue-type]').count(),0);assert(d.visible.every(r=>!('issueType' in r)));assert.equal(d.state.filters[section==='execution'?section+'/'+sub:section].issueType,undefined)}
  else{assert.deepEqual(await page.locator('[data-gd-issue-type] option').evaluateAll(es=>es.slice(1).map(e=>e.value)),expected);assert(d.visible.every(r=>d.issueTypes[r.issueType]))}
  const blocks=section==='execution'?(sub==='reports'?['日志诊断','钉钉日志']:['工作重点对照','建议动作','原始依据']):section==='closure'?['任务概况','执行情况','原始依据']:section==='coordination'?['协同事项','建议方案','会议依据']:['资源分析','建议方案','原始依据'];
  await action(page,d.visible[0].id,'evidence').click();assert.equal(await page.locator('.gd-dialog').getAttribute('data-gd-evidence-module'),section);assert.deepEqual(await page.locator('.gd-block-title').allTextContents(),blocks);await noSourceLinks(page);await close(page);
  for(const type of section!=='execution'||sub==='reports'?[]:[...new Set(d.visible.map(r=>r.issueType))]){
   await page.locator('[data-gd-issue-type]').selectOption(type);const filtered=(await audit(page)).visible;
   assert(filtered.length>0);assert(filtered.every(r=>r.issueType===type));
  }
  await page.locator('[data-gd-reset]').click();
 }
 // 钉钉日/周/月日志均进入同一个只读依据，无维护表单。
 await part(page,'execution');await tab(page,'reports');
 for(const type of ['日报','周报','月报']){
  await page.locator('[data-gd-report-type]').selectOption(type);d=await audit(page);assert(d.visible.length>0);assert(d.visible.every(r=>r.type===type));
  await action(page,d.visible[0].id,'evidence').click();assert.equal(await page.locator('#dialogtitle').innerText(),'诊断依据');assert.match(await page.locator('#dialogbody').innerText(),/钉钉日志/);assert.match(await page.locator('#dialogbody').innerText(),/日志状态/);assert.match(await page.locator('#dialogbody').innerText(),new RegExp(d.visible[0].status));
  assert.equal(await page.locator('#dialogbody input,#dialogbody textarea,#dialogbody select,#dialogbody form').count(),0);assert.equal(await page.locator('#dialogactions [data-gd-action="task"]').count(),0);await close(page);
 }
 await page.locator('[data-gd-reset]').click();
 // 原有任务下发和状态编辑，不再创建核验或反馈流程。
 await tab(page,'focus');await page.locator('[data-gd-search]').fill('刘畅');await page.locator('[data-gd-status]').selectOption('suggested');await action(page,'focus-risk-product','task').click();let dialog=page.locator('.up-todo-dialog');
 await dialog.locator('[data-people-query]').fill('林悦');await page.getByRole('option',{name:'林悦 · 产品中心',exact:true}).click();await dialog.locator('[name="due"]').fill(await future(page));await dialog.locator('[data-todo-action="assign"]').click();await dialog.waitFor({state:'detached'});
 assert.equal(await page.locator('#overlay').evaluate(e=>e.hidden),true,'从表格下发不能重新打开已关闭的依据');
 d=await audit(page);const assigned=d.tasks.find(r=>r.task.gdIssue==='focus-risk-product');assert.equal(assigned.task.status,'pending');assert.equal(d.visible.length,0,'下发后不再命中待核实状态');await page.locator('[data-gd-status]').selectOption('pending');assert.equal((await audit(page)).visible.length,1);
 await action(page,'focus-risk-product','task').click();dialog=page.locator('.up-todo-dialog');assert.deepEqual(await dialog.locator('[data-todo-status-select] option').evaluateAll(es=>es.map(e=>e.value)),['pending','working','done']);
 await dialog.locator('[data-todo-status-select]').selectOption('done');d=await audit(page);assert.equal(d.tasks.find(r=>r.id===assigned.id).status,'已完成');assert(d.tasks.find(r=>r.id===assigned.id).task.completedAt);
 await dialog.locator('[data-todo-status-select]').selectOption('working');assert.equal((await audit(page)).tasks.find(r=>r.id===assigned.id).task.completedAt,'');await dialog.locator('[data-todo-close]').click();
 await page.locator('[data-gd-reset]').click();
 // 会议原文只读展示，依据内不保留业务模块、产品或项目跳转入口。
 await part(page,'coordination');await action(page,'coordinate-project','evidence').click();assert.match(await page.locator('#dialogbody').innerText(),/第8行/);assert.match(await page.locator('#dialogbody').innerText(),/.xlsx/);
 assert.equal(await page.locator('#dialogbody input,#dialogbody textarea,#dialogbody select,#dialogbody form').count(),0);
 await noSourceLinks(page);
 // 共用待办保存后刷新依据，关联资源的负责人/日期/状态同步。
 await page.locator('#dialogactions [data-gd-action="task"]').click();dialog=page.locator('.up-todo-dialog');
 await dialog.locator('[data-todo-field-edit="assignee"]').click();await dialog.locator('[data-people-query]').fill('王磊');await page.getByRole('option',{name:'王磊 · 研发中心',exact:true}).click();await dialog.locator('header h3').click();
 const due=await future(page);await dialog.locator('[data-todo-field-edit="due"]').click();await dialog.locator('[data-inline-value]').fill(due);await dialog.locator('header h3').click();await dialog.locator('[data-todo-status-select]').selectOption('done');await dialog.locator('[data-todo-close]').click();
 assert.equal(await page.locator('#dialogtitle').innerText(),'诊断依据');assert.match(await page.locator('.gd-detail-head').innerText(),/王磊/);await close(page);
 d=await audit(page);const coordination=d.coordination.find(r=>r.id==='coordinate-project'),resource=d.resource.find(r=>r.id==='resource-test');assert.equal(coordination.task.id,resource.task.id);assert.equal(resource.owner,'王磊');assert.equal(resource.department,'研发中心');assert.equal(resource.due,due);assert.equal(resource.status,'已完成');assert.equal(d.tasks.filter(r=>r.id===resource.task.id).length,1);
 await part(page,'resource');await action(page,'resource-test','evidence').click();assert.match(await page.locator('#dialogbody').innerText(),/建议方案/);assert.equal(await page.locator('#dialogbody input,#dialogbody textarea,#dialogbody select,#dialogbody form').count(),0);await close(page);
 // 工作聚焦保留原始依据，关闭后返回原列表。
 await part(page,'execution');await tab(page,'focus');
 for(const id of ['focus-direction-project','focus-risk-product']){await action(page,id,'evidence').click();assert.match(await page.locator('#dialogbody').innerText(),/抓取材料显示在做什么/);await noSourceLinks(page);await close(page);assert.equal(await page.locator('#overlay').evaluate(e=>e.hidden),true);}
 assert.equal(await page.locator('[data-gd-action="feedback"],[data-gd-action="resolve"],#gd-feedback-form,#gd-resolution-form,[data-gd-source-tab]').count(),0);
 await page.reload();d=await audit(page);assert.equal(d.resource.find(r=>r.id==='resource-test').status,'已完成');assert.equal(d.tasks.find(r=>r.id===assigned.id).task.status,'working');assert.equal(await page.evaluate(()=>localStorage.getItem('global-diagnosis-v2')),null);
 // 自然周期切换后分页与窄屏保持正常。
 await page.locator('[data-gd-mode="month"]').click();await page.locator('[data-gd-value]').selectOption('10');assert.equal((await audit(page)).range.start,'2026-10-01');
 await part(page,'closure');assert.equal(await page.locator('#gd-pager .list-pagination').getAttribute('data-list-size'),'8');if((await audit(page)).visible.length>8){await page.locator('#gd-pager [aria-label="下一页"]').click();assert.equal(await page.locator('#gd-pager .list-pagination').getAttribute('data-list-current'),'2')}
 await part(page,'execution');await tab(page,'reports');
 for(const width of [1920,1440,1024,390]){await page.setViewportSize({width,height:1080});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'page overflow '+width);assert.equal(await page.locator('#aigrid .gd-card').count(),4);assert.equal(await page.locator('[data-gd-issue-type]').count(),0);assert(await page.locator('[data-gd-status]').isVisible());await page.locator('#ai').screenshot({path:fileURLToPath(new URL('../../outputs/global-diagnosis-final-'+width+'.png',import.meta.url)),style:'.head,.navigation-toolbar{visibility:hidden!important}'});}
 await page.setViewportSize({width:1920,height:1080});
 // 历史备注只兼容读取，刷新不重复追加，也不恢复旧办理状态。
 const history={resolutions:{'coordinate-project':{note:'历史交付窗口已核对',owner:'沈舟',due:'2026-10-12',status:'confirmed'}}};
 await page.evaluate(history=>localStorage.setItem('global-diagnosis-v2',JSON.stringify(history)),history);await page.reload();d=await audit(page);const migrated=d.coordination.find(r=>r.id==='coordinate-project');assert(migrated.task.plan.includes('历史交付窗口已核对'));assert.equal(migrated.status,'已完成');const plan=migrated.task.plan;
 await page.reload();assert.equal((await audit(page)).coordination.find(r=>r.id==='coordinate-project').task.plan,plan);assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('global-diagnosis-v2'))),history);assert.deepEqual(errors,[]);
}
