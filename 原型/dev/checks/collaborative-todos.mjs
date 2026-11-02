import {clearKeyProductFilters} from './key-products-default-filters.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {editTodoField,fillTodoRoleFeedback,setTodoRoleStatus} from './todo-inline-helpers.mjs';
export async function collaborativeTodos(page){
 await page.locator('a[href="#matrix"]').click();await clearKeyProductFilters(page);
 const drawer=page.locator('.kpm-management-drawer'),dialog=page.locator('.up-todo-dialog'),root=page.locator('#matrix');
 const store=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('product-risk-todos-v1')||'{}')),model=()=>page.evaluate(()=>window.dashboardKeyProductManagementSnapshot());
 const id='grade-cycle|lift-018',record=async()=> (await store())[id];
 const open=async(tab,key,spu)=>{const product=await page.evaluate(spu=>window.dashboardKeyProductsSnapshot().rows.find(p=>p.spuId===spu),spu),groups=(await model()).groups,pick=tab==='changes'?key:(groups.find(g=>g.key!==key&&g.ids.includes(spu))||groups.find(g=>g.ids.includes(spu)))?.key;assert(pick,'当前异动区存在该产品的真实入口');await root.locator('[data-kpm-management-scope=changes][data-kpm-management-pick='+pick+']').click();await drawer.waitFor();await drawer.locator('[data-kpm-list-search]').fill(product.spuCode)};
 const row=index=>dialog.locator('[data-responsibility-row="role-'+index+'"]');
 const status=async(index,value)=>setTodoRoleStatus(row(index),value);
 const choose=async(picker,name)=>{await picker.locator('[data-people-query]').fill(name);await picker.locator('[role=option]').filter({hasText:name}).first().click()};
 await open('changes','core','SPU-SOURCE-018');await drawer.locator('[data-kpm-ai-detail]').click();const panel=drawer.locator('.kpm-insight-expanded');
 assert.deepEqual(await panel.locator('dt').allTextContents(),['关键依据','待核实','AI建议']);assert.doesNotMatch(await panel.innerText(),/方案比较|制度要求|关联待办|GSV/);assert.match(await panel.innerText(),/采购周报/);
 await drawer.locator('[data-kpm-ai-task]').click();await dialog.waitFor();assert.equal(await dialog.locator('[data-todo-status-select]').count(),0,'协同任务不能一键完成');assert.equal(await dialog.locator('[data-responsibility-row]').count(),3);
 let t=await record();assert.deepEqual(t.responsibilities.map(r=>r.assignee),['唐琪','林悦','沈舟']);assert.equal(new Set(Object.values(await store()).filter(r=>r.spuId===t.spuId).map(t=>t.id)).size,1,'一条待办保存多个责任项');
 await fillTodoRoleFeedback(row(0),'已核对报价，待确认渠道成本生效日期');await status(0,'done');
 t=await record();assert.equal(t.responsibilities[0].status,'done');assert(t.responsibilities[0].completedAt);assert.equal(t.status,'working');assert.equal(t.completedAt,'');assert.equal(t.responsibilities[1].status,'pending');assert.match(await dialog.locator('[data-up-collab-status]').innerText(),/处理中/);
 await page.keyboard.press('Escape');assert.match(await drawer.locator('[data-kpm-ai-task]').locator('..').innerText(),/唐琪、林悦、沈舟/);await page.locator('#close').click();
 const count=Object.keys(await store()).length;await open('structure','core','SPU-SOURCE-018');await drawer.locator('[data-kpm-ai-task]').click();await dialog.waitFor();assert.equal(Object.keys(await store()).length,count);assert.match(await row(0).locator('[data-todo-field="status"]').innerText(),/已完成/);
 await fillTodoRoleFeedback(row(1),'已补齐利润复核记录');await status(1,'done');assert.equal((await record()).status,'working');await status(2,'done');t=await record();assert.equal(t.status,'done');assert(t.completedAt);assert(t.responsibilities.every(r=>r.status==='done'));assert.notEqual((await model()).strategies.find(r=>r.spuId==='SPU-SOURCE-018'&&r.category==='cost').stage,'green','执行完成不冒充经营改善');
 await status(2,'working');t=await record();assert.equal(t.status,'working');assert.equal(t.completedAt,'');assert.equal(t.responsibilities[2].completedAt,'');assert.equal(t.responsibilities[0].status,'done');
 await choose(await editTodoField(row(1),'assignee'),'陈嘉');t=await record();assert.equal(t.responsibilities[1].assignee,'陈嘉');assert.equal(t.responsibilities[1].status,'pending');assert.equal(t.responsibilities[1].feedback,'');assert.equal(t.responsibilities[0].status,'done');
 await dialog.locator('[data-responsibility-add]').click();const add=dialog.locator('[data-responsibility-form]');await choose(add,'王磊');await add.locator('[data-responsibility-action]').fill('核验改版参数与新增成本');await add.locator('[data-responsibility-submit]').click();assert.equal((await record()).responsibilities.length,4);assert.equal(Object.keys(await store()).length,count);assert.equal((await record()).status,'working');
 await dialog.screenshot({path:fileURLToPath(new URL('../../outputs/collaborative-todo-feedback.png',import.meta.url))});await page.keyboard.press('Escape');await page.locator('#close').click();
 // 用同一真实入口的任务构造待分配责任项，避免依赖已移除的大盘结构抽屉。
 await page.evaluate(id=>{const data=JSON.parse(localStorage.getItem('product-risk-todos-v1'));data[id].responsibilities.push({id:'unassigned-test',department:'产品中心',assignee:'',action:'确认待分配事项',status:'pending',feedback:'',completedAt:''});localStorage.setItem('product-risk-todos-v1',JSON.stringify(data))},id);await page.reload();await page.locator('a[href="#matrix"]').click();await clearKeyProductFilters(page);
 await open('changes','core','SPU-SOURCE-018');await drawer.locator('[data-kpm-ai-task]').click();await dialog.waitFor();const missing=dialog.locator('[data-responsibility-row]').filter({has:page.locator('[data-todo-field-edit="status"]:disabled')});assert(await missing.count()>0);
 const taskId=id;let other=(await store())[taskId];for(const member of other.responsibilities.filter(r=>r.assignee))await setTodoRoleStatus(dialog.locator('[data-responsibility-row="'+member.id+'"]'),'done');assert.notEqual((await store())[taskId].status,'done');
 await page.evaluate(id=>{const data=JSON.parse(localStorage.getItem('product-risk-todos-v1'));data[id].status='done';data[id].completedAt=new Date().toISOString();localStorage.setItem('product-risk-todos-v1',JSON.stringify(data))},taskId);await page.reload();other=(await store())[taskId];assert.equal(other.status,'working');assert.equal(other.completedAt,'');assert.equal((await record()).responsibilities[1].assignee,'陈嘉');assert.match((await record()).responsibilities[0].feedback,/已核对报价/);
 await page.locator('a[href="#matrix"]').click();await open('changes','core','SPU-SOURCE-018');await drawer.locator('[data-kpm-ai-detail]').click();assert.match(await drawer.locator('.kpm-insight-expanded').innerText(),/负责人反馈/);await drawer.screenshot({path:fileURLToPath(new URL('../../outputs/collaborative-todo-inline.png',import.meta.url))});await page.locator('#close').click();
 // 共用协同任务保留，产品详情不再挂载待办界面。
 await open('changes','core','SPU-SOURCE-018');await drawer.locator('[data-kpm-list-detail]').click();await page.locator('.up-detail').waitFor();
 assert.equal(await page.locator('.up-detail [data-drawer-tab="handling"],.up-detail [data-up-panel="handling"]').count(),0);
 await page.locator('.drawer-back').click();await page.locator('#close').click();
}
