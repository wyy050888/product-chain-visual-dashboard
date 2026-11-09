import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {clickDiagnosisStatus} from './diagnosis-filter-helpers.mjs';

export async function diagnosisStatusDropdown(page){
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit());
 const dropdown=()=>root.locator('[data-gd-status-dropdown]'),summary=()=>dropdown().locator('summary');
 for(const part of ['coordination']){
  await root.locator('[data-gd-part="'+part+'"]').click();
  assert.equal(await root.locator('.gd-filter-search [data-gd-status-dropdown]').count(),1);
  assert.equal(await root.locator('.gd-filter-groups [data-gd-status]').count(),0,'原筛选条不再展示状态');
  assert.equal(await root.locator('.gd-status-menu').isVisible(),false);
  assert.match(await summary().innerText(),/待处理、处理中/);
  assert.deepEqual(await dropdown().locator('[aria-pressed="true"]').evaluateAll(es=>es.map(e=>e.dataset.gdStatus)),['pending','working']);
  await summary().click();assert(await root.locator('.gd-status-menu').isVisible());
  const initial=await audit(),partRows=part==='coordination'?initial.work.filter(r=>r.kind==='core'):initial.tasks;
  assert.equal(await root.locator('[data-gd-status="all"] .gd-filter-count').count(),0,'全部选项不重复展示总数');
  for(const key of ['pending','working','done'])assert.equal(Number(await root.locator('[data-gd-status="'+key+'"] .gd-filter-count').innerText()),partRows.filter(r=>r.task.status===key).length);
  await clickDiagnosisStatus(root,'done');assert.match(await summary().innerText(),/全部/,'全选三种状态归为全部');assert(await dropdown().evaluate(e=>e.open));
  await clickDiagnosisStatus(root,'pending');assert((await audit()).visible.every(r=>r.task.status==='pending'));
  await clickDiagnosisStatus(root,'working');assert((await audit()).visible.every(r=>['pending','working'].includes(r.task.status)));
  await root.locator('[data-gd-status="pending"]').focus();await page.keyboard.press('Space');assert((await audit()).visible.every(r=>r.task.status==='working'));
  await clickDiagnosisStatus(root,'working');assert.match(await summary().innerText(),/全部/,'取消最后一个状态恢复全部');
  await page.keyboard.press('Escape');assert.equal(await dropdown().evaluate(e=>e.open),false);assert(await summary().evaluate(e=>e===document.activeElement));
  await summary().click();await root.locator('[data-gd-search]').click();assert.equal(await dropdown().evaluate(e=>e.open),false,'点击外部收起');
  await clickDiagnosisStatus(root,'done');const expected=partRows.filter(r=>r.task.status==='done');assert.equal((await audit()).visible.length,expected.length);
 }
 await root.locator('[data-gd-part="coordination"]').click();assert.match(await summary().innerText(),/已完成/,'模块各自记忆');
 await root.locator('[data-gd-tab="omission"]').click();assert.match(await summary().innerText(),/待处理、处理中/,'其他分类保持自己的默认值');
 for(const part of ['resource','execution']){await root.locator('[data-gd-part="'+part+'"]').click();assert.equal(await dropdown().count(),0,'资源及日周报不增加任务状态');}
 await root.locator('[data-gd-part="coordination"]').click();await root.locator('[data-gd-tab="core"]').click();await clickDiagnosisStatus(root,'all');
 for(const width of [1920,1280,390]){
  await page.setViewportSize({width,height:1000});
  assert(await root.locator('.gd-filter-search').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'状态与搜索不溢出 '+width);
  const state=await summary().boundingBox(),search=await root.locator('[data-gd-search]').boundingBox();
  assert(Math.abs(state.y-search.y)<3&&state.x+state.width<=search.x,'状态下拉位于搜索框左侧 '+width);
  assert(await summary().evaluate(e=>{
   const box=e.getBoundingClientRect(),center=box.y+box.height/2;
   return [...e.children].filter(child=>getComputedStyle(child).display!=='none').every(child=>{const r=child.getBoundingClientRect();return Math.abs(r.y+r.height/2-center)<1});
  }),'状态标题、回显文字与箭头垂直居中 '+width);
  assert.equal(await root.locator('.gd-status-value').evaluate(e=>getComputedStyle(e).textAlign),'center','状态回显文字水平居中');
  if(!await dropdown().evaluate(e=>e.open))await summary().click();
  const menu=await root.locator('.gd-status-menu').boundingBox();assert(menu.x>=0&&menu.x+menu.width<=width+1);
  for(const button of await dropdown().locator('[data-gd-status]').all())assert(await button.isVisible());
  assert(await dropdown().locator('[data-gd-status]').evaluateAll(buttons=>buttons.every(button=>{
   const r=button.getBoundingClientRect(),center=r.y+r.height/2;
   return [...button.children].every(child=>{const box=child.getBoundingClientRect();return Math.abs(box.y+box.height/2-center)<1});
  })),'状态选项勾选图标、文字和数量垂直居中 '+width);
  if(width===1920||width===390)await page.screenshot({path:fileURLToPath(new URL('../../outputs/diagnosis-status-dropdown-'+width+'.png',import.meta.url))});
  await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1920,height:1080});
 console.log('通过：重点工作状态下拉、默认多选/全部/并集/角标、分类记忆、键盘/外部关闭及桌面窄屏搜索旁布局');
}

export async function diagnosisTaskStatusTabs(page){
 const root=page.locator('#ai'),audit=()=>page.evaluate(()=>globalDiagnosisAudit());
 const store=()=>page.evaluate(()=>localStorage.getItem('product-risk-todos-v1'));
 await root.locator('[data-gd-part="closure"]').click();
 const initial=await audit(),stored=await store(),tabs=root.locator('.gd-task-status-tabs');
 assert.equal(await root.locator('[data-gd-status-dropdown]').count(),0,'任务清单不再展示状态下拉');
 assert.deepEqual(await tabs.locator('[role="tab"]').evaluateAll(es=>es.map(e=>e.firstChild.textContent)),['全部任务','待处理','处理中','已完成']);
 const keys=['all','pending','working','done'];
 assert.equal(await tabs.locator('[aria-selected="true"]').getAttribute('data-gd-status'),'all');
 for(const key of keys){
  await clickDiagnosisStatus(root,key);const current=await audit(),expected=initial.tasks.filter(r=>key==='all'||r.task.status===key);
  assert.deepEqual(current.visible.map(r=>r.id).sort(),expected.map(r=>r.id).sort());
  assert.equal(await tabs.locator('[aria-selected="true"]').count(),1);assert.equal(await tabs.locator('[aria-selected="true"]').getAttribute('data-gd-status'),key);
  for(const status of keys)assert.equal(Number(await tabs.locator('[data-gd-status="'+status+'"]>span').innerText()),initial.tasks.filter(r=>status==='all'||r.task.status===status).length,'角标不受当前状态限制');
  assert.equal(current.state.pages['closure|all'],1,'切状态回首页');
 }
 await root.locator('[data-gd-part="coordination"]').click();
 assert.equal(await root.locator('[data-gd-status-dropdown]').count(),1);assert.deepEqual((await audit()).state.filters['coordination/core'].status,['pending','working']);
 await root.locator('[data-gd-part="closure"]').click();assert.equal(await tabs.locator('[aria-selected="true"]').getAttribute('data-gd-status'),'done','切模块保留状态');
 await tabs.locator('[data-gd-status="done"]').focus();await page.keyboard.press('Home');assert.equal(await tabs.locator('[aria-selected="true"]').getAttribute('data-gd-status'),'all');
 await page.keyboard.press('ArrowRight');assert.equal(await tabs.locator('[aria-selected="true"]').getAttribute('data-gd-status'),'pending');
 await page.keyboard.press('End');assert.equal(await tabs.locator('[aria-selected="true"]').getAttribute('data-gd-status'),'done');
 await root.locator('[data-gd-search]').fill('不会匹配的任务状态测试');
 assert.equal((await audit()).visible.length,0);assert(await root.locator('.gd-empty').isVisible());
 for(const key of keys)assert.equal(await tabs.locator('[data-gd-status="'+key+'"]>span').innerText(),'0');
 await root.locator('[data-gd-search]').fill('');await clickDiagnosisStatus(root,'all');
 await root.locator('#gd-pager').getByRole('button',{name:'第2页',exact:true}).click();assert.equal((await audit()).state.pages['closure|all'],2);
 await clickDiagnosisStatus(root,'pending');assert.equal((await audit()).state.pages['closure|all'],1);
 for(const width of [1920,1280,390]){
  await page.setViewportSize({width,height:1000});
  assert(await root.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'模块不被页签撑开 '+width);
  await tabs.locator('[data-gd-status="done"]').scrollIntoViewIfNeeded();
  assert(await tabs.locator('[data-gd-status="done"]').isVisible());
  if(width===1920||width===390)await root.locator('.gd-panel').screenshot({path:fileURLToPath(new URL('../../outputs/diagnosis-task-status-tabs-'+width+'.png',import.meta.url))});
 }
 assert.equal(await store(),stored,'切换状态不修改任务');await page.setViewportSize({width:1920,height:1080});
 console.log('通过：任务清单四状态单选页签、默认全部、全量角标、模块记忆、键盘、搜索空态、分页复位及桌面窄屏');
}
