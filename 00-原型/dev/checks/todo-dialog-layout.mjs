import {resetDiagnosisFilters} from './diagnosis-filter-helpers.mjs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {editTodoField,fillTodoRoleFeedback,setTodoRoleStatus,todoExecutionGroup,todoOwnerPicker} from './todo-inline-helpers.mjs';
import {verifyTodoMultiplePeople} from './todo-multiple-people.mjs';
import {verifyTodoPriorityPicker} from './todo-priority-picker.mjs';

export async function verifyTodoDialogLayout(page){
 const root=page.locator('#ai'),dialog=page.locator('.up-todo-dialog[open]'),audit=()=>page.evaluate(()=>globalDiagnosisAudit());
 await root.locator('[data-gd-part="coordination"]').click();await resetDiagnosisFilters(root);
 await root.locator('[data-gd-action="task-detail"]').first().click();
 assert.equal(await dialog.locator('form>header [data-todo-evidence]').count(),0,'查看依据不在右上角');
 assert(await dialog.locator('.up-todo-evidence-section').evaluate(e=>e===e.parentElement.lastElementChild),'依据位于内容最下方');
 assert.deepEqual(await dialog.locator('.up-todo-common dt').allTextContents(),['状态','优先级','计划完成日期','实际完成日期','下发人','下发时间']);
 const dispatchField=label=>dialog.locator('.up-todo-common>div').filter({has:page.locator('dt',{hasText:label})}).locator('dd');
 assert.equal(await dispatchField('下发人').innerText(),'AI自动下发');
 assert.match(await dispatchField('下发时间').innerText(),/^\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/,'下发时间沿用全站日期简写并包含时分秒');
 const row=(await audit()).visible[0];assert.equal((await dialog.locator('[data-todo-business-object]').allTextContents()).join('\n'),row.businessObjects.map(object=>object.name).join('\n'));assert.equal(await dialog.locator('.up-todo-title-section h5,[data-todo-type],[name="taskType"],[data-todo-field-edit="title"]').count(),0,'只显示业务对象值，不显示标题字段名或任务类型');
 assert.equal(await dialog.locator('.up-todo-basic-section [data-up-collab-owners],.up-todo-basic-section [data-todo-field-edit="assignee"]').count(),0,'基础信息不重复展示或编辑负责人');
 assert.equal(await dialog.locator('.up-collaboration header [data-responsibility-add]').innerText(),'新增执行事项');
 assert.equal(await dialog.locator('[data-todo-execution]').count(),0,'详情不重复显示执行事项摘要');
 await verifyTodoPriorityPicker(page,dialog,row.task.id);
 await verifyTodoInlineFields(page,dialog,row.task.id);
 await verifyTodoMultiplePeople(page,dialog,row);
 const sidebar=dialog.locator('.up-todo-basic-section'),body=dialog.locator('.up-todo-dialog-body');
 await page.setViewportSize({width:1920,height:600});
 await dialog.locator('[data-todo-evidence]').click();assert(await dialog.locator('[data-todo-evidence-panel]').isVisible());
 const before=await sidebar.boundingBox();await body.evaluate(e=>{e.scrollTop=e.scrollHeight});assert(await body.evaluate(e=>e.scrollTop>0),'长正文可独立滚动');const after=await sidebar.boundingBox();assert.equal(after.y,before.y,'滚动正文时右侧信息栏位置固定');assert.equal(after.height,before.height);await dialog.locator('[data-todo-evidence]').click();assert(await dialog.locator('[data-todo-evidence-panel]').isHidden());await body.evaluate(e=>{e.scrollTop=0});
 for(const width of [1920,1024,390]){
  await page.setViewportSize({width,height:1000});
  const box=await dialog.boundingBox();assert(Math.abs(box.x+box.width-width)<=1&&box.y===0&&box.height===1000,'待办抽屉靠右且占满高度 '+width);assert(Math.abs(box.width-(width<=700?width:Math.min(1440,width*.94)))<=1,'抽屉宽度随屏幕自适应 '+width);
  assert(await dialog.locator('.up-todo-common').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'基础信息无需横向滚动 '+width);
  const info=await sidebar.boundingBox(),content=await body.boundingBox();if(width>1100){assert(info.x>=content.x+content.width-1,'基础信息在右侧');assert(Math.abs(info.y-content.y)<=1);assert(Math.abs(info.height-content.height)<=1)}else assert(info.y+info.height<=content.y+1,'窄屏基础信息和正文上下排布');
  await dialog.screenshot({path:fileURLToPath(new URL('../../outputs/todo-layout-'+width+'.png',import.meta.url))});
 }
 await dialog.locator('[data-todo-close]').click();await page.setViewportSize({width:1920,height:1080});
 const opener=root.locator('[data-gd-action="task-detail"]').first();await opener.click();await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert(await opener.evaluate(e=>e===document.activeElement),'关闭抽屉恢复入口焦点');
 await opener.click();await page.mouse.click(10,540);await dialog.waitFor({state:'detached'});

 // 单人历史任务直接显示原负责人，不再出现只有“添加负责人”的空区。
 const source=(await audit()).work[0].task,id='layout-legacy-todo';
 await page.evaluate(({source,id})=>{const store=JSON.parse(localStorage.getItem('product-risk-todos-v1'));store[id]={...source,id,title:id,gdIssue:'',gdAutomatic:false,responsibilities:undefined,assignee:'刘畅',department:'品质中心',status:'working',evidence:'',completedAt:'',assignedAt:'2026-10-06',logs:[]};localStorage.setItem('product-risk-todos-v1',JSON.stringify(store))},{source,id});
 await page.reload();await root.locator('[data-gd-part="closure"]').click();await root.locator('[data-gd-search]').fill(id);await root.locator('[data-gd-action="task-detail"]').click();
 assert.equal(await dispatchField('下发时间').innerText(),'26/10/06（时间未记录）','旧记录不补造具体下发时刻');
 const member=dialog.locator('[data-responsibility-row="original"]');assert.equal(await dialog.locator('[data-responsibility-row]').count(),1);assert.match(await todoOwnerPicker(member).innerText(),/刘畅-品质中心/);assert.equal(await dialog.locator('[data-responsibility-add]').count(),1);
 await fillTodoRoleFeedback(member,'原负责人已核对记录');await setTodoRoleStatus(member,'done');
 let saved=await page.evaluate(id=>JSON.parse(localStorage.getItem('product-risk-todos-v1'))[id],id);assert.equal(saved.status,'done');assert.equal(saved.responsibilities.length,1);assert.equal(saved.responsibilities[0].assignee,'刘畅');assert.equal(saved.responsibilities[0].feedback,'原负责人已核对记录');assert.match(await dialog.locator('[data-up-collab-status]').innerText(),/已完成/);
 await dialog.screenshot({path:fileURLToPath(new URL('../../outputs/todo-layout-single-owner.png',import.meta.url))});
 await dialog.locator('[data-todo-close]').click();
 await page.evaluate(id=>{const store=JSON.parse(localStorage.getItem('product-risk-todos-v1'));delete store[id];localStorage.setItem('product-risk-todos-v1',JSON.stringify(store))},id);await page.reload();
 console.log('通过：右侧抽屉、固定信息栏/正文独立滚动、窄屏上下排布、关闭/焦点、单人旧任务反馈/完成');
}

async function verifyTodoInlineFields(page,dialog,taskId){
 const saved=()=>page.evaluate(id=>JSON.parse(localStorage.getItem('product-risk-todos-v1'))[id],taskId),original=await saved(),role=original.responsibilities[0];
 const member=dialog.locator('[data-responsibility-row="'+role.id+'"]'),summary=todoExecutionGroup(member).locator('[data-todo-responsibility="'+role.id+'"][data-todo-field="action"]');
 assert.equal(await todoOwnerPicker(member).locator('[data-people-query]').count(),1,'负责人直接提供多选框');assert.equal(await member.locator('select,textarea').count(),0,'状态和反馈点击后编辑');
 let editor=await editTodoField(member,'action');await editor.locator('textarea').fill('取消的改动');await editor.locator('textarea').evaluate(e=>e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,isComposing:true,bubbles:true})));assert(await editor.locator('textarea').isVisible(),'中文组词时回车不提前提交');await page.keyboard.press('Escape');
 assert(await dialog.isVisible());assert.equal((await saved()).responsibilities[0].action,role.action,'Esc仅取消当前字段');
 editor=await editTodoField(member,'action');await editor.locator('textarea').fill('');await dialog.locator('header h3').click();
 assert(await editor.locator('[role=alert]').innerText());assert.equal((await saved()).responsibilities[0].action,role.action,'空执行事项不覆盖原值');await page.keyboard.press('Escape');
 await summary.locator('[data-todo-field-edit]').click();await summary.locator('textarea').fill('核对本周样品清单并补充交付日期');await summary.locator('textarea').press('Control+Enter');
 assert.equal((await saved()).responsibilities[0].action,'核对本周样品清单并补充交付日期');assert.match(await summary.innerText(),/本周样品清单/,'组内内容更新');assert.equal(await todoExecutionGroup(member).locator('[data-todo-field="action"]').count(),1,'执行事项只有一份内容');
 editor=await editTodoField(member,'action');await editor.locator('textarea').fill(role.action);await member.locator('[data-todo-field-edit="status"]').click();
 assert(await member.locator('[data-todo-field="status"] select').isVisible(),'保存前一字段并一次点击进入下一字段');await page.keyboard.press('Escape');
 const owner=todoOwnerPicker(member);await owner.locator('[data-people-query]').fill('不存在的负责人');await dialog.locator('header h3').click();
 assert.equal((await saved()).responsibilities[0].assignee,role.assignee,'未匹配人员不保存');await owner.locator('[data-people-query]').fill('');
 assert.equal(await member.locator('[data-todo-field-edit="department"]').count(),0,'部门由人员带出，不再单独选择');assert.match(await owner.innerText(),new RegExp(role.assignee+'-'+role.department));
 editor=await editTodoField(member,'feedback');await editor.locator('textarea').fill('通过点击字段填写的反馈');await dialog.locator('[data-todo-field-edit="priority"]').click();
 assert(await dialog.locator('[data-todo-field="priority"] [data-todo-priority-trigger]').isVisible(),'失焦保存后无需再次点击');assert.equal((await saved()).responsibilities[0].feedback,'通过点击字段填写的反馈');await page.keyboard.press('Escape');
 await fillTodoRoleFeedback(member,role.feedback||'');
 const final=await saved();assert.equal(final.responsibilities[0].action,role.action);assert.deepEqual(final.responsibilities.slice(1),original.responsibilities.slice(1),'单字段修改不影响其他负责人');
 assert.equal(final.assignedAt,original.assignedAt);assert.equal(final.assignedBy,original.assignedBy);assert.equal(final.completedAt,original.completedAt);
 console.log('通过：点击值进入编辑、文本/人员/枚举、失焦与快捷键保存、Esc取消、非法值拦截、正文同步及多人隔离');
}
