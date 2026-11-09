import assert from 'node:assert/strict';

export async function verifyTaskDrawer(page){
 const root=page.locator('#ai'),dialog=()=>page.locator('.gd-task-entry-dialog');
 const count=()=>page.evaluate(()=>globalDiagnosisAudit().tasks.filter(row=>row.task.gdManualEntry).length),before=await count();
 for(const [width,height]of [[1920,1080],[1024,768],[390,844],[320,568]]){
  await page.setViewportSize({width,height});await root.locator('[data-gd-task-create]').click();const d=dialog();
  assert(await d.evaluate(node=>node.classList.contains('gd-task-entry-drawer')));
  const rect=await d.boundingBox();assert(Math.abs(rect.y)<1&&Math.abs(rect.x+rect.width-width)<1&&Math.abs(rect.height-height)<1,'抽屉贴右且全高 '+width);
  const type=d.locator('[name=objectType]');assert.equal(await type.inputValue(),'');assert.equal(await type.locator('option:checked').innerText(),'请选择');
  const title=await d.locator('[name=title]').boundingBox(),priority=d.locator('select[name=priority]'),priorityBox=await priority.boundingBox();
  assert(Math.abs(title.y-priorityBox.y)<1&&priorityBox.x>=title.x+title.width+10,'事项名称与优先级同排且有间距 '+width);
  assert(priorityBox.width<=140.5&&title.width>100,'优先级紧凑、名称保留可输入空间');
  assert.deepEqual(await priority.locator('option').allTextContents(),['P0','P1','P2','P3']);assert(await priority.evaluate(e=>!e.hidden&&!e.multiple),'普通原生单选下拉');
  assert.equal(await d.locator('.up-todo-priority-picker').count(),0);assert.equal(await priority.inputValue(),'P2');
  await priority.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');assert.equal(await priority.inputValue(),'P1');await priority.selectOption('P2');
  const verifyMarks=async expected=>{
   const labels=await d.locator('[data-gd-task-field]').evaluateAll(nodes=>nodes.map(node=>({required:!!node.querySelector(':required:not(:disabled)'),marked:!node.querySelector('.gd-task-required').hidden,color:getComputedStyle(node.querySelector('.gd-task-required')).color})));
   assert.equal(labels.filter(row=>row.marked).length,expected-3);assert.equal(await d.locator('.gd-task-execution-columns .gd-task-required').count(),3);assert(labels.every(row=>row.required===row.marked),'任务信息标记与实际必填一致');assert(labels.filter(row=>row.marked).every(row=>row.color==='rgb(217, 40, 72)'));
  };
  await verifyMarks(5);await type.selectOption('product');await verifyMarks(6);await type.selectOption('shop');await verifyMarks(6);await type.selectOption('');await verifyMarks(5);
  const position=()=>d.evaluate(node=>{const head=node.querySelector('header').getBoundingClientRect(),foot=node.querySelector('footer').getBoundingClientRect(),body=node.querySelector('.gd-task-entry-body').getBoundingClientRect();return {head:head.top,foot:foot.bottom,bodyTop:body.top,bodyBottom:body.bottom,headBottom:head.bottom,footTop:foot.top,overflow:node.scrollWidth-node.clientWidth}});
  const initial=await position();assert(initial.bodyTop>=initial.headBottom&&initial.bodyBottom<=initial.footTop&&initial.overflow<=1,'抽屉内容独立滚动、无横溢');
  await d.locator('.gd-task-entry-body').evaluate(node=>node.scrollTop=node.scrollHeight);const scrolled=await position();assert.equal(scrolled.head,initial.head);assert.equal(scrolled.foot,initial.foot);
  await d.locator('[data-gd-entry-save]').click();assert(await d.isVisible());assert.equal(await count(),before,'缺少必填不能保存');
  if([1920,390].includes(width)){await d.locator('.gd-task-entry-body').evaluate(node=>node.scrollTop=0);await d.screenshot({path:'outputs/task-entry-drawer-'+width+'.png'})}
  await page.keyboard.press('Escape');await d.waitFor({state:'detached'});assert.equal(await count(),before,'关闭不保存');
 }
 await page.setViewportSize({width:1920,height:1080});console.log('通过：新增任务右侧全高抽屉、请选择、必填红星/动态对象标记、固定头尾/内滚动、校验/取消及宽窄屏');
}
